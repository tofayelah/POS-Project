const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const buRes = await api.get('/business-units');
    const branchRes = await api.get('/branches');
    const whRes = await api.get('/warehouses');
    const termRes = await api.get('/pos/terminals');

    console.log("BU:", buRes.data?.data?.data?.[0]?.name || buRes.data?.data?.[0]?.name);
    const branchId = branchRes.data?.data?.data?.[0]?.id || branchRes.data?.data?.[0]?.id;
    console.log("Branch:", branchRes.data?.data?.data?.[0]?.name || branchRes.data?.data?.[0]?.name, 'ID:', branchId);
    
    const warehouseId = whRes.data?.data?.data?.[0]?.id || whRes.data?.data?.[0]?.id;
    console.log("Warehouse:", whRes.data?.data?.data?.[0]?.name || whRes.data?.data?.[0]?.name, 'ID:', warehouseId);
    
    const terminalId = termRes.data?.data?.data?.[0]?.id || termRes.data?.data?.[0]?.id;
    console.log("Terminal:", termRes.data?.data?.data?.[0]?.name || termRes.data?.data?.[0]?.name, 'ID:', terminalId);

    if (terminalId) {
      console.log('Opening POS session...');
      let sessionId = null;
      try {
          const sessionRes = await api.post('/pos/sessions/open', {
            pos_terminal_id: terminalId,
            opening_cash: 1000.50
          });
          sessionId = sessionRes.data?.data?.id;
          console.log('Session ID:', sessionId, 'Status:', sessionRes.data?.data?.status);
      } catch (e) {
          console.log('Failed to open session. Maybe already open?', e.response?.data?.message || e.message);
          const curRes = await api.get('/pos/sessions/current');
          sessionId = curRes.data?.data?.id;
          console.log('Current Session ID:', sessionId, 'Status:', curRes.data?.data?.status, 'Terminal:', curRes.data?.data?.pos_terminal_id);
      }
    }

    const searchRes = await api.get('/pos/products/search?q=RAZ-FAC-BOX-S');
    const products = searchRes.data?.data?.data || searchRes.data?.data || [];
    
    if (products.length > 0) {
       console.log('Product Found:', products[0].name || products[0].variant_name, 'SKU:', products[0].sku);
       console.log('Current Stock:', products[0].current_stock);
    } else {
       console.log('Product RAZ-FAC-BOX-S not found.');
    }

  } catch (e) {
    console.error(e.response ? JSON.stringify(e.response.data) : e.message);
  }
})();
