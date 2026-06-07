export {
  bearerAuthMiddleware,
  defaultInternalAuthSkip,
  GATEWAY_FORWARDED_IDENTITY_HEADERS,
  parseTrustedGatewayIdentity,
  type BearerAuthMiddlewareOptions,
  type InternalAuthUser,
  type RequestWithInternalUser,
} from './lib/internal-service-auth.js';
export { normalizeOrgEntityNameKey } from './lib/org-entity-name.js';
