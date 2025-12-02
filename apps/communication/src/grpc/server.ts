import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let communicationProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!communicationProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    communicationProto = protoDescriptor.vistone;
  }
  return communicationProto;
}

// Service implementations
async function getChannels(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { teamId, projectId } = call.request;

    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (projectId) where.projectId = projectId;

    const channels = await prisma.chatChannel.findMany({ where });

    callback(null, {
      channels: (channels as any[]).map((c: any) => ({
        id: c.id,
        name: c.name || '',
        type: c.type,
        teamId: c.teamId || '',
        projectId: c.projectId || '',
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getMessages(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { channelId, limit = 100, offset = 0 } = call.request;

    const messages = await prisma.chatMessage.findMany({
      where: { channelId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    callback(null, {
      messages: (messages as any[]).map((m: any) => ({
        id: m.id,
        channelId: m.channelId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function sendMessage(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { channelId, senderId, content } = call.request;

    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        senderId,
        content,
      },
    });

    callback(null, {
      success: true,
      message: 'Message sent successfully',
      entityId: message.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function createChannel(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { name, type, teamId, projectId } = call.request;

    const channel = await prisma.chatChannel.create({
      data: {
        name: name || null,
        type,
        teamId: teamId || null,
        projectId: projectId || null,
      },
    });

    callback(null, {
      success: true,
      message: 'Channel created successfully',
      entityId: channel.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50056): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.CommunicationService.service, {
    GetChannels: getChannels,
    GetMessages: getMessages,
    SendMessage: sendMessage,
    CreateChannel: createChannel,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Communication gRPC server:', error);
        return;
      }
      console.log(`Communication Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
