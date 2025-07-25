const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database/serverless-db');
const { upload } = require('../config/cloudinary');

// Import log controller with error handling
let receiveLog;
try {
  receiveLog = require('../controllers/logController').receiveLog;
  console.log('✅ Log controller loaded successfully');
} catch (error) {
  console.error('❌ Error loading log controller:', error.message);
  // Create a fallback log handler
  receiveLog = (req, res) => {
    try {
      const { timestamp, level, component, message, data } = req.body;
      const time = new Date(timestamp).toLocaleTimeString();
      console.log(`[${time}] ${level.toUpperCase()} - ${component}: ${message}`);
      if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error processing log:', error);
      res.status(500).json({ error: 'Failed to process log' });
    }
  };
}

const app = express();

// CORS configuration with explicit origin handling for credentials
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins but return the specific origin for credentials
    console.log('CORS - Origin:', origin);
    // When credentials are true, we must specify the exact origin, not '*'
    if (!origin) {
      // No origin means server-to-server request
      return callback(null, true);
    }
    return callback(null, origin);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit payload size for serverless

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
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
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM branches WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new branch/user
    const result = await executeQuery(
      'INSERT INTO branches (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'branch']
    );

    // Create JWT token
    const token = jwt.sign(
      { 
        branchId: result.insertId,
        name: name,
        role: role || 'branch',
        email: email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        name: name,
        email: email,
        role: role || 'branch'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const branchId = req.user?.branchId;
    
    if (!branchId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const branches = await executeQuery(
      'SELECT id, name, email, role, client_id FROM branches WHERE id = ?',
      [branchId]
    );

    if (branches.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(branches[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Create new token
    const newToken = jwt.sign(
      { 
        branchId: decoded.branchId,
        name: decoded.name,
        role: decoded.role,
        clientId: decoded.clientId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token: newToken,
      user: {
        id: decoded.branchId,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        client_id: decoded.clientId
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', { username: req.body.username, hasPassword: !!req.body.password });
    console.log('Environment check:', {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
      DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
      DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET'
    });
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get branch from database using name instead of username
    console.log('Attempting database query for username:', username);
    const branches = await executeQuery(
      'SELECT * FROM branches WHERE name = ?',
      [username]
    );
    console.log('Database query result:', { found: branches.length > 0, branchCount: branches.length });

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
      process.env.JWT_SECRET || 'your-secret-key',
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

app.patch('/api/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['status', 'my_status', 'priority', 'description', 'team_id', 'staff_id'];
    const dbUpdates = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        dbUpdates[field] = updates[field];
      }
    });

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = Object.keys(dbUpdates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(dbUpdates), id];

    await executeQuery(
      `UPDATE requests SET ${setClause} WHERE id = ?`,
      values
    );

    // Get the updated request
    const requests = await executeQuery(`
      SELECT r.*, b.name as branch_name, c.name as client_name, st.name as service_type_name
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN service_types st ON r.service_type_id = st.id
      WHERE r.id = ?
    `, [id]);

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/requests/in-transit', authenticateToken, async (req, res) => {
  try {
    const requests = await executeQuery(`
      SELECT r.*, b.name as branch_name, c.name as client_name, st.name as service_type_name
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN service_types st ON r.service_type_id = st.id
      WHERE r.status = 'in_transit' OR r.my_status = 2
      ORDER BY r.created_at DESC
    `);
    
    res.json(requests.map(mapRequestFields));
  } catch (error) {
    console.error('Error fetching in-transit requests:', error);
    res.status(500).json({ message: 'Internal server error' });
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

app.post('/api/staff', authenticateToken, async (req, res) => {
  try {
    const { name, photo_url, empl_no, id_no, role } = req.body;
    
    if (!name || !empl_no || !id_no || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await executeQuery(
      'INSERT INTO staff (name, photo_url, empl_no, id_no, role, status) VALUES (?, ?, ?, ?, ?, 1)',
      [name, photo_url || null, empl_no, id_no, role]
    );

    const newStaff = await executeQuery('SELECT * FROM staff WHERE id = ?', [result.insertId]);
    res.status(201).json(newStaff[0]);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Error creating staff member' });
  }
});

app.put('/api/staff/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 0 && status !== 1) {
      return res.status(400).json({ message: 'Status must be 0 or 1' });
    }

    await executeQuery('UPDATE staff SET status = ? WHERE id = ?', [status, id]);
    
    const updatedStaff = await executeQuery('SELECT * FROM staff WHERE id = ?', [id]);
    res.json(updatedStaff[0]);
  } catch (error) {
    console.error('Error updating staff status:', error);
    res.status(500).json({ message: 'Error updating staff status' });
  }
});

app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, photo_url, empl_no, id_no, role } = req.body;

    if (!name || !empl_no || !id_no || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await executeQuery(
      'UPDATE staff SET name = ?, photo_url = ?, empl_no = ?, id_no = ?, role = ? WHERE id = ?',
      [name, photo_url || null, empl_no, id_no, role, id]
    );

    const updatedStaff = await executeQuery('SELECT * FROM staff WHERE id = ?', [id]);
    res.json(updatedStaff[0]);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Error updating staff member' });
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

// SOS routes
app.get('/api/sos', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT s.*, st.name as guard_name
      FROM sos s
      LEFT JOIN staff st ON s.staff_id = st.id
      ORDER BY s.created_at DESC
    `;
    
    const sosList = await executeQuery(query);
    res.json(sosList);
  } catch (error) {
    console.error('Error fetching SOS list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/sos/:id/status', authenticateToken, async (req, res) => {
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
    
    await executeQuery(query, [status, comment || null, id]);
    
    // Fetch updated SOS record
    const updatedSos = await executeQuery(`
      SELECT s.*, st.name as guard_name
      FROM sos s
      LEFT JOIN staff st ON s.staff_id = st.id
      WHERE s.id = ?
    `, [id]);

    res.json(updatedSos[0]);
  } catch (error) {
    console.error('Error updating SOS status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Debug route for CORS testing
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Log routes
app.post('/api/logs', receiveLog);

// Import notice controller
const noticeController = require('../controllers/noticeController');

// Notice routes
app.get('/api/notices', authenticateToken, noticeController.getNotices);
app.post('/api/notices', authenticateToken, noticeController.createNotice);
app.patch('/api/notices/:id', authenticateToken, noticeController.updateNotice);
app.delete('/api/notices/:id', authenticateToken, noticeController.deleteNotice);
app.patch('/api/notices/:id/status', authenticateToken, noticeController.toggleNoticeStatus);

// Clients routes
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await executeQuery('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
});

app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clients = await executeQuery('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (clients.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(clients[0]);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Error fetching client' });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { name, account_number, email, phone, address } = req.body;
    
    if (!name || !account_number || !email) {
      return res.status(400).json({ message: 'Name, account number and email are required' });
    }

    const result = await executeQuery(
      'INSERT INTO clients (name, account_number, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name, account_number, email, phone || null, address || null]
    );

    const newClient = await executeQuery('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    res.status(201).json(newClient[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client' });
  }
});

app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, account_number, email, phone, address } = req.body;
    
    if (!name || !account_number || !email) {
      return res.status(400).json({ message: 'Name, account number and email are required' });
    }

    await executeQuery(
      'UPDATE clients SET name = ?, account_number = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [name, account_number, email, phone || null, address || null, id]
    );

    const updatedClient = await executeQuery('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (updatedClient.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(updatedClient[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client' });
  }
});

app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery('DELETE FROM clients WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client' });
  }
});

// Runs/summaries routes
app.get('/api/runs/summaries', authenticateToken, async (req, res) => {
  try {
    const { year, month, clientId, branchId } = req.query;
    const userBranchId = req.user?.branchId; // Get branch ID from JWT token
    
    let query = `
      SELECT 
        DATE(pickup_date) as date,
        COUNT(*) as totalRuns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as totalRunsCompleted,
        COALESCE(SUM(price), 0) as totalAmount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as totalAmountCompleted
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      WHERE pickup_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    const params = [];

    // Always filter by user's branch unless admin role
    if (req.user?.role !== 'admin' && userBranchId) {
      query += ' AND r.branch_id = ?';
      params.push(userBranchId);
    }

    // Additional filters from query parameters
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

    // Allow branchId override for admin users
    if (branchId && req.user?.role === 'admin') {
      query += ' AND r.branch_id = ?';
      params.push(branchId);
    }

    query += `
      GROUP BY DATE(pickup_date)
      ORDER BY date DESC
    `;

    const summaries = await executeQuery(query, params);
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching run summaries:', error);
    res.status(500).json({ message: 'Error fetching run summaries' });
  }
});

app.get('/api/runs', authenticateToken, async (req, res) => {
  try {
    const { date, clientId, branchId } = req.query;
    let query = `
      SELECT r.*, b.name as branch_name, c.name as client_name, st.name as service_type_name
      FROM requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN service_types st ON r.service_type_id = st.id
    `;
    const params = [];
    const filters = [];
    
    if (date) {
      filters.push('DATE(r.pickup_date) = ?');
      params.push(date);
    }
    if (clientId) {
      filters.push('c.id = ?');
      params.push(clientId);
    }
    if (branchId) {
      filters.push('r.branch_id = ?');
      params.push(branchId);
    }
    
    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }
    query += ' ORDER BY r.pickup_date DESC';
    
    const runs = await executeQuery(query, params);
    res.json(runs.map(mapRequestFields));
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ message: 'Error fetching runs' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('Environment variables:', {
      DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
      DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
      DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
    });
    
    const result = await executeQuery('SELECT 1 as test');
    console.log('Database test result:', result);
    
    res.json({ 
      status: 'Database connected successfully',
      test: result,
      env: {
        DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
        DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
        DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'BM Branch API Server', 
    status: 'running',
    timestamp: new Date().toISOString(),
    corsOrigin: req.headers.origin,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API test endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'BM Branch API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    corsOrigin: req.headers.origin
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export for Vercel serverless function
module.exports = app; 