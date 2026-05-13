import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { formatGraphQLError } from './lib/errors';
import { createGraphQLLoaders } from './lib/graphqlLoaders';
import { getCurrentUser } from './lib/auth';
import { gatewayAuthStore } from './lib/requestAuthContext';
import uploadRouter from './routes/upload';

dotenv.config();

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

function parseBearerToken(authorization: unknown): string | undefined {
  if (typeof authorization !== 'string') return undefined;
  const m = authorization.trim().match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : undefined;
}

// Parse CORS origins from environment variable (comma-separated)
function getCorsOrigins(): string | string[] | boolean {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin || corsOrigin === '*') {
    return true; // Allow all origins
  }

  // Support comma-separated origins
  if (corsOrigin.includes(',')) {
    return corsOrigin.split(',').map(origin => origin.trim());
  }

  return corsOrigin;
}

async function startServer() {
  const app = express();

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight', 'x-organization-id', 'X-Organization-Id'],
  };

  // Enable CORS for all routes
  app.use(cors(corsOptions));

  // Handle preflight requests explicitly
  app.options('*', cors(corsOptions));

  // Forward caller JWT + org header to downstream microservices (AsyncLocalStorage + axios interceptor in backendClient)
  app.use((req, _res, next) => {
    const raw = req.headers.authorization;
    const bearerToken =
      typeof raw === 'string' && /^Bearer\s+/i.test(raw.trim())
        ? raw.replace(/^Bearer\s+/i, '').trim()
        : undefined;
    const orgRaw = req.headers['x-organization-id'];
    const organizationId =
      typeof orgRaw === 'string' ? orgRaw.trim() : Array.isArray(orgRaw) ? String(orgRaw[0] ?? '').trim() : undefined;
    gatewayAuthStore.run(
      { bearerToken, organizationId: organizationId || undefined },
      () => next()
    );
  });

  // Compress JSON / GraphQL responses (major win vs raw microservice aggregation payloads)
  app.use(compression({ threshold: 512 }));

  app.use(express.json({ limit: '12mb' }));

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: formatGraphQLError,
  });

  await apolloServer.start();

  // Apollo GraphQL context — resolve user once so downstream microservices can skip auth-service when env flags allow.
  const apolloContext = async ({ req }: { req: express.Request }) => {
    const token = parseBearerToken(req.headers.authorization);
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const user = await getCurrentUser({ headers, token });
    const store = gatewayAuthStore.getStore();
    if (store) {
      if (user && process.env.FORWARD_GATEWAY_IDENTITY_TO_SERVICES === 'true') {
        store.forwardedIdentity = {
          userId: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          organizationId: user.organizationId ?? null,
        };
      } else {
        store.forwardedIdentity = undefined;
      }
    }
    return {
      headers,
      token,
      loaders: createGraphQLLoaders(),
      user: user ?? undefined,
    };
  };

  // Health check endpoint (must be before GraphQL middleware)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // File upload route
  app.use('/upload', uploadRouter);

  // Mount GraphQL at /graphql
  app.use('/graphql', expressMiddleware(apolloServer, { context: apolloContext }));

  // Also mount at root for clients that use / as GraphQL endpoint
  app.use('/', expressMiddleware(apolloServer, { context: apolloContext }));

  app.listen(port, host, () => {
    console.log(`[ ready ] API Gateway running at http://${host}:${port}`);
    console.log(
      `[ ready ] GraphQL endpoint: http://${host}:${port}/graphql`
    );
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
