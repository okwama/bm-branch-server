const mysql = require('mysql2/promise');
require('dotenv').config();

// Serverless-compatible database connection
// Creates new connection for each request instead of pooling
const createConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bm_admin_db',
      // Serverless optimizations
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: false,
      // Disable connection pooling for serverless
      connectionLimit: 1,
      queueLimit: 0
    });

    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
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