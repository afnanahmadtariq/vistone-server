import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDataSyncService } from '../services/data-sync';
import { getRAGInstance } from '../services/rag-chain';
import { querySimilarDocuments } from '../services/embedding';
import { VectorMetadata } from '../services/pinecone';

// Define the proto path - resolve from dist root
const getProtoPath = () => {
  const distRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
  return path.join(distRoot, 'app', 'grpc', 'protos', 'ai-engine.proto');
};

// Lazy load proto
let aiEngineProto: any = null;

function loadProto() {
  if (!aiEngineProto) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    aiEngineProto = protoDescriptor.vistone.ai;
  }
  return aiEngineProto;
}

// Service implementation
const syncService = getDataSyncService();

async function syncEntity(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  const request = call.request;
  
  try {
    const additionalInfo: Record<string, any> = {};
    if (request.additionalInfo) {
      for (const [key, value] of Object.entries(request.additionalInfo)) {
        additionalInfo[key] = value;
      }
    }

    const chunkIds = await syncService.syncEntity({
      id: request.id,
      type: request.type as VectorMetadata['type'],
      source: request.source,
      organizationId: request.organizationId || undefined,
      content: request.content,
      additionalInfo,
    });

    callback(null, {
      success: true,
      message: 'Entity synced successfully',
      chunkIds,
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      chunkIds: [],
    });
  }
}

async function syncBatch(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  const request = call.request;
  
  try {
    const entities = request.entities.map((entity: any) => {
      const additionalInfo: Record<string, any> = {};
      if (entity.additionalInfo) {
        for (const [key, value] of Object.entries(entity.additionalInfo)) {
          additionalInfo[key] = value;
        }
      }
      return {
        id: entity.id,
        type: entity.type as VectorMetadata['type'],
        source: entity.source,
        organizationId: entity.organizationId || undefined,
        content: entity.content,
        additionalInfo,
      };
    });

    await syncService.syncEntities(entities);

    callback(null, {
      success: true,
      message: `${entities.length} entities synced successfully`,
      chunkIds: [],
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      chunkIds: [],
    });
  }
}

async function removeEntity(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  const request = call.request;
  
  try {
    await syncService.removeEntity(request.entityId);

    callback(null, {
      success: true,
      message: 'Entity removed successfully',
      chunkIds: [],
    });
  } catch (error: any) {
    callback(null, {
      success: false,
      message: error.message,
      chunkIds: [],
    });
  }
}

async function chat(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  const request = call.request;
  
  try {
    const sessionId = request.sessionId || uuidv4();
    const rag = getRAGInstance(sessionId);
    
    const response = await rag.chat(
      request.message,
      request.userId || undefined,
      request.organizationId || undefined,
      request.executeActions !== false
    );

    callback(null, {
      sessionId,
      answer: response.answer,
      action: response.action ? {
        type: response.action.type,
        executed: response.action.executed,
        result: JSON.stringify(response.action.result || {}),
        error: response.action.error || '',
      } : undefined,
      documentsUsed: response.context.documentsUsed,
      tokensUsed: response.tokensUsed || 0,
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function search(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
) {
  const request = call.request;
  
  try {
    const filter: Record<string, any> = {};
    if (request.organizationId) filter.organizationId = request.organizationId;
    if (request.type) filter.type = request.type;

    const results = await querySimilarDocuments(
      request.query,
      request.topK || 5,
      Object.keys(filter).length > 0 ? filter : undefined
    );

    callback(null, {
      results: results.map((r) => ({
        content: r.content,
        score: r.score,
        source: r.metadata.source,
        type: r.metadata.type,
        entityId: r.metadata.entityId,
      })),
    });
  } catch (error: any) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

export function startGrpcServer(port: number = 50060): grpc.Server {
  const proto = loadProto();
  const server = new grpc.Server();

  server.addService(proto.AIEngineService.service, {
    SyncEntity: syncEntity,
    SyncBatch: syncBatch,
    RemoveEntity: removeEntity,
    Chat: chat,
    Search: search,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, bindPort) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      console.log(`AI Engine gRPC server listening on port ${bindPort}`);
    }
  );

  return server;
}
