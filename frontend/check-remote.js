const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const testPost = await api.post('/business-units', {});
    console.log("Empty POST returned:", testPost.status, testPost.data);
  } catch (e) {
    if (e.response && e.response.status === 422) {
       console.log("SUCCESS! The remote server correctly rejected the empty payload with 422 Validation Error.");
    } else {
       console.error("ERROR:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
  }
})();
