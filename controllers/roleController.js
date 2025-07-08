const db = require('../database/db');

const roleController = {
  getAllRoles: async (req, res) => {
    try {
      console.log('Starting to fetch roles...');
      
      // First, check if the roles table exists
      const [tables] = await db.query('SHOW TABLES LIKE "roles"');
      console.log('Tables check result:', tables);
      
      if (tables.length === 0) {
        console.error('Roles table does not exist!');
        return res.status(500).json({ 
          message: 'Roles table does not exist',
          error: 'Database table missing'
        });
      }

      // Check the table structure
      const [columns] = await db.query('DESCRIBE roles');
      console.log('Roles table structure:', columns);

      // Try to fetch the data
      console.log('Executing SELECT query...');
      const [roles] = await db.query('SELECT * FROM roles ORDER BY name');
      console.log('Query result:', roles);

      if (!roles || roles.length === 0) {
        console.log('No roles found');
        return res.json([]);
      }

      res.json(roles);
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        message: 'Error fetching roles',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        } : undefined
      });
    }
  }
};

module.exports = roleController; 