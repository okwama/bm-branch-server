const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bm_admin_db'
    });

    // Hash password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert test user
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin@example.com', 'admin']
    );

    console.log('Test user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');

    await connection.end();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser(); 