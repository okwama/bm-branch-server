const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get branch from database using name instead of username
    const [branches] = await db.query(
      'SELECT * FROM branches WHERE name = ?',
      [username]
    );

    if (branches.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const branch = branches[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, branch.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        branchId: branch.id,
        name: branch.name,
        role: branch.role,
        clientId: branch.client_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: branch.id,
        name: branch.name,
        email: branch.email,
        role: branch.role,
        client_id: branch.client_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login
}; 