import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../../redis/redis.service';

// Spec: Phase 10 — Production Readiness (Redis cache-aside service)

describe('CacheService', () => {
    let service: CacheService;
    let redis: jest.Mocked<RedisService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                {
                    provide: RedisService,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                        del: jest.fn(),
                        keys: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CacheService>(CacheService);
        redis = module.get(RedisService);
    });

    it('should return cached value on hit', async () => {
        redis.get.mockResolvedValue(JSON.stringify({ name: 'cached' }));

        const factory = jest.fn();
        const result = await service.getOrSet('test-key', 60, factory);

        expect(result).toEqual({ name: 'cached' });
        expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result on miss', async () => {
        redis.get.mockResolvedValue(null);
        redis.set.mockResolvedValue(undefined);

        const factory = jest.fn().mockResolvedValue({ name: 'fresh' });
        const result = await service.getOrSet('test-key', 60, factory);

        expect(result).toEqual({ name: 'fresh' });
        expect(factory).toHaveBeenCalled();
        expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify({ name: 'fresh' }), 60);
    });

    it('should set correct TTL when caching', async () => {
        redis.get.mockResolvedValue(null);
        redis.set.mockResolvedValue(undefined);

        const factory = jest.fn().mockResolvedValue('data');
        await service.getOrSet('key', 300, factory);

        expect(redis.set).toHaveBeenCalledWith('key', JSON.stringify('data'), 300);
    });

    it('should remove key on invalidate', async () => {
        redis.del.mockResolvedValue(undefined);

        await service.invalidate('test-key');

        expect(redis.del).toHaveBeenCalledWith('test-key');
    });

    it('should remove matching keys on invalidatePattern', async () => {
        redis.keys.mockResolvedValue(['cache:a', 'cache:b', 'cache:c']);
        redis.del.mockResolvedValue(undefined);

        await service.invalidatePattern('cache:*');

        expect(redis.keys).toHaveBeenCalledWith('cache:*');
        expect(redis.del).toHaveBeenCalledTimes(3);
    });

    it('should handle JSON serialization correctly', async () => {
        const complexData = { items: [1, 2, 3], nested: { flag: true } };
        redis.get.mockResolvedValue(JSON.stringify(complexData));

        const result = await service.getOrSet('key', 60, jest.fn());

        expect(result).toEqual(complexData);
    });

    it('should fall through to factory when Redis fails', async () => {
        redis.get.mockRejectedValue(new Error('Connection refused'));

        const factory = jest.fn().mockResolvedValue({ name: 'fallback' });
        const result = await service.getOrSet('key', 60, factory);

        expect(result).toEqual({ name: 'fallback' });
        expect(factory).toHaveBeenCalled();
    });
});
