const axios = require('axios');
axios.get('http://localhost:9999').catch(err => {
  console.log('isAxiosError:', err.isAxiosError);
  console.log('has response key:', 'response' in err);
  console.log('response value:', err.response);
  const isAxios = typeof err === 'object' && err !== null && 'response' in err;
  console.log('isAxios:', isAxios);
});
