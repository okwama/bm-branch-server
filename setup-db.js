const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    // Create connection without database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'bm_admin_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database '${dbName}' created or already exists`);

    // Use the database
    await connection.query(`USE ${dbName}`);
    console.log(`Using database '${dbName}'`);

    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, 'database.sql');
    const sql = await fs.readFile(sqlFile, 'utf8');
    
    // Split the SQL file into individual statements
    const statements = sql
      .split(';')
      .filter(statement => statement.trim())
      .map(statement => statement + ';');

    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.query(statement);
        console.log('Executed SQL statement successfully');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log('Duplicate entry - skipping');
        } else {
          console.error('Error executing statement:', error);
          throw error;
        }
      }
    }

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash('test123', 10);
    await connection.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['test', 'test@example.com', hashedPassword, 'admin', hashedPassword]
    );

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Database setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database setup failed:', error);
    process.exit(1);
  }); 