import apiClient  from './client';

export interface SubmitComplaintRequest {
    title: string;
    description: string;
    municipalityId: string;
    categoryId: string;
    location: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    attachments?: string[];
}

export const citizenApi = {
    getDashboard: async () => {
        const response = await apiClient.get('/api/citizen/dashboard');
        return response.data;
    },

    getMunicipalities: async () => {
        const response = await apiClient.get('/api/citizen/municipalities');
        return response.data;
    },

    getCategories: async (municipalityId: string) => {
        const response = await apiClient.get(`/api/citizen/municipalities/${municipalityId}/categories`);
        return response.data;
    },

    submitComplaint: async (data: SubmitComplaintRequest) => {
        const response = await apiClient.post('/api/citizen/complaints', data);
        return response.data;
    },

    getComplaints: async () => {
        const response = await apiClient.get('/api/citizen/complaints');
        return response.data;
    },

    getComplaintById: async (id: string) => {
        const response = await apiClient.get(`/api/citizen/complaints/${id}`);
        return response.data;
    },

    getComplaintHistory: async (id: string) => {
        const response = await apiClient.get(`/api/citizen/complaints/${id}/history`);
        return response.data;
    },

    submitFeedback: async (id: string, feedback: { rating: number; comment?: string }) => {
        const response = await apiClient.post(`/api/citizen/complaints/${id}/feedback`, feedback);
        return response.data;
    }
};
