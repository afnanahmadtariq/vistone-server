import axios, { AxiosInstance, AxiosError } from 'axios';
import { ServiceError } from '../lib/errors';

/** Generic record type representing data from REST microservices */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceRecord = Record<string, any>;

class ServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(baseURL: string, serviceName: string) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Extracts a detailed, human-readable error message and any validation
   * details from a downstream microservice HTTP error response.
   *
   * All services return at least `{ error: string }`.
   * Some also return `{ message, details, validRoles, validTypes }`.
   */
  private handleError(error: unknown, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // ── Connection refused — service is down ──
      if (axiosError.code === 'ECONNREFUSED') {
        throw new ServiceError(
          `${this.serviceName} is not available. Please ensure the service is running.`,
          503,
          this.serviceName,
          operation,
        );
      }

      // ── Timeout ──
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        throw new ServiceError(
          `${this.serviceName} request timed out. Please try again.`,
          504,
          this.serviceName,
          operation,
        );
      }

      // ── HTTP error response from the service ──
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as ServiceRecord | undefined;

        // Extract the most specific message available.
        // Services may return: { error, message, details, validRoles, validTypes }
        const primaryMessage: string =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : null) ||
          axiosError.message ||
          `Request failed with status ${status}`;

        // Extract validation details (Zod issues array)
        const details =
          data?.details ||
          data?.errors ||
          data?.issues ||
          undefined;

        throw new ServiceError(
          primaryMessage,
          status,
          this.serviceName,
          operation,
          details,
        );
      }

      // ── Network error without a response ──
      throw new ServiceError(
        `${this.serviceName} request failed: ${axiosError.message}`,
        502,
        this.serviceName,
        operation,
      );
    }

    // ── Non-Axios error — re-throw as-is ──
    throw error;
  }

  async get(endpoint: string): Promise<ServiceRecord[]> {
    try {
      const response = await this.client.get(endpoint);
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET');
    }
  }

  async getWithAuth(endpoint: string, token: string): Promise<ServiceRecord | ServiceRecord[]> {
    try {
      const response = await this.client.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET');
    }
  }

  async getById(endpoint: string, id: string): Promise<ServiceRecord> {
    try {
      const response = await this.client.get(`${endpoint}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET');
    }
  }

  async post(endpoint: string, data: ServiceRecord): Promise<ServiceRecord> {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'POST');
    }
  }

  async postWithAuth(endpoint: string, data: ServiceRecord, token: string): Promise<ServiceRecord> {
    try {
      const response = await this.client.post(endpoint, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'POST');
    }
  }

  async put(endpoint: string, id: string, data: ServiceRecord): Promise<ServiceRecord> {
    try {
      const response = await this.client.put(`${endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'PUT');
    }
  }

  async delete(endpoint: string, id: string): Promise<ServiceRecord> {
    try {
      const response = await this.client.delete(`${endpoint}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'DELETE');
    }
  }

  async deleteWithAuth(endpoint: string, id: string, token: string): Promise<ServiceRecord> {
    try {
      const response = await this.client.delete(`${endpoint}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'DELETE');
    }
  }
}

// Individual service clients for each microservice
export const authClient = new ServiceClient(
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  'Auth Service'
);

export const workforceClient = new ServiceClient(
  process.env.WORKFORCE_SERVICE_URL || 'http://localhost:3002',
  'Workforce Service'
);

export const projectClient = new ServiceClient(
  process.env.PROJECT_SERVICE_URL || 'http://localhost:3003',
  'Project Service'
);

export const clientMgmtClient = new ServiceClient(
  process.env.CLIENT_SERVICE_URL || 'http://localhost:3004',
  'Client Management Service'
);

export const knowledgeClient = new ServiceClient(
  process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005',
  'Knowledge Hub Service'
);

export const communicationClient = new ServiceClient(
  process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3006',
  'Communication Service'
);

export const monitoringClient = new ServiceClient(
  process.env.MONITORING_SERVICE_URL || 'http://localhost:3007',
  'Monitoring Service'
);

export const notificationClient = new ServiceClient(
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
  'Notification Service'
);

export const aiEngineClient = new ServiceClient(
  process.env.AI_ENGINE_URL || 'http://localhost:3009',
  'AI Engine Service'
);

// Legacy export for backward compatibility (deprecated)
export default authClient;
