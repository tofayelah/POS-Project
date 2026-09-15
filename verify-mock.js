const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const res = await api.post('/business-units', {});
    console.log("Empty POST to /business-units returned Status:", res.status);
    console.log("Body:", JSON.stringify(res.data));
    
  } catch (e) {
    console.error("ERROR:", e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }
})();
