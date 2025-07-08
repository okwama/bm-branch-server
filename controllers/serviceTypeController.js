const db = require('../database');

const serviceTypeController = {
  // Get all service types
  getAllServiceTypes: async (req, res) => {
    try {
      const [serviceTypes] = await db.query('SELECT * FROM service_types ORDER BY name');
      res.json(serviceTypes);
    } catch (error) {
      console.error('Error fetching service types:', error);
      res.status(500).json({ message: 'Failed to fetch service types' });
    }
  },

  // Get a single service type by ID
  getServiceTypeById: async (req, res) => {
    try {
      const [serviceType] = await db.query('SELECT * FROM service_types WHERE id = ?', [req.params.id]);
      
      if (serviceType.length === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      res.json(serviceType[0]);
    } catch (error) {
      console.error('Error fetching service type:', error);
      res.status(500).json({ message: 'Error fetching service type' });
    }
  },

  // Create a new service type (admin only)
  createServiceType: async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    try {
      const [result] = await db.query(
        'INSERT INTO service_types (name, description) VALUES (?, ?)',
        [name, description]
      );

      const [newServiceType] = await db.query('SELECT * FROM service_types WHERE id = ?', [result.insertId]);
      res.status(201).json(newServiceType[0]);
    } catch (error) {
      console.error('Error creating service type:', error);
      res.status(500).json({ message: 'Error creating service type' });
    }
  },

  // Update a service type (admin only)
  updateServiceType: async (req, res) => {
    const { name, description } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    try {
      await db.query(
        'UPDATE service_types SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );

      const [updatedServiceType] = await db.query('SELECT * FROM service_types WHERE id = ?', [id]);
      
      if (updatedServiceType.length === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      res.json(updatedServiceType[0]);
    } catch (error) {
      console.error('Error updating service type:', error);
      res.status(500).json({ message: 'Error updating service type' });
    }
  },

  // Delete a service type (admin only)
  deleteServiceType: async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM service_types WHERE id = ?', [req.params.id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      res.json({ message: 'Service type deleted successfully' });
    } catch (error) {
      console.error('Error deleting service type:', error);
      res.status(500).json({ message: 'Error deleting service type' });
    }
  }
};

module.exports = serviceTypeController; 