import { IEmployeeCertificate, ITrainingProgram, IUserTrainingRequirement } from '../types/certificates.types';
import { getToken } from '../utils/auth';

const certificatesApi = {
    getTrainingPrograms: async (): Promise<ITrainingProgram[]> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to fetch training programs');
        return res.json();
    },

    createTrainingProgram: async (data: any): Promise<ITrainingProgram> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs`, {
            method: 'POST',
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create training program');
        return res.json();
    },

    updateTrainingProgram: async (id: number | string, data: any): Promise<ITrainingProgram> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update training program');
        return res.json();
    },

    deleteTrainingProgram: async (id: number | string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to delete training program');
        return res.json();
    },

    getUserCertificates: async (userId: number | string, type?: string): Promise<IEmployeeCertificate[]> => {
        const token = getToken();
        const url = new URL(`${process.env.REACT_APP_BASE_URL}/certificates/user/${userId}`);
        if (type) url.searchParams.append('type', type);
        const res = await fetch(url.toString(), {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to fetch user certificates');
        return res.json();
    },

    createCertificate: async (userId: number | string, data: any, file?: File): Promise<IEmployeeCertificate> => {
        const token = getToken();
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });
        if (file) {
            formData.append('file', file);
        }
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/user/${userId}`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': token ? `Bearer ${token}` : '' } // browser sets content-type multipart automatically
        });
        if (!res.ok) throw new Error('Failed to create certificate');
        return res.json();
    },

    updateCertificate: async (id: number | string, data: any, file?: File): Promise<IEmployeeCertificate> => {
        const token = getToken();
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });
        if (file) {
            formData.append('file', file);
        }
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/${id}`, {
            method: 'PUT',
            body: formData,
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to update certificate');
        return res.json();
    },

    deleteCertificate: async (id: number | string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to delete certificate');
        return res.json();
    },

    getExpiringCertificates: async (days?: number): Promise<IEmployeeCertificate[]> => {
        const token = getToken();
        const url = new URL(`${process.env.REACT_APP_BASE_URL}/certificates/expiring`);
        if (days) url.searchParams.append('days', days.toString());
        const res = await fetch(url.toString(), {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to fetch expiring certificates');
        return res.json();
    },

    getTrainingRequirements: async (userId: number | string): Promise<IUserTrainingRequirement[]> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/user/${userId}/requirements`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to fetch training requirements');
        return res.json();
    },

    createTrainingRequirement: async (userId: number | string, data: any): Promise<IUserTrainingRequirement> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/user/${userId}/requirements`, {
            method: 'POST',
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create training requirement');
        return res.json();
    },

    updateTrainingRequirement: async (id: number | string, data: any): Promise<IUserTrainingRequirement> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/requirements/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update training requirement');
        return res.json();
    },

    deleteTrainingRequirement: async (id: number | string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/requirements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to delete training requirement');
        return res.json();
    },

    getQualificationStats: async (): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/qualification-stats`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Failed to fetch qualification stats');
        return res.json();
    },

    renameGroup: async (oldName: string, newName: string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs/rename-group`, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldName, newName })
        });
        if (!res.ok) throw new Error('Failed to rename group');
        return res.json();
    },

    renameCode: async (oldCode: string, newCode: string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${process.env.REACT_APP_BASE_URL}/certificates/programs/rename-code`, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldCode, newCode })
        });
        if (!res.ok) throw new Error('Failed to rename code');
        return res.json();
    }
};

export default certificatesApi;
