var mysql = require('mysql');
var connect = mysql.createConnection({
      host: 'localhost'
    , database: 'app'
    , user: 'node'
    , password: 'admin'});

module.exports = connect;
