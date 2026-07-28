-- Sakura Laundry Management System
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS sakura_laundry;
USE sakura_laundry;

-- --------------------------------------------------------
-- 1. USERS (STAFF) TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed passwords
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default Admin user (Password is 'admin123' hashed with bcrypt)
INSERT INTO users (name, role, username, password) 
VALUES ('System Admin', 'Admin', 'admin', '$2y$10$XlhUrmEgi9wZZ86Jnm0pKOuWQa3X2.UFsZTDm1TivFENsZW8yu5fK');

-- --------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 3. INVENTORY TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0,
    max_capacity INT DEFAULT 100,
    unit VARCHAR(50) DEFAULT 'units',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 4. ORDERS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'received',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
