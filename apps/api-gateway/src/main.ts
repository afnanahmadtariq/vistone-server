import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';

dotenv.config();

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

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
    allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight'],
  };

  // Enable CORS for all routes
  app.use(cors(corsOptions));
  
  // Handle preflight requests explicitly
  app.options('*', cors(corsOptions));

  app.use(express.json());

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  // Apollo GraphQL context
  const apolloContext = async ({ req }: { req: express.Request }) => ({
    headers: req.headers,
    token: req.headers.authorization?.replace('Bearer ', ''),
  });

  // Mount GraphQL at both / and /graphql for flexibility
  app.use('/', expressMiddleware(apolloServer, { context: apolloContext }));
  app.use('/graphql', expressMiddleware(apolloServer, { context: apolloContext }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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
