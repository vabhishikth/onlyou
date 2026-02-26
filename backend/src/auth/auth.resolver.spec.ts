import { RATE_LIMIT_KEY, RateLimitOptions } from '../common/decorators/rate-limit.decorator';
import { AuthResolver } from './auth.resolver';

// Spec: master spec Section 14 (Security) — rate limiting on auth endpoints
describe('AuthResolver', () => {
  describe('rate limiting decorators', () => {
    it('should have @RateLimit(5, 60) on requestOtp', () => {
      const metadata: RateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_KEY,
        AuthResolver.prototype.requestOtp,
      );
      expect(metadata).toBeDefined();
      expect(metadata.limit).toBe(5);
      expect(metadata.windowSeconds).toBe(60);
    });

    it('should have @RateLimit(10, 60) on verifyOtp', () => {
      const metadata: RateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_KEY,
        AuthResolver.prototype.verifyOtp,
      );
      expect(metadata).toBeDefined();
      expect(metadata.limit).toBe(10);
      expect(metadata.windowSeconds).toBe(60);
    });

    it('should have @RateLimit(10, 60) on refreshToken', () => {
      // Spec: Section 14 (Security) — refresh token endpoint must be rate limited
      const metadata: RateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_KEY,
        AuthResolver.prototype.refreshToken,
      );
      expect(metadata).toBeDefined();
      expect(metadata.limit).toBe(10);
      expect(metadata.windowSeconds).toBe(60);
    });
  });
});
