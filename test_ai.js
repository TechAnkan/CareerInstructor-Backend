require('dotenv').config({ override: true });
const { chat } = require('./controllers/aiController');
const req = { body: { message: 'Hello', history: [] } };
const res = { 
  status: (code) => ({ json: (data) => console.log('RESPONSE:', code, data) }) 
};
chat(req, res).then(() => console.log('Done')).catch(err => console.log('FATAL:', err));
