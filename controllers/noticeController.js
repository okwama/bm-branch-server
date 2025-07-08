const db = require('../database/db');

const noticeController = {
  getNotices: async (req, res) => {
    try {
      const [notices] = await db.query(`
        SELECT*
        FROM notices n
         
      `);
      res.json(notices);
    } catch (error) {
      console.error('Error fetching notices:', error);
      res.status(500).json({ message: 'Error fetching notices', error: error.message });
    }
  },

  createNotice: async (req, res) => {
    const { title, content } = req.body;
    const created_by = req.user?.id; // Assuming you have user info in req.user from auth middleware

    try {
      const [result] = await db.query(
        'INSERT INTO notices (title, content, created_by) VALUES (?, ?, ?)',
        [title, content, created_by]
      );

      const [newNotice] = await db.query(`
        SELECT *
        FROM notices n
        WHERE n.id = ?
      `, [result.insertId]);

      res.status(201).json(newNotice[0]);
    } catch (error) {
      console.error('Error creating notice:', error);
      res.status(500).json({ message: 'Error creating notice', error: error.message });
    }
  },

  updateNotice: async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
      await db.query(
        'UPDATE notices SET title = ?, content = ? WHERE id = ?',
        [title, content, id]
      );

      const [updatedNotice] = await db.query(`
        SELECT *
        FROM notices n
         
        WHERE n.id = ?
      `, [id]);

      if (updatedNotice.length === 0) {
        return res.status(404).json({ message: 'Notice not found' });
      }

      res.json(updatedNotice[0]);
    } catch (error) {
      console.error('Error updating notice:', error);
      res.status(500).json({ message: 'Error updating notice', error: error.message });
    }
  },

  deleteNotice: async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await db.query('DELETE FROM notices WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notice not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting notice:', error);
      res.status(500).json({ message: 'Error deleting notice', error: error.message });
    }
  },

  toggleNoticeStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      await db.query(
        'UPDATE notices SET status = ? WHERE id = ?',
        [status, id]
      );

      const [updatedNotice] = await db.query(`
        SELECT n.*, s.name as created_by_name
        FROM notices n
        LEFT JOIN staff s ON n.created_by = s.id
        WHERE n.id = ?
      `, [id]);

      if (updatedNotice.length === 0) {
        return res.status(404).json({ message: 'Notice not found' });
      }

      res.json(updatedNotice[0]);
    } catch (error) {
      console.error('Error updating notice status:', error);
      res.status(500).json({ message: 'Error updating notice status', error: error.message });
    }
  }
};

module.exports = noticeController; 