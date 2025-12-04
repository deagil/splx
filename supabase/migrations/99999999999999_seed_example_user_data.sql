-- Example User Data Tables for Testing
-- These represent realistic tables a user might create in their workspace
-- This is NOT system/config data - it's example application data

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
-- Typical CRM customer/contact management
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead', 'prospect')),
    lifetime_value DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample customer data
INSERT INTO customers (first_name, last_name, email, phone, company, job_title, status, lifetime_value, notes) VALUES
('Sarah', 'Johnson', 'sarah.j@techcorp.com', '+1-555-0101', 'TechCorp Inc', 'CTO', 'active', 125000.00, 'Key decision maker, prefers email communication'),
('Michael', 'Chen', 'mchen@innovate.io', '+1-555-0102', 'Innovate Solutions', 'Product Manager', 'active', 85000.00, 'Interested in enterprise plan'),
('Emma', 'Rodriguez', 'emma.r@startupco.com', '+1-555-0103', 'StartupCo', 'CEO', 'active', 45000.00, 'Fast-growing startup, budget conscious'),
('James', 'Williams', 'james.w@global.net', '+1-555-0104', 'Global Networks', 'Engineering Lead', 'prospect', 0.00, 'Evaluating multiple vendors'),
('Lisa', 'Anderson', 'l.anderson@designstudio.com', '+1-555-0105', 'Design Studio Pro', 'Creative Director', 'lead', 0.00, 'Met at conference, interested in design tools'),
('David', 'Kumar', 'dkumar@datatech.com', '+1-555-0106', 'DataTech Analytics', 'Data Scientist', 'active', 67000.00, 'Heavy API user, needs documentation'),
('Maria', 'Garcia', 'maria@cloudservices.io', '+1-555-0107', 'Cloud Services Ltd', 'VP Operations', 'active', 156000.00, 'Enterprise customer, annual contract'),
('Robert', 'Taylor', 'rtaylor@consulting.com', '+1-555-0108', 'Taylor Consulting', 'Independent Consultant', 'inactive', 12000.00, 'Contract ended, potential renewal'),
('Jennifer', 'Lee', 'jlee@fintech.com', '+1-555-0109', 'FinTech Solutions', 'Head of Engineering', 'active', 98000.00, 'Security-focused, quarterly reviews'),
('Alex', 'Martinez', 'alex@agency.co', '+1-555-0110', 'Digital Agency Co', 'Founder', 'active', 43000.00, 'Uses platform for client projects');

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
-- Project/work tracking system
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    budget DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample project data
INSERT INTO projects (name, description, customer_id, status, priority, budget, actual_cost, start_date, due_date) VALUES
('Website Redesign', 'Complete overhaul of corporate website with modern design', (SELECT id FROM customers WHERE email = 'sarah.j@techcorp.com'), 'in_progress', 'high', 75000.00, 42000.00, '2024-11-01', '2025-01-31'),
('API Integration', 'Integrate third-party payment processing API', (SELECT id FROM customers WHERE email = 'mchen@innovate.io'), 'in_progress', 'urgent', 35000.00, 28000.00, '2024-12-01', '2024-12-31'),
('Mobile App Development', 'iOS and Android native apps', (SELECT id FROM customers WHERE email = 'emma.r@startupco.com'), 'planning', 'high', 150000.00, 0.00, '2025-01-15', '2025-06-30'),
('Data Migration', 'Migrate legacy database to cloud infrastructure', (SELECT id FROM customers WHERE email = 'dkumar@datatech.com'), 'completed', 'medium', 45000.00, 43500.00, '2024-09-01', '2024-11-15'),
('Security Audit', 'Comprehensive security review and penetration testing', (SELECT id FROM customers WHERE email = 'jlee@fintech.com'), 'in_progress', 'urgent', 25000.00, 15000.00, '2024-11-15', '2024-12-15'),
('Marketing Campaign', 'Q1 2025 digital marketing campaign', (SELECT id FROM customers WHERE email = 'alex@agency.co'), 'planning', 'medium', 30000.00, 0.00, '2025-01-01', '2025-03-31'),
('Infrastructure Upgrade', 'Server and network infrastructure improvements', (SELECT id FROM customers WHERE email = 'maria@cloudservices.io'), 'on_hold', 'low', 85000.00, 12000.00, '2024-10-01', '2025-02-28'),
('Training Program', 'Employee onboarding and training materials', (SELECT id FROM customers WHERE email = 'l.anderson@designstudio.com'), 'completed', 'low', 15000.00, 14200.00, '2024-08-01', '2024-10-31');

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Task management for projects
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to TEXT,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2) DEFAULT 0,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample task data
INSERT INTO tasks (title, description, project_id, status, priority, assigned_to, estimated_hours, actual_hours, due_date) VALUES
-- Website Redesign tasks
('Design homepage mockup', 'Create initial homepage design concepts', (SELECT id FROM projects WHERE name = 'Website Redesign'), 'done', 'high', 'Sarah Designer', 16.0, 14.5, '2024-11-10'),
('Implement responsive navigation', 'Build mobile-friendly navigation menu', (SELECT id FROM projects WHERE name = 'Website Redesign'), 'in_progress', 'high', 'Mike Developer', 12.0, 8.0, '2024-12-05'),
('Set up CDN', 'Configure content delivery network for assets', (SELECT id FROM projects WHERE name = 'Website Redesign'), 'todo', 'medium', 'DevOps Team', 6.0, 0.0, '2024-12-20'),
('User acceptance testing', 'Conduct UAT with client stakeholders', (SELECT id FROM projects WHERE name = 'Website Redesign'), 'todo', 'high', 'QA Team', 20.0, 0.0, '2025-01-20'),

-- API Integration tasks
('API authentication setup', 'Implement OAuth2 flow for payment API', (SELECT id FROM projects WHERE name = 'API Integration'), 'done', 'urgent', 'Alex Backend', 8.0, 9.5, '2024-12-05'),
('Payment processing logic', 'Build payment processing workflows', (SELECT id FROM projects WHERE name = 'API Integration'), 'in_progress', 'urgent', 'Alex Backend', 16.0, 12.0, '2024-12-15'),
('Error handling and logging', 'Implement comprehensive error tracking', (SELECT id FROM projects WHERE name = 'API Integration'), 'in_progress', 'high', 'Alex Backend', 10.0, 4.0, '2024-12-20'),
('Integration testing', 'Test payment flows end-to-end', (SELECT id FROM projects WHERE name = 'API Integration'), 'todo', 'urgent', 'QA Team', 12.0, 0.0, '2024-12-28'),

-- Mobile App Development tasks
('Define app architecture', 'Plan app structure and technology stack', (SELECT id FROM projects WHERE name = 'Mobile App Development'), 'in_progress', 'high', 'Tech Lead', 20.0, 12.0, '2025-01-25'),
('Design UI/UX flows', 'Create user interface designs for key screens', (SELECT id FROM projects WHERE name = 'Mobile App Development'), 'todo', 'high', 'UI Designer', 40.0, 0.0, '2025-02-15'),
('Set up development environment', 'Configure build tools and CI/CD', (SELECT id FROM projects WHERE name = 'Mobile App Development'), 'todo', 'medium', 'DevOps Team', 16.0, 0.0, '2025-01-20'),

-- Security Audit tasks
('Vulnerability scanning', 'Run automated security scans', (SELECT id FROM projects WHERE name = 'Security Audit'), 'done', 'urgent', 'Security Team', 8.0, 7.5, '2024-11-20'),
('Penetration testing', 'Manual security testing of critical systems', (SELECT id FROM projects WHERE name = 'Security Audit'), 'in_progress', 'urgent', 'Security Team', 24.0, 16.0, '2024-12-10'),
('Security report preparation', 'Compile findings and recommendations', (SELECT id FROM projects WHERE name = 'Security Audit'), 'todo', 'high', 'Security Lead', 12.0, 0.0, '2024-12-13'),

-- Data Migration tasks
('Export legacy data', 'Extract data from old system', (SELECT id FROM projects WHERE name = 'Data Migration'), 'done', 'medium', 'Data Engineer', 20.0, 22.0, '2024-09-15'),
('Transform and clean data', 'Normalize and validate data', (SELECT id FROM projects WHERE name = 'Data Migration'), 'done', 'medium', 'Data Engineer', 30.0, 35.0, '2024-10-15'),
('Import to new system', 'Load data into cloud database', (SELECT id FROM projects WHERE name = 'Data Migration'), 'done', 'high', 'Data Engineer', 16.0, 18.0, '2024-11-01'),
('Validation and testing', 'Verify data integrity and completeness', (SELECT id FROM projects WHERE name = 'Data Migration'), 'done', 'high', 'QA Team', 12.0, 11.5, '2024-11-10');

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
-- E-commerce/order tracking
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_address TEXT,
    notes TEXT,
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample order data
INSERT INTO orders (order_number, customer_id, status, total_amount, tax_amount, shipping_amount, payment_method, payment_status, shipping_address, notes, ordered_at, shipped_at, delivered_at) VALUES
('ORD-2024-001', (SELECT id FROM customers WHERE email = 'sarah.j@techcorp.com'), 'delivered', 2499.00, 199.92, 0.00, 'Credit Card', 'paid', '123 Tech Street, San Francisco, CA 94105', 'Express delivery requested', '2024-10-15 10:30:00', '2024-10-16 09:00:00', '2024-10-18 14:22:00'),
('ORD-2024-002', (SELECT id FROM customers WHERE email = 'mchen@innovate.io'), 'delivered', 1899.00, 151.92, 25.00, 'PayPal', 'paid', '456 Innovation Ave, Austin, TX 78701', NULL, '2024-10-20 14:15:00', '2024-10-21 11:30:00', '2024-10-24 16:45:00'),
('ORD-2024-003', (SELECT id FROM customers WHERE email = 'emma.r@startupco.com'), 'shipped', 899.00, 71.92, 15.00, 'Credit Card', 'paid', '789 Startup Blvd, Boulder, CO 80301', 'Gift wrap requested', '2024-11-05 09:20:00', '2024-11-08 08:15:00', NULL),
('ORD-2024-004', (SELECT id FROM customers WHERE email = 'dkumar@datatech.com'), 'processing', 3299.00, 263.92, 0.00, 'Wire Transfer', 'paid', '321 Data Drive, Seattle, WA 98101', 'Bulk order - educational discount applied', '2024-11-12 11:45:00', NULL, NULL),
('ORD-2024-005', (SELECT id FROM customers WHERE email = 'maria@cloudservices.io'), 'delivered', 5499.00, 439.92, 0.00, 'Invoice', 'paid', '654 Cloud Lane, New York, NY 10001', 'Enterprise order - annual contract', '2024-09-01 08:00:00', '2024-09-02 10:00:00', '2024-09-05 15:30:00'),
('ORD-2024-006', (SELECT id FROM customers WHERE email = 'alex@agency.co'), 'confirmed', 1299.00, 103.92, 20.00, 'Credit Card', 'paid', '987 Agency Road, Los Angeles, CA 90001', NULL, '2024-11-25 16:30:00', NULL, NULL),
('ORD-2024-007', (SELECT id FROM customers WHERE email = 'jlee@fintech.com'), 'pending', 4199.00, 335.92, 0.00, 'Purchase Order', 'pending', '147 Finance St, Boston, MA 02101', 'PO #FT-2024-567 - awaiting approval', '2024-11-28 13:20:00', NULL, NULL),
('ORD-2024-008', (SELECT id FROM customers WHERE email = 'l.anderson@designstudio.com'), 'delivered', 799.00, 63.92, 12.00, 'Credit Card', 'paid', '258 Design Plaza, Portland, OR 97201', NULL, '2024-10-08 12:00:00', '2024-10-09 14:30:00', '2024-10-11 10:15:00'),
('ORD-2024-009', (SELECT id FROM customers WHERE email = 'rtaylor@consulting.com'), 'cancelled', 1599.00, 127.92, 18.00, 'Credit Card', 'refunded', '369 Consulting Way, Chicago, IL 60601', 'Customer requested cancellation - full refund issued', '2024-11-01 10:15:00', NULL, NULL),
('ORD-2024-010', (SELECT id FROM customers WHERE email = 'jlee@fintech.com'), 'shipped', 2899.00, 231.92, 0.00, 'Wire Transfer', 'paid', '147 Finance St, Boston, MA 02101', 'Expedited shipping', '2024-11-20 09:00:00', '2024-11-22 07:45:00', NULL);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- Customer summary with order statistics
CREATE OR REPLACE VIEW customer_summary AS
SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.company,
    c.status,
    c.lifetime_value,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    COUNT(DISTINCT p.id) as total_projects,
    MAX(o.ordered_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN projects p ON c.id = p.customer_id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.company, c.status, c.lifetime_value;

-- Project progress view
CREATE OR REPLACE VIEW project_progress AS
SELECT
    p.id,
    p.name,
    p.status,
    p.priority,
    p.budget,
    p.actual_cost,
    ROUND((p.actual_cost / NULLIF(p.budget, 0) * 100)::numeric, 2) as budget_used_percentage,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    ROUND((COUNT(CASE WHEN t.status = 'done' THEN 1 END)::numeric / NULLIF(COUNT(t.id), 0) * 100), 2) as completion_percentage,
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    c.company as customer_company
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN customers c ON p.customer_id = c.id
GROUP BY p.id, p.name, p.status, p.priority, p.budget, p.actual_cost, c.company;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE customers IS 'Customer and contact management table';
COMMENT ON TABLE projects IS 'Project tracking with budget and timeline management';
COMMENT ON TABLE tasks IS 'Task management linked to projects';
COMMENT ON TABLE orders IS 'E-commerce order tracking and fulfillment';

COMMENT ON VIEW customer_summary IS 'Aggregated customer data with order and project statistics';
COMMENT ON VIEW project_progress IS 'Project completion and budget tracking metrics';
