import express from 'express';
import wikiPageRoutes from './routes/wiki-pages';
import wikiPageVersionRoutes from './routes/wiki-page-versions';
import documentFolderRoutes from './routes/document-folders';
import documentRoutes from './routes/documents';
import documentPermissionRoutes from './routes/document-permissions';
import documentLinkRoutes from './routes/document-links';
import { startGrpcServer } from './grpc/server';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3005;
const grpcPort = process.env.KNOWLEDGE_GRPC_PORT ? Number(process.env.KNOWLEDGE_GRPC_PORT) : 50055;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Knowledge Hub Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowledge-hub', timestamp: new Date().toISOString() });
});

// Documentation & Knowledge routes
app.use('/wiki-pages', wikiPageRoutes);
app.use('/wiki-page-versions', wikiPageVersionRoutes);
app.use('/document-folders', documentFolderRoutes);
app.use('/documents', documentRoutes);
app.use('/document-permissions', documentPermissionRoutes);
app.use('/document-links', documentLinkRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Knowledge Hub Service running at http://${host}:${port}`);
});

// Start gRPC server
startGrpcServer(grpcPort);
