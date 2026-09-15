const axios = require('axios');
const api = axios.create({ baseURL: 'http://example.com/api/v1' });
console.log(api.getUri({ url: '/login' }));
console.log(api.getUri({ url: 'login' }));
