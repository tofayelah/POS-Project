const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const meRes = await api.get('/me');
    console.log(JSON.stringify(meRes.data, null, 2));

  } catch (e) {
    console.error(e.response ? JSON.stringify(e.response.data) : e.message);
  }
})();
