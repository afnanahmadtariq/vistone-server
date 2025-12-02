import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let knowledgeProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!knowledgeProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    knowledgeProto = protoDescriptor.vistone;
  }
  return knowledgeProto;
}

// Service implementations
async function getWikiPages(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { limit = 100, offset = 0 } = call.request;

    const pages = await prisma.wikiPage.findMany({
      take: limit,
      skip: offset,
    });

    callback(null, {
      pages: (pages as any[]).map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content || '',
        parentId: p.parentId || '',
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getWikiPage(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const page = await prisma.wikiPage.findUnique({
      where: { id: call.request.pageId },
    });

    if (!page) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Wiki page not found',
      });
      return;
    }

    callback(null, {
      id: page.id,
      title: page.title,
      content: page.content || '',
      parentId: page.parentId || '',
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createWikiPage(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { title, content, parentId } = call.request;

    const page = await prisma.wikiPage.create({
      data: {
        title,
        content: content || null,
        parentId: parentId || null,
      },
    });

    callback(null, {
      success: true,
      message: 'Wiki page created successfully',
      entityId: page.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateWikiPage(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { pageId, title, content } = call.request;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content !== undefined) updateData.content = content || null;

    await prisma.wikiPage.update({
      where: { id: pageId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'Wiki page updated successfully',
      entityId: pageId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function getDocuments(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, folderId } = call.request;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (folderId) where.folderId = folderId;

    const documents = await prisma.document.findMany({ where });

    callback(null, {
      documents: (documents as any[]).map((d: any) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        version: d.version,
        metadata: d.metadata ? JSON.stringify(d.metadata) : '',
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createDocument(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, folderId, name, url, metadata } = call.request;

    const document = await prisma.document.create({
      data: {
        organizationId,
        folderId: folderId || null,
        name,
        url,
        metadata: metadata ? JSON.parse(metadata) : null,
      },
    });

    callback(null, {
      success: true,
      message: 'Document created successfully',
      entityId: document.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50055): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.KnowledgeService.service, {
    GetWikiPages: getWikiPages,
    GetWikiPage: getWikiPage,
    CreateWikiPage: createWikiPage,
    UpdateWikiPage: updateWikiPage,
    GetDocuments: getDocuments,
    CreateDocument: createDocument,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Knowledge gRPC server:', error);
        return;
      }
      console.log(`Knowledge Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
