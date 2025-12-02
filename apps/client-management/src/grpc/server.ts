import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let clientProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!clientProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    clientProto = protoDescriptor.vistone;
  }
  return clientProto;
}

// Service implementations
async function getClients(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { limit = 100, offset = 0 } = call.request;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        take: limit,
        skip: offset,
      }),
      prisma.client.count(),
    ]);

    callback(null, {
      clients: (clients as any[]).map((c: any) => ({
        id: c.id,
        name: c.name,
        contactInfo: c.contactInfo ? JSON.stringify(c.contactInfo) : '',
        portalAccess: c.portalAccess,
      })),
      total,
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getClient(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: call.request.clientId },
    });

    if (!client) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Client not found',
      });
      return;
    }

    callback(null, {
      id: client.id,
      name: client.name,
      contactInfo: client.contactInfo ? JSON.stringify(client.contactInfo) : '',
      portalAccess: client.portalAccess,
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createClient(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { name, contactInfo, portalAccess } = call.request;

    const client = await prisma.client.create({
      data: {
        name,
        contactInfo: contactInfo ? JSON.parse(contactInfo) : null,
        portalAccess: portalAccess || false,
      },
    });

    callback(null, {
      success: true,
      message: 'Client created successfully',
      entityId: client.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateClient(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { clientId, name, contactInfo, portalAccess } = call.request;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo ? JSON.parse(contactInfo) : null;
    if (portalAccess !== undefined) updateData.portalAccess = portalAccess;

    await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'Client updated successfully',
      entityId: clientId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function getProposals(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const proposals = await prisma.proposal.findMany({
      where: { clientId: call.request.clientId },
    });

    callback(null, {
      proposals: (proposals as any[]).map((p: any) => ({
        id: p.id,
        clientId: p.clientId,
        title: p.title,
        content: p.content || '',
        status: p.status,
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createProposal(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { clientId, title, content, status } = call.request;

    const proposal = await prisma.proposal.create({
      data: {
        clientId,
        title,
        content: content || null,
        status,
      },
    });

    callback(null, {
      success: true,
      message: 'Proposal created successfully',
      entityId: proposal.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50054): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.ClientService.service, {
    GetClients: getClients,
    GetClient: getClient,
    CreateClient: createClient,
    UpdateClient: updateClient,
    GetProposals: getProposals,
    CreateProposal: createProposal,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Client gRPC server:', error);
        return;
      }
      console.log(`Client Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
