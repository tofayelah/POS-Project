const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const res = await api.post('/business-units', {
        name: 'Ladies Undergarments',
        code: 'LADIES',
        status: 'active'
    });
    console.log("BU Create Status:", res.status, res.data.message, res.data.data);
    
    const buRes = await api.get('/business-units');
    console.log("BU List:", JSON.stringify(buRes.data));
  } catch (e) {
    console.error("ERROR:", e.response ? JSON.stringify(e.response.data) : e.message);
  }
})();
