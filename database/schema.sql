CREATE DATABASE reimbursement_system;
USE reimbursement_system;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'manager', 'employee'),
    manager_id INT,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2),
    category VARCHAR(100),
    description TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE approval_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    is_sequential BOOLEAN,
    min_approval_percentage INT
);
CREATE TABLE approvers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT,
    user_id INT,
    sequence_order INT,
    FOREIGN KEY (rule_id) REFERENCES approval_rules(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE expense_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT,
    approver_id INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    comment TEXT,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);
