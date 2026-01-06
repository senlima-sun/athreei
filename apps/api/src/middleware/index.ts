/**
 * Middleware exports
 */

export {
  authMiddleware,
  getAuthContext,
  type AuthContext,
  type AuthVariables,
} from "./auth"
export {
  errorHandler,
  notFoundHandler,
  ApiError,
  type ErrorResponse,
} from "./error"
export {
  createRateLimiter,
  checkRateLimit,
  getRateLimitInfo,
  resetRateLimit,
  clearAllRateLimits,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitVariables,
} from "./rate-limit"
export {
  createConnectRateLimiter,
  createCallbackRateLimiter,
  createTokenRateLimiter,
  createConnectionsRateLimiter,
  withRateLimitLogging,
  OAUTH_RATE_LIMITS,
} from "./oauth-rate-limit"
