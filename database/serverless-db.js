const mysql = require('mysql2/promise');
require('dotenv').config();

// Serverless-compatible database connection
// Creates new connection for each request instead of pooling
const createConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '102.218.215.35',
      user: process.env.DB_USER || 'citlogis_bryan',
      password: process.env.DB_PASSWORD || '@bo9511221.qwerty',
      database: process.env.DB_NAME || 'citlogis_mybm',
      ssl: process.env.DB_HOST !== '102.218.215.35' ? {
        rejectUnauthorized: false
      } : false,
      connectionLimit: 1,
      queueLimit: 0,
      port: process.env.DB_PORT || 3306
    });

    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Environment check:', {
      DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
      DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
      DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET'
    });
    throw error;
  }
};

// Helper function to execute queries with automatic connection management
const executeQuery = async (query, params = []) => {
  let connection;
  try {
    connection = await createConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
};

module.exports = {
  createConnection,
  executeQuery
}; 