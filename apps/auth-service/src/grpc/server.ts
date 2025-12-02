import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let authProto: any = null;

function getProtoPath() {
  // Proto file location - adjust based on your build setup
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!authProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    authProto = protoDescriptor.vistone;
  }
  return authProto;
}

// Service implementations
async function getUser(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: call.request.userId },
    });

    if (!user) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    callback(null, {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getUsers(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, limit = 100, offset = 0 } = call.request;

    const where = organizationId
      ? {
          organizationMemberships: {
            some: { organizationId },
          },
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    callback(null, {
      users: users.map((user: any) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        createdAt: user.createdAt.toISOString(),
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

async function getOrganization(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: call.request.organizationId },
    });

    if (!org) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Organization not found',
      });
      return;
    }

    callback(null, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      settings: org.settings ? JSON.stringify(org.settings) : '',
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createUser(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { email, firstName, lastName, organizationId } = call.request;

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        ...(organizationId && {
          organizationMemberships: {
            create: { organizationId },
          },
        }),
      },
    });

    callback(null, {
      success: true,
      message: 'User created successfully',
      entityId: user.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateUser(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { userId, firstName, lastName, email } = call.request;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'User updated successfully',
      entityId: userId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50051): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.AuthService.service, {
    GetUser: getUser,
    GetUsers: getUsers,
    GetOrganization: getOrganization,
    CreateUser: createUser,
    UpdateUser: updateUser,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Auth gRPC server:', error);
        return;
      }
      console.log(`Auth Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
