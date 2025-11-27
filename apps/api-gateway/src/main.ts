import express from 'express';
import { ApolloServer } from 'apollo-server-express';
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
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    },
    context: ({ req }) => {
      return {
        headers: req.headers,
      };
    },
  });

  await apolloServer.start();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apolloServer.applyMiddleware({ app: app as any, path: '/graphql' });

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
      `[ ready ] GraphQL endpoint: http://${host}:${port}${apolloServer.graphqlPath}`
    );
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
