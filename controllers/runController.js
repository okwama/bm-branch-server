const db = require('../database/db');

const runController = {
  getRuns: async (req, res) => {
    const { date } = req.query;

    try {
      const [runs] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE DATE(r.pickup_date) = ?
         ORDER BY r.pickup_date ASC`,
        [date]
      );
      res.json(runs);
    } catch (error) {
      console.error('Error fetching runs:', error);
      res.status(500).json({ message: 'Error fetching runs', error: error.message });
    }
  },

  createRun: async (req, res) => {
    const {
      branch_id,
      branch_name,
      service_type_id,
      pickup_location,
      delivery_location,
      pickup_date,
      description,
      price,
      priority,
      latitude,
      longitude
    } = req.body;

    try {
      const [result] = await db.query(
        `INSERT INTO requests (
          branch_id, branch_name, service_type_id,
          pickup_location, delivery_location, pickup_date,
          description, price, priority, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          branch_id, branch_name, service_type_id,
          pickup_location, delivery_location, pickup_date,
          description, price, priority, latitude, longitude
        ]
      );

      const [newRun] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [result.insertId]
      );

      res.status(201).json(newRun[0]);
    } catch (error) {
      console.error('Error creating run:', error);
      res.status(500).json({ message: 'Error creating run', error: error.message });
    }
  },

  updateRun: async (req, res) => {
    const { id } = req.params;
    const {
      service_type_id,
      branch_id,
      pickup_location,
      delivery_location,
      pickup_date,
      description,
      price,
      priority,
      status,
      latitude,
      longitude
    } = req.body;

    try {
      await db.query(
        `UPDATE requests 
         SET service_type_id = ?,
             branch_id = ?,
             pickup_location = ?,
             delivery_location = ?,
             pickup_date = ?,
             description = ?,
             price = ?,
             priority = ?,
             status = ?,
             latitude = ?,
             longitude = ?
         WHERE id = ?`,
        [
          service_type_id,
          branch_id,
          pickup_location,
          delivery_location,
          pickup_date,
          description,
          price,
          priority,
          status,
          latitude,
          longitude,
          id
        ]
      );

      const [updatedRun] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [id]
      );

      if (updatedRun.length === 0) {
        return res.status(404).json({ message: 'Run not found' });
      }

      res.json(updatedRun[0]);
    } catch (error) {
      console.error('Error updating run:', error);
      res.status(500).json({ message: 'Error updating run', error: error.message });
    }
  },

  deleteRun: async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await db.query('DELETE FROM requests WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Run not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting run:', error);
      res.status(500).json({ message: 'Error deleting run', error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      await db.query(
        'UPDATE requests SET status = ? WHERE id = ?',
        [status, id]
      );

      const [updatedRun] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [id]
      );

      if (updatedRun.length === 0) {
        return res.status(404).json({ message: 'Run not found' });
      }

      res.json(updatedRun[0]);
    } catch (error) {
      console.error('Error updating run status:', error);
      res.status(500).json({ message: 'Error updating run status', error: error.message });
    }
  },

  getDateSummaries: async (req, res) => {
    try {
      const [summaries] = await db.query(
        `SELECT 
          DATE(pickup_date) as date,
          COUNT(*) as totalRuns,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalAmount
         FROM requests
         GROUP BY DATE(pickup_date)
         ORDER BY date DESC
         LIMIT 30`
      );
      res.json(summaries);
    } catch (error) {
      console.error('Error fetching date summaries:', error);
      res.status(500).json({ message: 'Error fetching date summaries', error: error.message });
    }
  }
};

module.exports = runController; 