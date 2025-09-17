# Customer Management System Implementation Plan

> **Database Schema Extension Plan**
> Similar to supplier system but focused on customer requirements

## Overview

Adding customer management system that mirrors the supplier structure with key differences:
- Customers require products (vs suppliers provide products)
- Tracking when customers need local vs import production
- Agent assignment for customer relationship management
- Certification requirements (what customers demand from suppliers)

---

## Database Schema Changes

### 1. New Tables to Create

#### `staff` Table
```sql
CREATE TABLE "public"."staff" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "phone_number" TEXT,
    "role" TEXT, -- e.g., "Account Manager", "Sales Representative"
    "department" TEXT, -- e.g., "Sales", "Customer Service"
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

#### `customers` Table
```sql
CREATE TABLE "public"."customers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "phone_number" TEXT,
    "address" TEXT,
    "warehouse_address" TEXT,
    "city" TEXT,
    "zip_code" TEXT,
    "country" TEXT,
    "delivery_modes" delivery_mode_enum[] DEFAULT '{}',
    "agent_id" UUID REFERENCES staff(id), -- Key difference: assigned agent
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

#### `customer_product_packaging_spec` Table
```sql
CREATE TABLE "public"."customer_product_packaging_spec" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    "product_packaging_spec_id" UUID NOT NULL REFERENCES product_packaging_specs(id),
    "notes" TEXT,
    "season" season_enum,
    "available_months" month_enum[],
    -- Key difference: separate local vs import periods
    "local_production_from_date" DATE,
    "local_production_till_date" DATE,
    "import_period_from_date" DATE,
    "import_period_till_date" DATE,
    "recurring_local_start_month" month_enum,
    "recurring_local_start_day" INTEGER,
    "recurring_local_end_month" month_enum,
    "recurring_local_end_day" INTEGER,
    "recurring_import_start_month" month_enum,
    "recurring_import_start_day" INTEGER,
    "recurring_import_end_month" month_enum,
    "recurring_import_end_day" INTEGER,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(customer_id, product_packaging_spec_id)
);
```

#### `customer_certifications` Table
```sql
CREATE TABLE "public"."customer_certifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    "certification_id" UUID NOT NULL REFERENCES certifications(id),
    "is_required" BOOLEAN DEFAULT true NOT NULL, -- Key difference: requirement flag
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(customer_id, certification_id)
);
```

#### `customer_logistics_capabilities` Table
```sql
CREATE TABLE "public"."customer_logistics_capabilities" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    "mode" delivery_mode_enum NOT NULL,
    "origin_hub_id" UUID NOT NULL REFERENCES hubs(id),
    "destination_hub_id" UUID REFERENCES hubs(id),
    "typical_lead_time_days" INTEGER,
    "fixed_operational_days" day_of_week_enum[],
    "preferred_delivery_time" TEXT, -- New field for customer preferences
    "special_requirements" TEXT, -- New field for special needs
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### 2. Helper Functions to Create

- `get_customer_current_production_mode()` - Determine if customer needs local or import for given date
- `find_customers_by_certification_requirements()` - Find customers requiring specific certifications
- `get_customer_hub_capabilities()` - Get customer logistics preferences by hub

---

## Frontend Changes Required

### 1. New Pages to Create

#### `/customers` Page
- **List View**: Similar to suppliers page with customer grid
- **Columns**: Name, Agent, City, Country, Active Status, Actions
- **Features**: Search, filter by agent, country, active status
- **Actions**: View, Edit, Delete, Add New

#### `/customers/[id]` Page
- **Customer Details**: Contact info, agent assignment, notes
- **Product Requirements**: List of required products with seasonality
- **Certification Requirements**: Required certifications from suppliers
- **Logistics Preferences**: Hub delivery/pickup preferences
- **Edit**: Inline editing or modal forms

#### `/staff` Page
- **Staff Management**: List of internal agents/staff
- **Columns**: Name, Role, Department, Customer Count, Active Status
- **Features**: Add/edit staff members, assign customers

### 2. Components to Create

#### Forms (`components/forms/`)
- `AddCustomerForm.tsx` - New customer creation form
- `EditCustomerForm.tsx` - Customer editing form
- `CustomerProductSpecForm.tsx` - Product requirements with seasonality
- `CustomerCertificationForm.tsx` - Certification requirements
- `CustomerLogisticsForm.tsx` - Hub preferences
- `AddStaffForm.tsx` - Staff member creation
- `EditStaffForm.tsx` - Staff member editing

#### Data Tables (`components/`)
- `CustomersTable.tsx` - Customer list with actions
- `CustomerProductSpecsTable.tsx` - Product requirements table
- `CustomerCertificationsTable.tsx` - Certification requirements table
- `CustomerLogisticsTable.tsx` - Logistics preferences table
- `StaffTable.tsx` - Staff members list

### 3. Data Hooks to Create (`hooks/`)

#### Customer Hooks
- `use-customers.ts` - Customer CRUD operations
- `use-customer-product-specs.ts` - Product requirements management
- `use-customer-certifications.ts` - Certification requirements
- `use-customer-logistics.ts` - Logistics preferences

#### Staff Hooks
- `use-staff.ts` - Staff member CRUD operations

#### Query Hooks
- `use-customer-production-mode.ts` - Get current production mode (local/import)
- `use-customers-by-certifications.ts` - Find customers by cert requirements
- `use-customer-hub-capabilities.ts` - Hub-based customer search

### 4. Navigation Updates

#### Sidebar Navigation
Add new menu items:
- "Customers" (with customer icon)
- "Staff" (with user icon)

#### Breadcrumbs
Update breadcrumb component to handle customer routes:
- `/customers` → "Customers"
- `/customers/[id]` → "Customers > [Customer Name]"
- `/staff` → "Staff"

### 5. Key Features to Implement

#### Customer Management
- **Agent Assignment**: Dropdown to assign staff members
- **Seasonality Tracking**: Separate date pickers for local vs import periods
- **Certification Requirements**: Multi-select with requirement flags
- **Hub Preferences**: Multiple hub selections with delivery preferences

#### Seasonal Dashboard
- **Production Mode Indicator**: Show current local/import status
- **Upcoming Transitions**: Alert for switching between local/import
- **Agent Workload**: Display customer count per agent

#### Integration Points
- **Supplier Matching**: Match suppliers to customer requirements
- **Certification Compliance**: Check if suppliers meet customer cert requirements
- **Hub Route Planning**: Integrate with transporter system for logistics

---

## Implementation Order

1. **Database First**: Create all tables and functions
2. **Staff Management**: Implement staff CRUD (simpler, no dependencies)
3. **Basic Customer CRUD**: Core customer management
4. **Product Requirements**: Customer product specs with seasonality
5. **Certifications**: Customer certification requirements
6. **Logistics**: Hub preferences and capabilities
7. **Integration**: Connect with supplier/transporter systems

---

## File Structure

```
src/
├── app/
│   ├── customers/
│   │   ├── page.tsx (customer list)
│   │   └── [id]/
│   │       └── page.tsx (customer details)
│   └── staff/
│       └── page.tsx (staff management)
├── components/
│   ├── forms/
│   │   ├── AddCustomerForm.tsx
│   │   ├── EditCustomerForm.tsx
│   │   ├── CustomerProductSpecForm.tsx
│   │   ├── CustomerCertificationForm.tsx
│   │   ├── CustomerLogisticsForm.tsx
│   │   ├── AddStaffForm.tsx
│   │   └── EditStaffForm.tsx
│   ├── CustomersTable.tsx
│   ├── CustomerProductSpecsTable.tsx
│   ├── CustomerCertificationsTable.tsx
│   ├── CustomerLogisticsTable.tsx
│   └── StaffTable.tsx
└── hooks/
    ├── use-customers.ts
    ├── use-customer-product-specs.ts
    ├── use-customer-certifications.ts
    ├── use-customer-logistics.ts
    ├── use-staff.ts
    ├── use-customer-production-mode.ts
    ├── use-customers-by-certifications.ts
    └── use-customer-hub-capabilities.ts
```

---

## Key Differences from Supplier System

1. **Agent Assignment**: Customers have assigned internal staff members
2. **Requirement vs Supply**: Customers require products vs suppliers provide them
3. **Seasonality Focus**: Emphasis on when customers need local vs import production
4. **Certification Direction**: Customers require certifications FROM suppliers
5. **Logistics Preference**: Customer delivery preferences vs supplier capabilities
6. **Production Mode Tracking**: Real-time local/import status based on dates

This system will provide complete customer lifecycle management while maintaining consistency with the existing supplier architecture.