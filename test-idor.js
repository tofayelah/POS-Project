const axios = require('axios');

(async () => {
    try {
        const api = axios.create({ baseURL: 'http://localhost:8000/api/v1' });
        
        // Login as Super Admin (has access to all)
        const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
        const token = loginRes.data.data.token;
        
        // Wait, do I have a regular user with restricted company access? 
        // Let's create one or just verify the behavior.
        // For now, I'll just check if the IDOR prevention works for an unauthorized company. 
        // Since admin@sonaribd.com is Super Admin, they have access to all. I need a non-super admin.
        
    } catch (e) {
        console.error(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
})();
