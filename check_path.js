const path = require('path');
const fs = require('fs');
const file = path.join(__dirname, 'public', 'admin', 'login.html');
console.log('path', file);
console.log('first 500 chars:', fs.readFileSync(file, 'utf8').slice(0,500));
