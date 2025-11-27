import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';

dotenv.config();

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

async function startServer() {
  const app = express();

  app.use(express.json());

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }: { req: express.Request }) => ({
      headers: req.headers,
    }),
  }));

  app.get('/', (_req, res) => {
    res.send({
      message: 'API Gateway is running',
      graphql: `http://${host}:${port}/graphql`,
    });
  });

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
