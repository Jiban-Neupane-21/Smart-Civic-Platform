import  client  from './client';

export const departmentApi = {
  getDashboard: async () => {
    const response = await client.get('/v1/department/dashboard');
    return response.data;
  },
  getComplaints: async () => {
    const response = await client.get('/v1/department/complaints');
    return response.data;
  },
  assignComplaint: async (id: string, staffId: string) => {
    const response = await client.post(`/v1/department/complaints/${id}/assign`, { staffId });
    return response.data;
  }
};
