import axios, { AxiosInstance } from 'axios';

class BackendClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.BACKEND_SERVICES_URL || 'http://localhost:3000';

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

  async put(endpoint: string, id: string, data: any) {
    const response = await this.client.put(`${endpoint}/${id}`, data);
    return response.data;
  }

  async delete(endpoint: string, id: string) {
    const response = await this.client.delete(`${endpoint}/${id}`);
    return response.data;
  }
}

export default new BackendClient();
