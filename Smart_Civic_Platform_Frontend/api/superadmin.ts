import client  from './client';

export const superadminApi = {
  getDashboard: async () => {
    const response = await client.get('/v1/superadmin/dashboard');
    return response.data;
  },
  getMunicipalities: async () => {
    const response = await client.get('/v1/superadmin/municipalities');
    return response.data;
  },
  createMunicipality: async (data: any) => {
    const response = await client.post('/v1/superadmin/municipalities', data);
    return response.data;
  }
};
