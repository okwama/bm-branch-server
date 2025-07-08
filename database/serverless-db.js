const mysql = require('mysql2/promise');
require('dotenv').config();

// Serverless-compatible database connection
// Creates new connection for each request instead of pooling
const createConnection = async () => {
  try {
    // Check if required environment variables are set
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      throw new Error('Database environment variables are not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.');
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
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