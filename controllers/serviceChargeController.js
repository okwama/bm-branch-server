const db = require('../database/db');

const serviceChargeController = {
  getServiceCharges: async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log('Fetching service charges for client:', clientId);

      // First, verify the client exists
      const [client] = await db.query(
        'SELECT id FROM clients WHERE id = ?',
        [clientId]
      );

      if (client.length === 0) {
        console.log('Client not found:', clientId);
        return res.status(404).json({ message: 'Client not found' });
      }

      // Then fetch the service charges with service type names
      const [charges] = await db.query(
        `SELECT sc.*, st.name as service_type_name 
         FROM service_charges sc
         JOIN service_types st ON sc.service_type_id = st.id
         WHERE sc.client_id = ?
         ORDER BY st.name`,
        [clientId]
      );

      console.log('Service charges fetched successfully:', charges);
      res.json(charges);
    } catch (error) {
      console.error('Error in getServiceCharges:', error);
      res.status(500).json({ 
        message: 'Failed to fetch service charges',
        error: error.message 
      });
    }
  },

  createServiceCharge: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { service_type_id, price } = req.body;
      
      console.log('Create service charge request:', {
        clientId,
        body: req.body
      });

      // Validate required fields
      if (!service_type_id || price === undefined) {
        return res.status(400).json({ 
          message: 'Service type and price are required' 
        });
      }

      // Check if client exists
      const [client] = await db.query(
        'SELECT id FROM clients WHERE id = ?',
        [clientId]
      );

      if (client.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }

      // Check if service type exists and get its name
      const [serviceType] = await db.query(
        'SELECT id, name FROM service_types WHERE id = ?',
        [service_type_id]
      );

      if (serviceType.length === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      // Check if service charge already exists for this client and service type
      const [existingCharge] = await db.query(
        `SELECT sc.*, st.name as service_type_name 
         FROM service_charges sc
         JOIN service_types st ON sc.service_type_id = st.id
         WHERE sc.client_id = ? AND sc.service_type_id = ?`,
        [clientId, service_type_id]
      );

      if (existingCharge.length > 0) {
        return res.status(400).json({ 
          message: `Service charge for "${serviceType[0].name}" already exists for this client`,
          existingCharge: existingCharge[0]
        });
      }

      // Create the service charge
      const [result] = await db.query(
        'INSERT INTO service_charges (client_id, service_type_id, price) VALUES (?, ?, ?)',
        [clientId, service_type_id, price]
      );

      // Fetch the newly created service charge with service type name
      const [newCharge] = await db.query(
        `SELECT sc.*, st.name as service_type_name 
         FROM service_charges sc
         JOIN service_types st ON sc.service_type_id = st.id
         WHERE sc.id = ?`,
        [result.insertId]
      );

      console.log('Service charge created successfully:', newCharge[0]);
      res.status(201).json(newCharge[0]);
    } catch (error) {
      console.error('Error in createServiceCharge:', error);
      res.status(500).json({ 
        message: 'Failed to create service charge',
        error: error.message 
      });
    }
  },

  updateServiceCharge: async (req, res) => {
    try {
      const { clientId, chargeId } = req.params;
      const { service_type_id, price } = req.body;
      
      console.log('Update service charge request:', {
        clientId,
        chargeId,
        body: req.body
      });

      // Validate required fields
      if (!service_type_id || price === undefined) {
        return res.status(400).json({ 
          message: 'Service type and price are required' 
        });
      }

      // Check if service charge exists and belongs to the client
      const [existingCharge] = await db.query(
        'SELECT id FROM service_charges WHERE id = ? AND client_id = ?',
        [chargeId, clientId]
      );

      if (existingCharge.length === 0) {
        return res.status(404).json({ message: 'Service charge not found' });
      }

      // Check if service type exists
      const [serviceType] = await db.query(
        'SELECT id FROM service_types WHERE id = ?',
        [service_type_id]
      );

      if (serviceType.length === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      // Update the service charge
      await db.query(
        'UPDATE service_charges SET service_type_id = ?, price = ? WHERE id = ? AND client_id = ?',
        [service_type_id, price, chargeId, clientId]
      );

      // Fetch the updated service charge with service type name
      const [updatedCharge] = await db.query(
        `SELECT sc.*, st.name as service_type_name 
         FROM service_charges sc
         JOIN service_types st ON sc.service_type_id = st.id
         WHERE sc.id = ?`,
        [chargeId]
      );

      console.log('Service charge updated successfully:', updatedCharge[0]);
      res.json(updatedCharge[0]);
    } catch (error) {
      console.error('Error in updateServiceCharge:', error);
      res.status(500).json({ 
        message: 'Failed to update service charge',
        error: error.message 
      });
    }
  },

  deleteServiceCharge: async (req, res) => {
    try {
      const { clientId, chargeId } = req.params;
      console.log('Deleting service charge:', { clientId, chargeId });

      // Check if service charge exists and belongs to the client
      const [existingCharge] = await db.query(
        'SELECT id FROM service_charges WHERE id = ? AND client_id = ?',
        [chargeId, clientId]
      );

      if (existingCharge.length === 0) {
        return res.status(404).json({ message: 'Service charge not found' });
      }

      // Delete the service charge
      await db.query(
        'DELETE FROM service_charges WHERE id = ? AND client_id = ?',
        [chargeId, clientId]
      );

      console.log('Service charge deleted successfully');
      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteServiceCharge:', error);
      res.status(500).json({ 
        message: 'Failed to delete service charge',
        error: error.message 
      });
    }
  }
};

module.exports = serviceChargeController; 