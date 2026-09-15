const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const reqs = await Promise.allSettled([
      api.get('/business-units'),
      api.get('/branches'),
      api.get('/warehouses'),
      api.get('/pos/terminals')
    ]);

    console.log("BU Full Res:", JSON.stringify(reqs[0].value?.data));
    console.log("Branch Full Res:", JSON.stringify(reqs[1].value?.data));
    console.log("Warehouse Full Res:", JSON.stringify(reqs[2].value?.data));
    console.log("Terminal Full Res:", JSON.stringify(reqs[3].value?.data));
    
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
