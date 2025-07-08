const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database/serverless-db');
const { upload } = require('../config/cloudinary');

const app = express();

// CORS configuration for serverless
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit payload size for serverless

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get branch from database using name instead of username
    const branches = await executeQuery(
      'SELECT * FROM branches WHERE name = ?',
      [username]
    );

    if (branches.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const branch = branches[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, branch.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        branchId: branch.id,
        name: branch.name,
        role: branch.role,
        clientId: branch.client_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
    const serviceTypes = await executeQuery(
      'SELECT * FROM service_types ORDER BY name'
    );
    res.json(serviceTypes);
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Requests routes
app.get('/api/requests', authenticateToken, async (req, res) => {
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
    
    const requests = await executeQuery(query, params);
    res.json(requests.map(mapRequestFields));
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
  try {
    let branchId = req.user?.branchId;
    let branchName = req.user?.name;
    
    if (!branchId) branchId = req.body.branchId;
    if (!branchName) branchName = req.body.branchName;

    if (!branchName && branchId) {
      const branchRows = await executeQuery('SELECT name FROM branches WHERE id = ?', [branchId]);
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

    // Validate required fields
    if (!branchId || !branchName || !serviceTypeId || !pickupLocation || !deliveryLocation || !pickupDate || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if service type exists
    const serviceTypes = await executeQuery(
      'SELECT id FROM service_types WHERE id = ?',
      [serviceTypeId]
    );

    if (serviceTypes.length === 0) {
      return res.status(400).json({ message: 'Invalid service type' });
    }

    // Check if branch exists
    const branches = await executeQuery(
      'SELECT id FROM branches WHERE id = ?',
      [branchId]
    );

    if (branches.length === 0) {
      return res.status(400).json({ message: 'Invalid branch' });
    }

    // Insert the request
    const result = await executeQuery(
      `INSERT INTO requests (
        branch_id, service_type_id, 
        pickup_location, delivery_location, pickup_date, 
        description, priority, status, my_status, price,
        latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branchId, serviceTypeId,
        pickupLocation, deliveryLocation, pickupDate,
        description || null, priority || 'medium', 'pending', myStatus, price,
        latitude || null, longitude || null
      ]
    );

    // Fetch the created request
    const requests = await executeQuery(
      'SELECT * FROM requests WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Error creating request', error: error.message });
  }
});

// Staff routes
app.get('/api/staff', authenticateToken, async (req, res) => {
  try {
    const staff = await executeQuery('SELECT * FROM staff ORDER BY created_at DESC');
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Error fetching staff list' });
  }
});

// Upload routes
app.post('/api/upload', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ 
      url: req.file.path,
      public_id: req.file.filename 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export for Vercel
module.exports = app; 