import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock ioredis — capture event handlers so we can simulate connect/error
const eventHandlers: Record<string, (...args: any[]) => void> = {};
const mockRedisInstance = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    scan: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        eventHandlers[event] = handler;
    }),
    connect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('RedisService', () => {
    let service: RedisService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'REDIS_URL') return 'redis://localhost:6379';
                            return undefined;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<RedisService>(RedisService);

        // Simulate Redis connecting successfully so tests use the Redis path
        if (eventHandlers['connect']) {
            eventHandlers['connect']();
        }
    });

    it('should create Redis client with URL from config', () => {
        const Redis = require('ioredis');
        expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', expect.objectContaining({
            maxRetriesPerRequest: 3,
        }));
    });

    it('should call ioredis set with EX when TTL provided', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');

        await service.set('test-key', 'test-value', 60);

        expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 60);
    });

    it('should call ioredis set without EX when no TTL', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');

        await service.set('test-key', 'test-value');

        expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should return value from get', async () => {
        mockRedisInstance.get.mockResolvedValue('stored-value');

        const result = await service.get('test-key');

        expect(result).toBe('stored-value');
        expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should call ioredis del', async () => {
        mockRedisInstance.del.mockResolvedValue(1);

        await service.del('test-key');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('should call ioredis incr', async () => {
        mockRedisInstance.incr.mockResolvedValue(5);

        const result = await service.incr('counter-key');

        expect(result).toBe(5);
        expect(mockRedisInstance.incr).toHaveBeenCalledWith('counter-key');
    });

    it('should return true from ping on success', async () => {
        mockRedisInstance.ping.mockResolvedValue('PONG');

        const result = await service.ping();

        expect(result).toBe(true);
    });

    it('should return null from get on Redis failure', async () => {
        mockRedisInstance.get.mockRejectedValue(new Error('Connection refused'));

        const result = await service.get('test-key');

        expect(result).toBeNull();
    });

    describe('keys() — SCAN-based implementation', () => {
        it('should use SCAN instead of KEYS command for pattern matching', async () => {
            // Single iteration: cursor returns '0' indicating scan is complete
            mockRedisInstance.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]);

            const result = await service.keys('otp:*');

            // Must use scan, not keys
            expect(mockRedisInstance.scan).toHaveBeenCalledWith(
                '0', 'MATCH', 'otp:*', 'COUNT', 100
            );
            expect(mockRedisInstance.keys).not.toHaveBeenCalled();
            expect(result).toEqual(['key1', 'key2']);
        });

        it('should iterate SCAN until cursor returns 0', async () => {
            // First SCAN returns cursor '42' (more results)
            mockRedisInstance.scan.mockResolvedValueOnce(['42', ['key1', 'key2']]);
            // Second SCAN returns cursor '0' (done)
            mockRedisInstance.scan.mockResolvedValueOnce(['0', ['key3']]);

            const result = await service.keys('session:*');

            expect(mockRedisInstance.scan).toHaveBeenCalledTimes(2);
            expect(mockRedisInstance.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'session:*', 'COUNT', 100);
            expect(mockRedisInstance.scan).toHaveBeenNthCalledWith(2, '42', 'MATCH', 'session:*', 'COUNT', 100);
            expect(result).toEqual(['key1', 'key2', 'key3']);
        });

        it('should return empty array on SCAN error', async () => {
            mockRedisInstance.scan.mockRejectedValue(new Error('Connection refused'));

            const result = await service.keys('error:*');

            expect(result).toEqual([]);
        });

        it('should return empty array when no keys match pattern', async () => {
            mockRedisInstance.scan.mockResolvedValueOnce(['0', []]);

            const result = await service.keys('nonexistent:*');

            expect(result).toEqual([]);
        });
    });

    describe('in-memory fallback (when Redis is disconnected)', () => {
        beforeEach(() => {
            // Simulate Redis going down
            if (eventHandlers['error']) {
                eventHandlers['error'](new Error('Connection refused'));
            }
        });

        it('should fall back to in-memory store for set/get', async () => {
            const setResult = await service.set('mem-key', 'mem-value');
            expect(setResult).toBe(true);

            const getResult = await service.get('mem-key');
            expect(getResult).toBe('mem-value');
        });

        it('should support TTL in memory fallback', async () => {
            // Set with very short TTL (we'll test expiry concept, not actual timing)
            await service.set('ttl-key', 'ttl-value', 1);
            const result = await service.get('ttl-key');
            expect(result).toBe('ttl-value');
        });

        it('should support incr in memory fallback', async () => {
            const first = await service.incr('counter');
            expect(first).toBe(1);
            const second = await service.incr('counter');
            expect(second).toBe(2);
        });

        it('should support del in memory fallback', async () => {
            await service.set('del-key', 'value');
            await service.del('del-key');
            const result = await service.get('del-key');
            expect(result).toBeNull();
        });

        it('should return true from ping when using fallback', async () => {
            const result = await service.ping();
            expect(result).toBe(true);
        });

        it('should support keys pattern matching in memory fallback', async () => {
            await service.set('prefix:a', '1');
            await service.set('prefix:b', '2');
            await service.set('other:c', '3');

            const result = await service.keys('prefix:*');
            expect(result).toEqual(expect.arrayContaining(['prefix:a', 'prefix:b']));
            expect(result).not.toContain('other:c');
        });
    });
});
