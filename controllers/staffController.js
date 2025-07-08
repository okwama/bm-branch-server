const db = require('../database/db');

const staffController = {
  getAllStaff: async (req, res) => {
    try {
      console.log('Starting to fetch staff list...');
      
      // First, check if the staff table exists
      const [tables] = await db.query('SHOW TABLES LIKE "staff"');
      console.log('Tables check result:', tables);
      
      if (tables.length === 0) {
        console.error('Staff table does not exist!');
        return res.status(500).json({ 
          message: 'Staff table does not exist',
          error: 'Database table missing'
        });
      }

      // Check the table structure
      const [columns] = await db.query('DESCRIBE staff');
      console.log('Staff table structure:', columns);

      // Try to fetch the data
      console.log('Executing SELECT query...');
      const [staff] = await db.query('SELECT * FROM staff ORDER BY created_at DESC');
      console.log('Query result:', staff);

      if (!staff || staff.length === 0) {
        console.log('No staff records found');
        return res.json([]);
      }

      res.json(staff);
    } catch (error) {
      console.error('Error in getAllStaff:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        message: 'Error fetching staff list',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        } : undefined
      });
    }
  },

  getStaffById: async (req, res) => {
    try {
      const [staff] = await db.query('SELECT * FROM staff WHERE id = ?', [req.params.id]);
      
      if (staff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      res.json(staff[0]);
    } catch (error) {
      console.error('Error fetching staff member:', error);
      res.status(500).json({ message: 'Error fetching staff member' });
    }
  },

  createStaff: async (req, res) => {
    const { name, photo_url, empl_no, id_no, role } = req.body;
    
    try {
      const [result] = await db.query(
        'INSERT INTO staff (name, photo_url, empl_no, id_no, role) VALUES (?, ?, ?, ?, ?)',
        [name, photo_url, empl_no, id_no, role]
      );
      
      res.status(201).json({
        id: result.insertId,
        name,
        photo_url,
        empl_no,
        id_no,
        role
      });
    } catch (error) {
      console.error('Error creating staff member:', error);
      res.status(500).json({ message: 'Error creating staff member' });
    }
  },

  updateStaff: async (req, res) => {
    const { name, photo_url, empl_no, id_no, role } = req.body;
    
    try {
      await db.query(
        'UPDATE staff SET name = ?, photo_url = ?, empl_no = ?, id_no = ?, role = ? WHERE id = ?',
        [name, photo_url, empl_no, id_no, role, req.params.id]
      );
      
      res.json({
        id: parseInt(req.params.id),
        name,
        photo_url,
        empl_no,
        id_no,
        role
      });
    } catch (error) {
      console.error('Error updating staff member:', error);
      res.status(500).json({ message: 'Error updating staff member' });
    }
  },

  deleteStaff: async (req, res) => {
    try {
      await db.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting staff member:', error);
      res.status(500).json({ message: 'Error deleting staff member' });
    }
  },

  updateStaffStatus: async (req, res) => {
    const { status } = req.body;
    const staffId = req.params.id;
    
    try {
      console.log('Updating staff status:', { staffId, status });
      
      // First check if staff exists
      const [existingStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      
      if (existingStaff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      // Update the status
      await db.query(
        'UPDATE staff SET status = ? WHERE id = ?',
        [status, staffId]
      );
      
      // Get the updated staff record
      const [updatedStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      
      console.log('Staff status updated successfully:', updatedStaff[0]);
      res.json(updatedStaff[0]);
    } catch (error) {
      console.error('Error updating staff status:', error);
      res.status(500).json({ 
        message: 'Error updating staff status',
        error: error.message 
      });
    }
  }
};

module.exports = staffController; 