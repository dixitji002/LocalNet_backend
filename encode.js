const fs = require('fs');

const credentials = require('./service-account.json'); // your JSON file
const oneLiner = JSON.stringify(credentials).replace(/\n/g, '\\n');

console.log(oneLiner);
