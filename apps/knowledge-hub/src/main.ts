import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { bearerAuthMiddleware, defaultInternalAuthSkip } from '@vistone-server/shared-internal-auth';
import wikiPageRoutes from './modules/wiki-pages/wiki-pages.routes';
import wikiPageVersionRoutes from './modules/wiki-page-versions/wiki-page-versions.routes';
import documentFolderRoutes from './modules/document-folders/document-folders.routes';
import documentRoutes from './modules/documents/documents.routes';
import documentPermissionRoutes from './modules/document-permissions/document-permissions.routes';
import wikisRoutes from './modules/wikis/wikis.routes';
import wikiProjectLinksRoutes from './modules/wiki-project-links/wiki-project-links.routes';
import wikiMembersRoutes from './modules/wiki-members/wiki-members.routes';
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3005;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.use(
  bearerAuthMiddleware({
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    skip: defaultInternalAuthSkip,
  })
);

app.get('/', (req, res) => {
  res.send({ message: 'Knowledge Hub Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowledge-hub', timestamp: new Date().toISOString() });
});

// Documentation & Knowledge routes
app.use('/wikis', wikisRoutes);
app.use('/wiki-project-links', wikiProjectLinksRoutes);
app.use('/wiki-members', wikiMembersRoutes);
app.use('/wiki-pages', wikiPageRoutes);
app.use('/wiki-page-versions', wikiPageVersionRoutes);
app.use('/document-folders', documentFolderRoutes);
app.use('/documents', documentRoutes);
app.use('/document-permissions', documentPermissionRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Knowledge Hub Service running at http://${host}:${port}`);
});
