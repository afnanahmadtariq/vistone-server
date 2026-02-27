/**
 * HTTP-based Service Client for backward compatibility
 * Used when gRPC is not available or for fallback
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

export class HttpServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(baseURL: string, serviceName: string, timeout = 30000) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private handleError(error: unknown, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error(`${this.serviceName} is not available. Please ensure the service is running.`);
      }
      if (axiosError.response) {
        const responseData = axiosError.response.data as Record<string, unknown> | undefined;
        const message = responseData?.error ?? axiosError.message;
        throw new Error(`${this.serviceName} ${operation} failed: ${message}`);
      }
      throw new Error(`${this.serviceName} ${operation} failed: ${axiosError.message}`);
    }
    throw error;
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint);
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET');
    }
  }

  async getById<T>(endpoint: string, id: string): Promise<T> {
    try {
      const response = await this.client.get<T>(`${endpoint}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET');
    }
  }

  async post<T, R>(endpoint: string, data: T): Promise<R> {
    try {
      const response = await this.client.post<R>(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'POST');
    }
  }

  async put<T, R>(endpoint: string, id: string, data: T): Promise<R> {
    try {
      const response = await this.client.put<R>(`${endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'PUT');
    }
  }

  async patch<T, R>(endpoint: string, id: string, data: T): Promise<R> {
    try {
      const response = await this.client.patch<R>(`${endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'PATCH');
    }
  }

  async delete<R>(endpoint: string, id: string): Promise<R> {
    try {
      const response = await this.client.delete<R>(`${endpoint}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'DELETE');
    }
  }
}

// Service client instances
export const projectServiceClient = new HttpServiceClient(
  process.env.PROJECT_SERVICE_URL || 'http://localhost:3003',
  'Project Management Service'
);

export const clientServiceClient = new HttpServiceClient(
  process.env.CLIENT_SERVICE_URL || 'http://localhost:3004',
  'Client Management Service'
);

export const workforceServiceClient = new HttpServiceClient(
  process.env.WORKFORCE_SERVICE_URL || 'http://localhost:3002',
  'Workforce Service'
);

export const communicationServiceClient = new HttpServiceClient(
  process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3006',
  'Communication Service'
);

export const notificationServiceClient = new HttpServiceClient(
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
  'Notification Service'
);

export const knowledgeServiceClient = new HttpServiceClient(
  process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005',
  'Knowledge Hub Service'
);
