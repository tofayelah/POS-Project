const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const res = await api.post('/business-units', {});
    console.log("Status:", res.status, res.data);
  } catch (e) {
    console.error("ERROR:", e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }
})();
