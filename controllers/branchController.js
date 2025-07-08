const db = require('../database/db');

const branchController = {
  getAllBranchesWithoutClient: async (req, res) => {
    try {
      const [branches] = await db.query(`
        SELECT b.*, c.name as client_name 
        FROM branches b
        LEFT JOIN clients c ON b.client_id = c.id
        ORDER BY b.name
      `);
      res.json(branches);
    } catch (error) {
      console.error('Error fetching all branches:', error);
      res.status(500).json({ message: 'Error fetching all branches', error: error.message });
    }
  },

  getAllBranches: async (req, res) => {
    try {
      const [branches] = await db.query(`
        SELECT b.*, c.name as client_name 
        FROM branches b
        LEFT JOIN clients c ON b.client_id = c.id
        WHERE b.client_id = ?
        ORDER BY b.name
      `, [req.params.clientId]);
      res.json(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ message: 'Error fetching branches', error: error.message });
    }
  },

  getBranch: async (req, res) => {
    try {
      const [branches] = await db.query(
        'SELECT * FROM branches WHERE id = ?',
        [req.params.id]
      );
      
      if (branches.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      
      res.json(branches[0]);
    } catch (error) {
      console.error('Error fetching branch:', error);
      res.status(500).json({ message: 'Error fetching branch', error: error.message });
    }
  },

  createBranch: async (req, res) => {
    const { client_id, name, address, contact_person, contact_number, email } = req.body;
    
    try {
      const [result] = await db.query(
        `INSERT INTO branches (client_id, name, address, contact_person, contact_number, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [client_id, name, address, contact_person, contact_number, email]
      );
      
      const [newBranch] = await db.query(
        'SELECT * FROM branches WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(newBranch[0]);
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({ message: 'Error creating branch', error: error.message });
    }
  },

  updateBranch: async (req, res) => {
    const { name, address, contact_person, contact_number, email } = req.body;
    
    try {
      await db.query(
        `UPDATE branches 
         SET name = ?, address = ?, contact_person = ?, contact_number = ?, email = ?
         WHERE id = ?`,
        [name, address, contact_person, contact_number, email, req.params.id]
      );
      
      const [updatedBranch] = await db.query(
        'SELECT * FROM branches WHERE id = ?',
        [req.params.id]
      );
      
      if (updatedBranch.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      
      res.json(updatedBranch[0]);
    } catch (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({ message: 'Error updating branch', error: error.message });
    }
  },

  deleteBranch: async (req, res) => {
    try {
      const [result] = await db.query(
        'DELETE FROM branches WHERE id = ?',
        [req.params.id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      
      res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({ message: 'Error deleting branch', error: error.message });
    }
  }
};

module.exports = branchController; 