const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
const staffController = require('./controllers/staffController');
const roleController = require('./controllers/roleController');
const { upload } = require('./config/cloudinary');
const uploadController = require('./controllers/uploadController');
const teamController = require('./controllers/teamController');
const clientController = require('./controllers/clientController');
const branchController = require('./controllers/branchController');
const serviceChargeController = require('./controllers/serviceChargeController');
const noticeController = require('./controllers/noticeController');
const logRoutes = require('./routes/logRoutes');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', // Local development
    process.env.FRONTEND_URL, // Custom frontend URL
    /^https:\/\/.*\.vercel\.app$/ // Allow all Vercel deployments
  ].filter(Boolean), // Remove undefined values
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Log routes
app.use('/api/logs', logRoutes);

// Helper function to map database fields to frontend fields
const mapRequestFields = (request) => ({
  id: request.id,
  userId: request.user_id,
  userName: request.user_name,
  serviceTypeId: request.service_type_id,
  serviceTypeName: request.service_type_name,
  pickupLocation: request.pickup_location,
  deliveryLocation: request.delivery_location,
  pickupDate: request.pickup_date,
  description: request.description,
  priority: request.priority,
  status: request.status,
  myStatus: request.my_status,
  branchId: request.branch_id,
  branchName: request.branch_name,
  clientName: request.client_name,
  price: request.price,
  latitude: request.latitude,
  longitude: request.longitude,
  team_id: request.team_id,
  createdAt: request.created_at,
  updatedAt: request.updated_at
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get branch from database using name instead of username
    console.log('Querying database for branch:', username);
    const [branches] = await db.query(
      'SELECT * FROM branches WHERE name = ?',
      [username]
    );

    console.log('Database query result:', branches);

    if (branches.length === 0) {
      console.log('No branch found with name:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const branch = branches[0];

    // Compare password
    console.log('Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, branch.password);
    console.log('Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for branch:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    console.log('Creating JWT token for branch:', username);
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

    console.log('Login successful for branch:', username);
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
});

// Service Types routes
app.get('/api/service-types', async (req, res) => {
  try {
    const [serviceTypes] = await db.query(
      'SELECT * FROM service_types ORDER BY name'
    );
    res.json(serviceTypes);
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/service-types/:id', async (req, res) => {
  try {
    const [serviceTypes] = await db.query(
      'SELECT * FROM service_types WHERE id = ?',
      [req.params.id]
    );

    if (serviceTypes.length === 0) {
      return res.status(404).json({ message: 'Service type not found' });
    }

    res.json(serviceTypes[0]);
  } catch (error) {
    console.error('Error fetching service type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Requests routes
app.get('/api/requests', async (req, res) => {
  try {
    const { status, myStatus, branchId, pickupDate } = req.query;
    let query = `
      SELECT r.*, b.name as branch_name, c.name as client_name, st.name as service_type_name
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN service_types st ON r.service_type_id = st.id
    `;
    const params = [];
    const filters = [];
    if (status) {
      filters.push('r.status = ?');
      params.push(status);
    }
    if (myStatus !== undefined) {
      filters.push('r.my_status = ?');
      params.push(myStatus);
    }
    if (branchId) {
      filters.push('r.branch_id = ?');
      params.push(branchId);
    }
    if (pickupDate) {
      filters.push('DATE(r.pickup_date) = ?');
      params.push(pickupDate);
    }
    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC';
    const [requests] = await db.query(query, params);
    res.json(requests.map(mapRequestFields));
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    // Use branch info from authenticated user (JWT) if available
    let branchId = req.user?.branchId;
    let branchName = req.user?.name;
    // Fallback to body for backward compatibility
    if (!branchId) branchId = req.body.branchId;
    if (!branchName) branchName = req.body.branchName;

    // If branchName is missing, fetch it from the branches table
    if (!branchName && branchId) {
      const [branchRows] = await db.query('SELECT name FROM branches WHERE id = ?', [branchId]);
      if (branchRows.length > 0) {
        branchName = branchRows[0].name;
      }
    }

    const { 
      serviceTypeId,
      pickupLocation, 
      deliveryLocation, 
      pickupDate, 
      description, 
      priority,
      myStatus = 0,
      price,
      latitude,
      longitude
    } = req.body;

    console.log('Received request data:', {
      branchId,
      branchName,
      serviceTypeId,
      pickupLocation,
      deliveryLocation,
      pickupDate,
      description,
      priority,
      myStatus,
      price,
      latitude,
      longitude
    });

    // Validate required fields
    if (!branchId || !branchName || !serviceTypeId || !pickupLocation || !deliveryLocation || !pickupDate || !price) {
      console.log('Missing required fields:', {
        branchId: !branchId,
        branchName: !branchName,
        serviceTypeId: !serviceTypeId,
        pickupLocation: !pickupLocation,
        deliveryLocation: !deliveryLocation,
        pickupDate: !pickupDate,
        price: !price
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if service type exists
    const [serviceTypes] = await db.query(
      'SELECT id FROM service_types WHERE id = ?',
      [serviceTypeId]
    );

    if (serviceTypes.length === 0) {
      console.error('Service type not found:', serviceTypeId);
      return res.status(400).json({ message: 'Invalid service type' });
    }

    // Check if branch exists
    const [branches] = await db.query(
      'SELECT id FROM branches WHERE id = ?',
      [branchId]
    );

    if (branches.length === 0) {
      console.error('Branch not found:', branchId);
      return res.status(400).json({ message: 'Invalid branch' });
    }

    // Insert the request with price and coordinates
    const [result] = await db.query(
      `INSERT INTO requests (
        branch_id, service_type_id, 
        pickup_location, delivery_location, pickup_date, 
        description, priority, status, my_status, price,
        latitude, longitude
      ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branchId, serviceTypeId,
        pickupLocation, deliveryLocation, pickupDate,
        description || null, priority || 'medium', 'pending', myStatus, price,
        latitude || null, longitude || null
      ]
    );

    // Fetch the created request
    const [requests] = await db.query(
      'SELECT * FROM requests WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Error creating request', error: error.message });
  }
});

app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Map frontend field names to database field names
    const dbUpdates = {
      branch_name: updates.branchName,
      service_type_id: updates.serviceTypeId,
      pickup_location: updates.pickupLocation,
      delivery_location: updates.deliveryLocation,
      pickup_date: updates.pickupDate,
      description: updates.description,
      priority: updates.priority,
      status: updates.status,
      my_status: updates.myStatus,
      team_id: updates.team_id,
      latitude: updates.latitude,
      longitude: updates.longitude
    };

    // If team_id is present, fetch crew_commander_id and set staff_id
    if (updates.team_id) {
      const [teamRows] = await db.query('SELECT crew_commander_id FROM teams WHERE id = ?', [updates.team_id]);
      if (teamRows.length > 0 && teamRows[0].crew_commander_id) {
        dbUpdates.staff_id = teamRows[0].crew_commander_id;
      }
    }

    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => 
      dbUpdates[key] === undefined && delete dbUpdates[key]
    );

    // Build the SET clause dynamically based on provided updates
    const setClause = Object.keys(dbUpdates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(dbUpdates), id];

    await db.query(
      `UPDATE requests SET ${setClause} WHERE id = ?`,
      values
    );

    // Get the updated request
    const [requests] = await db.query(
      'SELECT * FROM requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Requests routes
app.get('/api/runs/summaries', async (req, res) => {
  try {
    const { year, month, clientId, branchId } = req.query;
    let query = `
      SELECT 
        DATE(pickup_date) as date,
        COUNT(*) as totalRuns,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as totalRunsCompleted,
        SUM(price) as totalAmount,
        SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as totalAmountCompleted
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      WHERE r.my_status = 3
    `;
    const params = [];

    if (year) {
      query += ' AND YEAR(r.pickup_date) = ?';
      params.push(year);
    }

    if (month) {
      query += ' AND MONTH(r.pickup_date) = ?';
      params.push(month);
    }

    if (clientId) {
      query += ' AND b.client_id = ?';
      params.push(clientId);
    }

    if (branchId) {
      query += ' AND r.branch_id = ?';
      params.push(branchId);
    }

    query += `
      GROUP BY DATE(r.pickup_date)
      ORDER BY date DESC
    `;

    const [summaries] = await db.query(query, params);
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching run summaries:', error);
    res.status(500).json({ message: 'Error fetching run summaries', error: error.message });
  }
});

// Staff routes
app.get('/api/staff', staffController.getAllStaff);
app.get('/api/staff/:id', staffController.getStaffById);
app.post('/api/staff', staffController.createStaff);
app.put('/api/staff/:id', staffController.updateStaff);
app.delete('/api/staff/:id', staffController.deleteStaff);
app.put('/api/staff/:id/status', staffController.updateStaffStatus);

// Roles routes
app.get('/api/roles', roleController.getAllRoles);

// Upload routes
app.post('/api/upload', upload.single('photo'), uploadController.uploadImage);

// Team routes
app.post('/api/teams', teamController.createTeam);
app.get('/api/teams', teamController.getTeams);

// Client routes
app.get('/api/clients', clientController.getAllClients);
app.get('/api/clients/:id', clientController.getClient);
app.post('/api/clients', clientController.createClient);
app.put('/api/clients/:id', clientController.updateClient);
app.delete('/api/clients/:id', clientController.deleteClient);
app.get('/api/branches', branchController.getAllBranchesWithoutClient);
app.get('/api/clients/:clientId/branches', branchController.getAllBranches);
app.post('/api/clients/:clientId/branches', branchController.createBranch);
app.put('/api/clients/:clientId/branches/:branchId', branchController.updateBranch);
app.delete('/api/clients/:clientId/branches/:branchId', branchController.deleteBranch);
app.get('/api/clients/:clientId/service-charges', serviceChargeController.getServiceCharges);
app.post('/api/clients/:clientId/service-charges', serviceChargeController.createServiceCharge);
app.put('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.updateServiceCharge);
app.delete('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.deleteServiceCharge);

// Notice routes
app.get('/api/notices', noticeController.getNotices);
app.post('/api/notices', noticeController.createNotice);
app.patch('/api/notices/:id', noticeController.updateNotice);
app.delete('/api/notices/:id', noticeController.deleteNotice);
app.patch('/api/notices/:id/status', noticeController.toggleNoticeStatus);

// SOS routes
app.get('/api/sos', async (req, res) => {
  try {
    const query = `
      SELECT s.*, st.name as guard_name
      FROM sos s
      LEFT JOIN staff st ON s.guard_id = st.id
      ORDER BY s.created_at DESC
    `;
    
    const [sosList] = await db.query(query);
    res.json(sosList);
  } catch (error) {
    console.error('Error fetching SOS list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/sos/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const query = `
      UPDATE sos 
      SET status = ?,
          comment = ?
      WHERE id = ?
    `;
    
    await db.query(query, [status, comment || null, id]);
    
    // Fetch updated SOS record
    const [updatedSos] = await db.query(`
      SELECT s.*, st.name as guard_name
      FROM sos s
      LEFT JOIN staff st ON s.guard_id = st.id
      WHERE s.id = ?
    `, [id]);

    res.json(updatedSos[0]);
  } catch (error) {
    console.error('Error updating SOS status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Example API endpoint
app.get('/api/test', (req, res) => {
  db.query('SELECT 1 + 1 AS solution')
    .then(([results]) => {
      res.json({ message: 'Database connection successful', results });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 