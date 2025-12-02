import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import prisma from '../lib/prisma';

// Lazy load proto
let projectProto: any = null;

function getProtoPath() {
  return path.join(__dirname, '..', '..', '..', '..', 'libs', 'grpc-shared', 'src', 'vistone.proto');
}

function loadProto() {
  if (!projectProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    projectProto = protoDescriptor.vistone;
  }
  return projectProto;
}

// Service implementations
async function getProjects(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, limit = 100, offset = 0 } = call.request;

    const where = organizationId ? { organizationId } : {};

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ]);

    callback(null, {
      projects: (projects as any[]).map((p: any) => ({
        id: p.id,
        organizationId: p.organizationId,
        name: p.name,
        description: p.description || '',
        status: p.status,
        startDate: p.startDate?.toISOString() || '',
        endDate: p.endDate?.toISOString() || '',
        budget: p.budget?.toString() || '',
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

async function getProject(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: call.request.projectId },
    });

    if (!project) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Project not found',
      });
      return;
    }

    callback(null, {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      description: project.description || '',
      status: project.status,
      startDate: project.startDate?.toISOString() || '',
      endDate: project.endDate?.toISOString() || '',
      budget: project.budget?.toString() || '',
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createProject(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { organizationId, name, description, status, startDate, endDate, budget } = call.request;

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        description: description || null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
      },
    });

    callback(null, {
      success: true,
      message: 'Project created successfully',
      entityId: project.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateProject(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { projectId, name, description, status, startDate, endDate, budget } = call.request;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (status) updateData.status = status;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (budget) updateData.budget = parseFloat(budget);

    await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'Project updated successfully',
      entityId: projectId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function getTasks(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { projectId, limit = 100, offset = 0 } = call.request;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { projectId },
        take: limit,
        skip: offset,
      }),
      prisma.task.count({ where: { projectId } }),
    ]);

    callback(null, {
      tasks: (tasks as any[]).map((t: any) => ({
        id: t.id,
        projectId: t.projectId,
        parentId: t.parentId || '',
        assigneeId: t.assigneeId || '',
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority || '',
        dueDate: t.dueDate?.toISOString() || '',
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

async function getTask(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: call.request.taskId },
    });

    if (!task) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Task not found',
      });
      return;
    }

    callback(null, {
      id: task.id,
      projectId: task.projectId,
      parentId: task.parentId || '',
      assigneeId: task.assigneeId || '',
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority || '',
      dueDate: task.dueDate?.toISOString() || '',
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createTask(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { projectId, parentId, assigneeId, title, description, status, priority, dueDate } = call.request;

    const task = await prisma.task.create({
      data: {
        projectId,
        parentId: parentId || null,
        assigneeId: assigneeId || null,
        title,
        description: description || null,
        status,
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    callback(null, {
      success: true,
      message: 'Task created successfully',
      entityId: task.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function updateTask(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { taskId, assigneeId, title, description, status, priority, dueDate } = call.request;

    const updateData: any = {};
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (status) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority || null;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    callback(null, {
      success: true,
      message: 'Task updated successfully',
      entityId: taskId,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

async function getMilestones(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: call.request.projectId },
    });

    callback(null, {
      milestones: (milestones as any[]).map((m: any) => ({
        id: m.id,
        projectId: m.projectId,
        title: m.title,
        description: m.description || '',
        dueDate: m.dueDate?.toISOString() || '',
        status: m.status,
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function createMilestone(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  try {
    const { projectId, title, description, dueDate, status } = call.request;

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
      },
    });

    callback(null, {
      success: true,
      message: 'Milestone created successfully',
      entityId: milestone.id,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      entityId: '',
    });
  }
}

export function startGrpcServer(port: number = 50053): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.ProjectService.service, {
    GetProjects: getProjects,
    GetProject: getProject,
    CreateProject: createProject,
    UpdateProject: updateProject,
    GetTasks: getTasks,
    GetTask: getTask,
    CreateTask: createTask,
    UpdateTask: updateTask,
    GetMilestones: getMilestones,
    CreateMilestone: createMilestone,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start Project gRPC server:', error);
        return;
      }
      console.log(`Project Service gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
