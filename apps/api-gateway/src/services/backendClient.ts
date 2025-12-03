import axios, { AxiosInstance } from 'axios';

class ServiceClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get(endpoint: string) {
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async getById(endpoint: string, id: string) {
    const response = await this.client.get(`${endpoint}/${id}`);
    return response.data;
  }

  async post(endpoint: string, data: any) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async postWithAuth(endpoint: string, data: any, token: string) {
    const response = await this.client.post(endpoint, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async put(endpoint: string, id: string, data: any) {
    const response = await this.client.put(`${endpoint}/${id}`, data);
    return response.data;
  }

  async delete(endpoint: string, id: string) {
    const response = await this.client.delete(`${endpoint}/${id}`);
    return response.data;
  }
}

// Individual service clients for each microservice
export const authClient = new ServiceClient(
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
);

export const workforceClient = new ServiceClient(
  process.env.WORKFORCE_SERVICE_URL || 'http://localhost:3002'
);

export const projectClient = new ServiceClient(
  process.env.PROJECT_SERVICE_URL || 'http://localhost:3003'
);

export const clientMgmtClient = new ServiceClient(
  process.env.CLIENT_SERVICE_URL || 'http://localhost:3004'
);

export const knowledgeClient = new ServiceClient(
  process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005'
);

export const communicationClient = new ServiceClient(
  process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3006'
);

export const monitoringClient = new ServiceClient(
  process.env.MONITORING_SERVICE_URL || 'http://localhost:3007'
);

export const notificationClient = new ServiceClient(
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008'
);

// Legacy export for backward compatibility (deprecated)
export default authClient;
