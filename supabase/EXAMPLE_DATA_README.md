# Example User Data Tables

This directory contains seed data for testing the application with realistic user-created tables.

## Overview

The `99999999999999_seed_example_user_data.sql` migration creates example data tables that simulate what a typical user might create in their workspace. **These are NOT system/config tables** - they represent application data.

## Tables Included

### 1. **customers** (10 records)
CRM-style customer/contact management table with:
- Contact information (name, email, phone)
- Company and job title
- Status tracking (active, inactive, lead, prospect)
- Lifetime value metrics
- Notes field

**Use Cases:**
- Test List blocks with customer data
- Create customer detail pages
- Filter by status or company
- Sort by lifetime value

### 2. **projects** (8 records)
Project tracking with budget and timeline management:
- Project details and descriptions
- Links to customers via foreign key
- Status workflow (planning → in_progress → completed)
- Budget vs actual cost tracking
- Start/due dates
- Priority levels

**Use Cases:**
- Test project dashboards
- Create Gantt charts or timeline views
- Track budget utilization
- Filter by status/priority

### 3. **tasks** (20 records)
Detailed task management linked to projects:
- Task descriptions
- Project associations (foreign key)
- Status tracking (todo → in_progress → review → done)
- Assignment tracking
- Estimated vs actual hours
- Due dates and priority

**Use Cases:**
- Test task boards / kanban views
- Time tracking reports
- Filter by assigned user or status
- Create task detail pages

### 4. **orders** (10 records)
E-commerce/order fulfillment tracking:
- Order numbers and customer links
- Order status workflow
- Payment tracking (amount, method, status)
- Shipping information and tracking
- Tax and shipping calculations
- Timestamps for key events

**Use Cases:**
- Test order management dashboards
- Create fulfillment workflows
- Track payment status
- Generate revenue reports

## Bonus Features

### Views
Two helpful aggregation views are included:

1. **customer_summary**
   - Aggregates customer data with order and project counts
   - Total spent per customer
   - Last order date
   - Perfect for dashboard KPIs

2. **project_progress**
   - Project completion percentages
   - Budget utilization tracking
   - Task completion metrics
   - Hour tracking (estimated vs actual)

### Indexes
Performance indexes on commonly queried columns:
- Foreign keys (customer_id, project_id)
- Status fields
- Date fields
- Email and order numbers

## Data Relationships

```
customers (1) ──→ (many) projects
customers (1) ──→ (many) orders
projects (1) ──→ (many) tasks
```

## Applying the Seed Data

### Option 1: Reset Database (Recommended for clean slate)
```bash
pnpm db:reset
```
This will drop all tables and reapply all migrations including the seed data.

### Option 2: Apply Migration Only
```bash
pnpm db:migrate
```
This will apply any pending migrations including the seed data.

### Option 3: Manual Application
```bash
psql $POSTGRES_URL -f supabase/migrations/99999999999999_seed_example_user_data.sql
```

## Testing Scenarios

### 1. Customer Relationship Management
- Create a customer list page with filtering by status
- Build a customer detail page showing their projects and orders
- Add a "Customer Value" dashboard with the customer_summary view

### 2. Project Management Dashboard
- Use the project_progress view for project metrics
- Create a project timeline with start/due dates
- Build a task board filtered by project
- Track budget utilization across projects

### 3. Order Processing
- Create an order fulfillment dashboard
- Filter orders by status and payment_status
- Generate revenue reports by customer
- Track shipping status

### 4. Reporting and Analytics
- Revenue by customer
- Project profitability (budget vs actual)
- Task completion rates
- Time tracking efficiency (estimated vs actual hours)

## Modifying the Data

To add more records or customize the data:

1. Edit `99999999999999_seed_example_user_data.sql`
2. Run `pnpm db:reset` to reapply
3. Or manually run the modified SQL

## Data Quality

All data is:
- ✅ Realistic and production-like
- ✅ Properly normalized with foreign keys
- ✅ Includes various states (active, completed, pending, etc.)
- ✅ Has meaningful relationships
- ✅ Includes edge cases (cancelled orders, completed projects, blocked tasks)
- ✅ Properly indexed for performance
- ✅ Documented with comments

## Notes

- The migration number `99999999999999` ensures it runs last
- All tables use UUIDs for primary keys (matches modern best practices)
- Foreign keys use `ON DELETE` rules for data integrity
- Timestamps use `TIMESTAMPTZ` for timezone awareness
- Status fields use CHECK constraints for data validation
- All monetary values use `DECIMAL(10, 2)` for precision
