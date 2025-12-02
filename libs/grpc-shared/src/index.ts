// Shared gRPC utilities and proto path
import * as path from 'path';

export function getProtoPath(): string {
  return path.join(__dirname, 'vistone.proto');
}

export const PROTO_FILE = 'vistone.proto';
