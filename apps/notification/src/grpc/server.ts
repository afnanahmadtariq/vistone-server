import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let notificationProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!notificationProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    notificationProto = protoDescriptor.vistone;
  }
  return notificationProto;
}

// Service implementations
async function getNotifications(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { userId, unreadOnly } = call.request;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    callback(null, {
      notifications: (notifications as any[]).map((n: any) => ({
        id: n.id,
        userId: n.userId,
        content: n.content,
        isRead: n.isRead,
        type: n.type || '',
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function sendNotification(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { userId, content, type } = call.request;

    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        type: type || null,
      },
    });

    callback(null, {
      success: true,
      message: 'Notification sent successfully',
      entityId: notification.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function markAsRead(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { notificationId } = call.request;

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    callback(null, {
      success: true,
      message: 'Notification marked as read',
      entityId: notificationId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50058): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.NotificationService.service, {
    GetNotifications: getNotifications,
    SendNotification: sendNotification,
    MarkAsRead: markAsRead,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Notification gRPC server:', error);
        return;
      }
      console.log(`Notification Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
