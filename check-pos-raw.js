const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const info = {};

    const reqs = await Promise.allSettled([
      api.get('/business-units'),
      api.get('/branches'),
      api.get('/warehouses'),
      api.get('/pos/terminals')
    ]);

    console.log("BU Response keys:", Object.keys(reqs[0].value?.data || {}));
    if (reqs[0].value?.data?.data) console.log("BU list:", reqs[0].value.data.data.slice(0, 1).map(x => ({id: x.id, name: x.name})));
    
    console.log("Branch Response keys:", Object.keys(reqs[1].value?.data || {}));
    if (reqs[1].value?.data?.data) console.log("Branch list:", reqs[1].value.data.data.slice(0, 1).map(x => ({id: x.id, name: x.name})));

    console.log("Warehouse Response keys:", Object.keys(reqs[2].value?.data || {}));
    if (reqs[2].value?.data?.data) console.log("Warehouse list:", reqs[2].value.data.data.slice(0, 1).map(x => ({id: x.id, name: x.name})));

    console.log("Terminal Response keys:", Object.keys(reqs[3].value?.data || {}));
    if (reqs[3].value?.data?.data) {
        console.log("Terminal list:", reqs[3].value.data.data.slice(0, 1).map(x => ({id: x.id, name: x.name})));
        
        const terminalId = reqs[3].value.data.data[0].id;
        console.log("Opening POS session on terminal:", terminalId);
        try {
          const sessionRes = await api.post('/pos/sessions/open', {
            pos_terminal_id: terminalId,
            opening_cash: 500.00
          });
          console.log('Session ID:', sessionRes.data?.data?.id, 'Status:', sessionRes.data?.data?.status);
        } catch (e) {
          console.log('Session open failed:', e.response?.data?.message || e.message);
          const curRes = await api.get('/pos/sessions/current');
          console.log('Current Session ID:', curRes.data?.data?.id, 'Status:', curRes.data?.data?.status);
        }
    }
    
    const searchRes = await api.get('/pos/products/search?q=RAZ-FAC-BOX-S');
    console.log('Product Search:', JSON.stringify(searchRes.data?.data?.slice(0,1), null, 2));

  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
