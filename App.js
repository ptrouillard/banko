// cPanel Node.js Selector entry point — starts the Express backend
process.env.NODE_ENV = 'production';
process.env.BASE_URL = '/banko';
import('./backend/index.js');
