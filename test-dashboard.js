const axios = require('axios');

(async () => {
    try {
        const api = axios.create({ baseURL: 'http://localhost:8000/api/v1' });
        const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
        const token = loginRes.data.data.token;
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/dashboard/summary');
        console.log("Status:", res.status);
        console.log("Data keys:", Object.keys(res.data.data));
        console.log("Low Stock:", res.data.data.low_stock);
        console.log("Net Profit:", res.data.data.net_profit);
        console.log("Accounting Health:", res.data.data.accounting_health);
        
    } catch (e) {
        console.error("ERROR:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
})();
