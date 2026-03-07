import express from 'express';
import cors from 'cors';
import wikiPageRoutes from './modules/wiki-pages/wiki-pages.routes';
import wikiPageVersionRoutes from './modules/wiki-page-versions/wiki-page-versions.routes';
import documentFolderRoutes from './modules/document-folders/document-folders.routes';
import documentRoutes from './modules/documents/documents.routes';
import documentPermissionRoutes from './modules/document-permissions/document-permissions.routes';
import wikisRoutes from './modules/wikis/wikis.routes';
import wikiProjectLinksRoutes from './modules/wiki-project-links/wiki-project-links.routes';
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3005;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Knowledge Hub Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowledge-hub', timestamp: new Date().toISOString() });
});

// Documentation & Knowledge routes
app.use('/wikis', wikisRoutes);
app.use('/wiki-project-links', wikiProjectLinksRoutes);
app.use('/wiki-pages', wikiPageRoutes);
app.use('/wiki-page-versions', wikiPageVersionRoutes);
app.use('/document-folders', documentFolderRoutes);
app.use('/documents', documentRoutes);
app.use('/document-permissions', documentPermissionRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Knowledge Hub Service running at http://${host}:${port}`);
});
