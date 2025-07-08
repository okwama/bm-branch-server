const db = require('../database/db');

const serviceRequestController = {
  getServiceRequests: async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log('Fetching service requests for client:', clientId);

      // First, verify the client exists
      const [client] = await db.query(
        'SELECT id FROM clients WHERE id = ?',
        [clientId]
      );

      if (client.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }

      // Fetch service requests with branch and service type names
      const [requests] = await db.query(
        `SELECT sr.*, b.name as branch_name, st.name as service_type_name, sc.price
         FROM service_requests sr
         JOIN branches b ON sr.branch_id = b.id
         JOIN service_types st ON sr.service_type_id = st.id
         JOIN service_charges sc ON sc.client_id = sr.client_id AND sc.service_type_id = sr.service_type_id
         WHERE sr.client_id = ?
         ORDER BY sr.pickup_date DESC, sr.pickup_time DESC`,
        [clientId]
      );

      console.log('Service requests fetched successfully:', requests);
      res.json(requests);
    } catch (error) {
      console.error('Error in getServiceRequests:', error);
      res.status(500).json({ 
        message: 'Failed to fetch service requests',
        error: error.message 
      });
    }
  },

  createServiceRequest: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { branch_id, service_type_id, pickup_location, dropoff_location, pickup_date, pickup_time } = req.body;
      
      console.log('Create service request:', {
        clientId,
        body: req.body
      });

      // Validate required fields
      if (!branch_id || !service_type_id || !pickup_location || !dropoff_location || !pickup_date || !pickup_time) {
        return res.status(400).json({ 
          message: 'All fields are required' 
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

      // Check if branch exists and belongs to client
      const [branch] = await db.query(
        'SELECT id FROM branches WHERE id = ? AND client_id = ?',
        [branch_id, clientId]
      );

      if (branch.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }

      // Check if service type exists and has a charge for this client
      const [serviceCharge] = await db.query(
        'SELECT id FROM service_charges WHERE client_id = ? AND service_type_id = ?',
        [clientId, service_type_id]
      );

      if (serviceCharge.length === 0) {
        return res.status(400).json({ 
          message: 'No service charge found for this service type' 
        });
      }

      // Create the service request
      const [result] = await db.query(
        `INSERT INTO service_requests (
          client_id, branch_id, service_type_id, 
          pickup_location, dropoff_location, 
          pickup_date, pickup_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [clientId, branch_id, service_type_id, pickup_location, dropoff_location, pickup_date, pickup_time]
      );

      // Fetch the newly created service request with branch and service type names
      const [newRequest] = await db.query(
        `SELECT sr.*, b.name as branch_name, st.name as service_type_name, sc.price
         FROM service_requests sr
         JOIN branches b ON sr.branch_id = b.id
         JOIN service_types st ON sr.service_type_id = st.id
         JOIN service_charges sc ON sc.client_id = sr.client_id AND sc.service_type_id = sr.service_type_id
         WHERE sr.id = ?`,
        [result.insertId]
      );

      console.log('Service request created successfully:', newRequest[0]);
      res.status(201).json(newRequest[0]);
    } catch (error) {
      console.error('Error in createServiceRequest:', error);
      res.status(500).json({ 
        message: 'Failed to create service request',
        error: error.message 
      });
    }
  },

  updateServiceRequest: async (req, res) => {
    try {
      const { clientId, requestId } = req.params;
      const { branch_id, service_type_id, pickup_location, dropoff_location, pickup_date, pickup_time } = req.body;
      
      console.log('Update service request:', {
        clientId,
        requestId,
        body: req.body
      });

      // Validate required fields
      if (!branch_id || !service_type_id || !pickup_location || !dropoff_location || !pickup_date || !pickup_time) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

      // Check if service request exists and belongs to client
      const [existingRequest] = await db.query(
        'SELECT id FROM service_requests WHERE id = ? AND client_id = ?',
        [requestId, clientId]
      );

      if (existingRequest.length === 0) {
        return res.status(404).json({ message: 'Service request not found' });
      }

      // Check if branch exists and belongs to client
      const [branch] = await db.query(
        'SELECT id FROM branches WHERE id = ? AND client_id = ?',
        [branch_id, clientId]
      );

      if (branch.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }

      // Check if service type exists and has a charge for this client
      const [serviceCharge] = await db.query(
        'SELECT id FROM service_charges WHERE client_id = ? AND service_type_id = ?',
        [clientId, service_type_id]
      );

      if (serviceCharge.length === 0) {
        return res.status(400).json({ 
          message: 'No service charge found for this service type' 
        });
      }

      // Update the service request
      await db.query(
        `UPDATE service_requests 
         SET branch_id = ?, service_type_id = ?, 
             pickup_location = ?, dropoff_location = ?, 
             pickup_date = ?, pickup_time = ?
         WHERE id = ? AND client_id = ?`,
        [branch_id, service_type_id, pickup_location, dropoff_location, pickup_date, pickup_time, requestId, clientId]
      );

      // Fetch the updated service request with branch and service type names
      const [updatedRequest] = await db.query(
        `SELECT sr.*, b.name as branch_name, st.name as service_type_name, sc.price
         FROM service_requests sr
         JOIN branches b ON sr.branch_id = b.id
         JOIN service_types st ON sr.service_type_id = st.id
         JOIN service_charges sc ON sc.client_id = sr.client_id AND sc.service_type_id = sr.service_type_id
         WHERE sr.id = ?`,
        [requestId]
      );

      console.log('Service request updated successfully:', updatedRequest[0]);
      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error in updateServiceRequest:', error);
      res.status(500).json({ 
        message: 'Failed to update service request',
        error: error.message 
      });
    }
  },

  deleteServiceRequest: async (req, res) => {
    try {
      const { clientId, requestId } = req.params;
      console.log('Deleting service request:', { clientId, requestId });

      // Check if service request exists and belongs to client
      const [existingRequest] = await db.query(
        'SELECT id FROM service_requests WHERE id = ? AND client_id = ?',
        [requestId, clientId]
      );

      if (existingRequest.length === 0) {
        return res.status(404).json({ message: 'Service request not found' });
      }

      // Delete the service request
      await db.query(
        'DELETE FROM service_requests WHERE id = ? AND client_id = ?',
        [requestId, clientId]
      );

      console.log('Service request deleted successfully');
      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteServiceRequest:', error);
      res.status(500).json({ 
        message: 'Failed to delete service request',
        error: error.message 
      });
    }
  }
};

module.exports = serviceRequestController; 