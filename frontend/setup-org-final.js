const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    console.log("Logging in to REMOTE...");
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    let buRes = await api.get('/business-units');
    console.log("BU Response:", buRes.status);
    
    // Also test local if remote is still mocked
    const localApi = axios.create({ baseURL: 'http://localhost:8000/api/v1' });
    console.log("Logging in to LOCAL...");
    const localLoginRes = await localApi.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const localToken = localLoginRes.data.data.token;
    localApi.defaults.headers.common['Authorization'] = `Bearer ${localToken}`;
    
    let localBuRes = await localApi.get('/business-units');
    console.log("Local BU Response:", localBuRes.status);

  } catch (e) {
    console.error("ERROR:", e.response ? JSON.stringify(e.response.data) : e.message);
  }
})();
