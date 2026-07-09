import  client  from './client';

export const municipalityApi = {
  getDashboard: async () => {
    const response = await client.get('/api/municipality/analytics');
    return response.data;
  },
  getDepartments: async () => {
    const response = await client.get('/api/municipality/departments');
    return response.data;
  },
  getComplaints: async () => {
    const response = await client.get('/api/municipality/complaints');
    return response.data;
  }
};
