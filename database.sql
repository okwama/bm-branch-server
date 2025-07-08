-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create service_types table
CREATE TABLE IF NOT EXISTS service_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  service_type_id INT NOT NULL,
  branch_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  delivery_location VARCHAR(255) NOT NULL,
  pickup_date DATETIME NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  my_status TINYINT DEFAULT 0,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  photo_url VARCHAR(255) NOT NULL,
  empl_no VARCHAR(50) NOT NULL,
  id_no VARCHAR(50) NOT NULL,
  role VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create service_charges table
CREATE TABLE IF NOT EXISTS service_charges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  service_type_id INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  status TINYINT DEFAULT 1,
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Create daily_runs table
CREATE TABLE IF NOT EXISTS daily_runs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  driver_name VARCHAR(255) NOT NULL,
  vehicle_number VARCHAR(50) NOT NULL,
  route VARCHAR(255) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create branches table for authentication if not exists
CREATE TABLE IF NOT EXISTS branches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_number VARCHAR(50),
  email VARCHAR(255),
  username VARCHAR(255) NOT NULL UNIQUE, -- for login
  password VARCHAR(255) NOT NULL,        -- hashed password
  role ENUM('branch', 'admin') DEFAULT 'branch',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Insert test user (password: test123)
INSERT INTO users (username, email, password, role) VALUES 
('test', 'test@example.com', '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial service types
INSERT INTO service_types (name, description) VALUES 
('Standard Delivery', 'Regular delivery service with standard handling'),
('Express Delivery', 'Fast delivery service with priority handling'),
('Bulk Delivery', 'Delivery service for large or multiple items'),
('Special Handling', 'Delivery service for fragile or special items')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial staff data
INSERT INTO staff (user_id, name, photo_url, empl_no, id_no, role) VALUES 
(1, 'John Doe', 'https://randomuser.me/api/portraits/men/1.jpg', 'EMP001', '12345678', 'Senior Developer'),
(1, 'Jane Smith', 'https://randomuser.me/api/portraits/women/1.jpg', 'EMP002', '23456789', 'Project Manager'),
(1, 'Mike Johnson', 'https://randomuser.me/api/portraits/men/2.jpg', 'EMP003', '34567890', 'UI Designer'),
(1, 'Sarah Williams', 'https://randomuser.me/api/portraits/women/2.jpg', 'EMP004', '45678901', 'QA Engineer')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial roles
INSERT INTO roles (name, description) VALUES 
('Senior Developer', 'Senior software developer position'),
('Project Manager', 'Project management position'),
('UI Designer', 'User interface design position'),
('QA Engineer', 'Quality assurance position'),
('Security Guard', 'Security personnel position'),
('Supervisor', 'Team supervisor position')
ON DUPLICATE KEY UPDATE id=id; 