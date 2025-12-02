import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let workforceProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!workforceProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    workforceProto = protoDescriptor.vistone;
  }
  return workforceProto;
}

// Service implementations
async function getTeams(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId } = call.request;

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: { members: true },
    });

    callback(null, {
      teams: (teams as any[]).map((team: any) => ({
        id: team.id,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description || '',
        managerId: team.managerId || '',
        members: (team.members as any[]).map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role || '',
        })),
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function getTeam(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: call.request.teamId },
      include: { members: true },
    });

    if (!team) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Team not found',
      });
      return;
    }

    callback(null, {
      id: team.id,
      organizationId: team.organizationId,
      name: team.name,
      description: team.description || '',
      managerId: team.managerId || '',
      members: (team.members as any[]).map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role || '',
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createTeam(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, name, description, managerId } = call.request;

    const team = await prisma.team.create({
      data: {
        organizationId,
        name,
        description: description || null,
        managerId: managerId || null,
      },
    });

    callback(null, {
      success: true,
      message: 'Team created successfully',
      entityId: team.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateTeam(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { teamId, name, description, managerId } = call.request;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (managerId !== undefined) updateData.managerId = managerId || null;

    await prisma.team.update({
      where: { id: teamId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'Team updated successfully',
      entityId: teamId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function addTeamMember(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { teamId, userId, role } = call.request;

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: role || null,
      },
    });

    callback(null, {
      success: true,
      message: 'Team member added successfully',
      entityId: member.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function getUserSkills(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const skills = await prisma.userSkill.findMany({
      where: { userId: call.request.userId },
    });

    callback(null, {
      skills: (skills as any[]).map((s: any) => ({
        id: s.id,
        skillName: s.skillName,
        proficiency: s.proficiency || 0,
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

export function startGrpcServer(port: number = 50052): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.WorkforceService.service, {
    GetTeams: getTeams,
    GetTeam: getTeam,
    CreateTeam: createTeam,
    UpdateTeam: updateTeam,
    AddTeamMember: addTeamMember,
    GetUserSkills: getUserSkills,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Workforce gRPC server:', error);
        return;
      }
      console.log(`Workforce Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
