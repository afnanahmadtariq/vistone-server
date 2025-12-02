import 'dotenv/config';
import Fastify from 'fastify';
import { app } from './app/app';
import { startGrpcServer } from './app/grpc/server';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3009;
const grpcPort = process.env.AI_ENGINE_GRPC_PORT ? Number(process.env.AI_ENGINE_GRPC_PORT) : 50060;

// Instantiate Fastify with some config
const server = Fastify({
  logger: true,
});

// Register your application as a normal plugin.
server.register(app);

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] AI Engine HTTP server: http://${host}:${port}`);
    
    // Start gRPC server
    startGrpcServer(grpcPort);
    console.log(`[ ready ] AI Engine gRPC server: ${host}:${grpcPort}`);
  }
});
