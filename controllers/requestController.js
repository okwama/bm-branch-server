const db = require('../database/db');

const requestController = {
  getRequests: async (req, res) => {
    const { date } = req.query;

    try {
      const [requests] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE DATE(r.pickup_date) = ?
         ORDER BY r.pickup_date ASC`,
        [date]
      );
      res.json(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
  },

  createRequest: async (req, res) => {
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

      const [newRequest] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [result.insertId]
      );

      res.status(201).json(newRequest[0]);
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ message: 'Error creating request', error: error.message });
    }
  },

  updateRequest: async (req, res) => {
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
      longitude,
      staff_id
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
             longitude = ?,
             staff_id = COALESCE(?, staff_id)
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
          staff_id || null,
          id
        ]
      );

      const [updatedRequest] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [id]
      );

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error updating request:', error);
      res.status(500).json({ message: 'Error updating request', error: error.message });
    }
  },

  deleteRequest: async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await db.query('DELETE FROM requests WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting request:', error);
      res.status(500).json({ message: 'Error deleting request', error: error.message });
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

      const [updatedRequest] = await db.query(
        `SELECT r.*, b.name as branch_name, st.name as service_type_name
         FROM requests r
         LEFT JOIN branches b ON r.branch_id = b.id
         LEFT JOIN service_types st ON r.service_type_id = st.id
         WHERE r.id = ?`,
        [id]
      );

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error updating request status:', error);
      res.status(500).json({ message: 'Error updating request status', error: error.message });
    }
  }
};

module.exports = requestController; 