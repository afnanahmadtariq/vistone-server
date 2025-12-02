import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let monitoringProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!monitoringProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    monitoringProto = protoDescriptor.vistone;
  }
  return monitoringProto;
}

// Service implementations
async function getKPIs(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const kpis = await prisma.kpiDefinition.findMany({
      include: {
        measurements: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
    });

    callback(null, {
      kpis: (kpis as any[]).map((k: any) => ({
        id: k.id,
        name: k.name,
        formula: k.formula || '',
        latestValue: k.measurements[0]?.value || 0,
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getDashboards(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const dashboards = await prisma.dashboard.findMany({
      where: { userId: call.request.userId },
    });

    callback(null, {
      dashboards: (dashboards as any[]).map((d: any) => ({
        id: d.id,
        userId: d.userId,
        name: d.name,
        layout: d.layout ? JSON.stringify(d.layout) : '',
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createDashboard(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { userId, name, layout } = call.request;

    const dashboard = await prisma.dashboard.create({
      data: {
        userId,
        name,
        layout: layout ? JSON.parse(layout) : null,
      },
    });

    callback(null, {
      success: true,
      message: 'Dashboard created successfully',
      entityId: dashboard.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function logConversation(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { userId, context, tokensUsed } = call.request;

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: userId || null,
        context: context ? JSON.parse(context) : null,
        tokensUsed,
      },
    });

    callback(null, {
      success: true,
      message: 'Conversation logged successfully',
      entityId: conversation.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50057): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.MonitoringService.service, {
    GetKPIs: getKPIs,
    GetDashboards: getDashboards,
    CreateDashboard: createDashboard,
    LogConversation: logConversation,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Monitoring gRPC server:', error);
        return;
      }
      console.log(`Monitoring Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
