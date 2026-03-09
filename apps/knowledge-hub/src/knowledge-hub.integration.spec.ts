/**
 * Knowledge Hub Service – Integration Tests
 */
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    wiki: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    wikiPage: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    wikiPageVersion: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    wikiProjectLink: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    documentFolder: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    document: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    documentPermission: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const wiki = { id: 'wiki-1', organizationId: 'org-1', name: 'Company Wiki', createdAt: new Date().toISOString() };
const wikiPage = { id: 'wp-1', wikiId: 'wiki-1', title: 'Getting Started', content: '...', authorId: 'user-1', createdAt: new Date().toISOString() };
const document = { id: 'doc-1', folderId: 'folder-1', name: 'Architecture', content: '...', createdAt: new Date().toISOString() };
const folder = { id: 'folder-1', name: 'Design', organizationId: 'org-1', createdAt: new Date().toISOString() };

beforeEach(() => jest.clearAllMocks());

// ── Wikis ──────────────────────────────────────────────────────
describe('GET /wikis', () => {
  it('returns 200 with wikis', async () => {
    (prisma.wiki.findMany as jest.Mock).mockResolvedValue([wiki]);
    const res = await request(app).get('/wikis').query({ organizationId: 'org-1' });
    expect(res.status).toBe(200);
  });
});

describe('POST /wikis', () => {
  it('creates a wiki', async () => {
    (prisma.wiki.create as jest.Mock).mockResolvedValue(wiki);
    const res = await request(app).post('/wikis').send({ organizationId: 'org-1', name: 'Company Wiki' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /wikis/:id', () => {
  it('returns 200 when wiki exists', async () => {
    (prisma.wiki.findUnique as jest.Mock).mockResolvedValue(wiki);
    const res = await request(app).get('/wikis/wiki-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.wiki.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/wikis/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /wikis/:id', () => {
  it('updates a wiki', async () => {
    (prisma.wiki.update as jest.Mock).mockResolvedValue({ ...wiki, name: 'Updated Wiki' });
    const res = await request(app).put('/wikis/wiki-1').send({ name: 'Updated Wiki' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /wikis/:id', () => {
  it('deletes a wiki', async () => {
    (prisma.wiki.delete as jest.Mock).mockResolvedValue(wiki);
    const res = await request(app).delete('/wikis/wiki-1');
    expect(res.status).toBe(200);
  });
});

// ── Wiki Pages ─────────────────────────────────────────────────
describe('GET /wiki-pages', () => {
  it('returns 200', async () => {
    (prisma.wikiPage.findMany as jest.Mock).mockResolvedValue([wikiPage]);
    const res = await request(app).get('/wiki-pages');
    expect(res.status).toBe(200);
  });
});

describe('POST /wiki-pages', () => {
  it('creates a wiki page', async () => {
    (prisma.wikiPage.create as jest.Mock).mockResolvedValue(wikiPage);
    const res = await request(app).post('/wiki-pages').send({ wikiId: 'wiki-1', title: 'Getting Started', authorId: 'user-1' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /wiki-pages/:id', () => {
  it('returns 200 when page exists', async () => {
    (prisma.wikiPage.findUnique as jest.Mock).mockResolvedValue(wikiPage);
    const res = await request(app).get('/wiki-pages/wp-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.wikiPage.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/wiki-pages/missing');
    expect(res.status).toBe(404);
  });
});

// ── Wiki Page Versions ────────────────────────────────────────
describe('GET /wiki-page-versions', () => {
  it('returns 200', async () => {
    (prisma.wikiPageVersion.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/wiki-page-versions');
    expect(res.status).toBe(200);
  });
});

// ── Documents ──────────────────────────────────────────────────
describe('GET /documents', () => {
  it('returns 200', async () => {
    (prisma.document.findMany as jest.Mock).mockResolvedValue([document]);
    const res = await request(app).get('/documents');
    expect(res.status).toBe(200);
  });
});

describe('POST /documents', () => {
  it('creates a document', async () => {
    (prisma.document.create as jest.Mock).mockResolvedValue(document);
    const res = await request(app).post('/documents').send({ organizationId: 'org-1', wikiId: 'wiki-1', folderId: 'folder-1', name: 'Architecture', url: 'https://example.com/architecture.pdf' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /documents/:id', () => {
  it('returns 200 when document exists', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue(document);
    const res = await request(app).get('/documents/doc-1');
    expect(res.status).toBe(200);
  });
});

// ── Document Folders ──────────────────────────────────────────
describe('GET /document-folders', () => {
  it('returns 200', async () => {
    (prisma.documentFolder.findMany as jest.Mock).mockResolvedValue([folder]);
    const res = await request(app).get('/document-folders');
    expect(res.status).toBe(200);
  });
});

describe('POST /document-folders', () => {
  it('creates a folder', async () => {
    (prisma.documentFolder.create as jest.Mock).mockResolvedValue(folder);
    const res = await request(app).post('/document-folders').send({ name: 'Design', wikiId: 'wiki-1' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Document Permissions ──────────────────────────────────────
describe('GET /document-permissions', () => {
  it('returns 200', async () => {
    (prisma.documentPermission.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/document-permissions');
    expect(res.status).toBe(200);
  });
});
