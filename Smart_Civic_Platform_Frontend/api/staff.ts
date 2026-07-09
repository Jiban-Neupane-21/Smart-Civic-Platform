import  client  from './client';

export const staffApi = {
  getDashboard: async () => {
    const response = await client.get('/v1/staff/dashboard');
    return response.data;
  },
  getAssignedComplaints: async () => {
    const response = await client.get('/v1/staff/complaints/assigned');
    return response.data;
  },
  updateComplaintStatus: async (id: string, status: string, resolutionNotes?: string) => {
    const response = await client.put(`/v1/staff/complaints/${id}/status`, { status, resolutionNotes });
    return response.data;
  },
  addComment: async (id: string, comment: string) => {
    const response = await client.post(`/v1/staff/complaints/${id}/comments`, { comment });
    return response.data;
  }
};
