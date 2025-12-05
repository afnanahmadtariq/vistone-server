/**
 * gRPC Configuration for AI Engine
 * Defines connection settings for all microservices
 */

export interface GrpcServiceConfig {
  host: string;
  port: number;
  serviceName: string;
  protoPath: string;
  packageName: string;
  servicePath: string;
}

export const grpcConfig = {
  // Project Management Service
  projectManagement: {
    host: process.env.PROJECT_GRPC_HOST || 'localhost',
    port: parseInt(process.env.PROJECT_GRPC_PORT || '50051'),
    serviceName: 'ProjectManagementService',
    protoPath: 'project-management.proto',
    packageName: 'vistone.projectmanagement',
    servicePath: 'vistone.projectmanagement.ProjectManagementService',
  } as GrpcServiceConfig,

  // Client Management Service
  clientManagement: {
    host: process.env.CLIENT_GRPC_HOST || 'localhost',
    port: parseInt(process.env.CLIENT_GRPC_PORT || '50052'),
    serviceName: 'ClientManagementService',
    protoPath: 'client-management.proto',
    packageName: 'vistone.clientmanagement',
    servicePath: 'vistone.clientmanagement.ClientManagementService',
  } as GrpcServiceConfig,

  // Workforce Management Service
  workforceManagement: {
    host: process.env.WORKFORCE_GRPC_HOST || 'localhost',
    port: parseInt(process.env.WORKFORCE_GRPC_PORT || '50053'),
    serviceName: 'WorkforceManagementService',
    protoPath: 'workforce-management.proto',
    packageName: 'vistone.workforcemanagement',
    servicePath: 'vistone.workforcemanagement.WorkforceManagementService',
  } as GrpcServiceConfig,

  // Communication Service
  communication: {
    host: process.env.COMMUNICATION_GRPC_HOST || 'localhost',
    port: parseInt(process.env.COMMUNICATION_GRPC_PORT || '50054'),
    serviceName: 'CommunicationService',
    protoPath: 'communication.proto',
    packageName: 'vistone.communication',
    servicePath: 'vistone.communication.CommunicationService',
  } as GrpcServiceConfig,

  // Notification Service
  notification: {
    host: process.env.NOTIFICATION_GRPC_HOST || 'localhost',
    port: parseInt(process.env.NOTIFICATION_GRPC_PORT || '50055'),
    serviceName: 'NotificationService',
    protoPath: 'notification.proto',
    packageName: 'vistone.notification',
    servicePath: 'vistone.notification.NotificationService',
  } as GrpcServiceConfig,

  // Common settings
  options: {
    // Connection timeout in milliseconds
    timeout: parseInt(process.env.GRPC_TIMEOUT || '30000'),
    // Keep alive settings
    keepAlive: {
      keepAliveTimeMs: 10000,
      keepAliveTimeoutMs: 5000,
      keepAlivePermitWithoutCalls: true,
    },
    // Retry settings
    retry: {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    },
  },

  // Feature flags
  features: {
    // Whether to use gRPC or fall back to HTTP
    useGrpc: process.env.USE_GRPC === 'true',
    // Enable gRPC reflection for debugging
    enableReflection: process.env.GRPC_REFLECTION === 'true',
    // Enable gRPC health checks
    enableHealthCheck: process.env.GRPC_HEALTH_CHECK === 'true',
  },
};

export type GrpcConfig = typeof grpcConfig;
