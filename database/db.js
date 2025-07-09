const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '102.218.215.35',
  user: process.env.DB_USER || 'citlogis_bryan',
  password: process.env.DB_PASSWORD || '@bo9511221.qwerty',
  database: process.env.DB_NAME || 'citlogis_mybm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to MySQL database');
  connection.release();
});

module.exports = pool.promise(); 