# Trade Opportunities System - Rebuild Plan

## Overview
Rework the trade potential and opportunities system with a clear workflow:

**Trade Potential Page** → Shows ALL matching trades, what's missing, what's possible, and what's already been converted to opportunities
**↓**
**Create Opportunities** → Convert viable potentials into opportunities with pricing for agents to quote
**↓**
**Opportunities Page** → Agent-focused view of what they need to quote to customers

## Current State Analysis

### Existing System
- **Trade Potential**: Shows all possible customer-supplier-product combinations
- **Status Tracking**: Complete, missing price, missing transport, missing both
- **Gap Analysis**: Identifies what's missing for each potential trade
- **No persistence**: Opportunities are not stored separately

## Proposed System Architecture

### 1. Trade Potential Page (Reworked)
**Purpose**: Master view of ALL possible trade combinations - what's missing, what's possible, and current opportunity status

#### Key Features:
- Display all customer-supplier-product combinations
- Clear status indicators:
  - ✅ **Ready** (has price + transport)
  - 💰 **Missing Price**
  - 🚚 **Missing Transport**
  - ❌ **Missing Both**
  - 🎯 **Is Opportunity** (already converted to opportunity)
- **Opportunity Status Column**: Shows if this potential is already an opportunity and its status
- **Opportunity Pricing**: Shows the offer price if it's an opportunity (when active)
- Filtering and search capabilities
- Filter to show/hide already converted opportunities

#### What Each Row Shows:
- Customer & Supplier names
- Product details
- Completeness status (ready/missing data)
- **Opportunity indicator**: Badge if already an opportunity + status
- **Offer price**: If it's an active opportunity, show the quoted price
- Supplier cost (if available)
- Transport cost (if available)
- Estimated total cost

#### Actions:
- **"Create Opportunity"** button for viable potentials (not already opportunities)
- **"View Opportunity"** link for existing opportunities
- Quick add missing price/transport data

### 2. New Opportunities Table

#### Database Schema:
```sql
CREATE TABLE opportunities (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core Relationships
  customer_id UUID NOT NULL REFERENCES customers(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_packaging_spec_id UUID NOT NULL REFERENCES product_packaging_specs(id),

  -- Selected Options
  selected_supplier_id UUID REFERENCES suppliers(id), -- Can be different from supplier_id for multi-supplier scenarios
  selected_transporter_id UUID REFERENCES transporters(id),
  selected_route_id UUID REFERENCES transporter_routes(id),

  -- Pricing Information (snapshot at creation)
  supplier_price_id UUID REFERENCES supplier_prices(id),
  supplier_price_per_unit NUMERIC(10,4),
  transport_cost_per_pallet NUMERIC(10,2),
  estimated_total_cost NUMERIC(10,2), -- Auto-calculated from supplier + transport costs

  -- Quote/Offer Information
  offer_price_per_unit NUMERIC(10,4), -- Price we want to offer to customer
  offer_currency TEXT DEFAULT 'EUR',
  quote_sent_date TIMESTAMPTZ,
  quote_feedback TEXT, -- Customer feedback on our quote

  -- Validity and Lifecycle
  valid_till DATE, -- When this opportunity expires
  is_active BOOLEAN DEFAULT TRUE, -- Active/Inactive toggle

  -- Status Management
  status TEXT CHECK (status IN ('draft', 'active', 'negotiating', 'offered', 'confirmed', 'cancelled', 'completed')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Notes and Communication
  internal_notes TEXT,
  customer_requirements TEXT,
  supplier_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES staff(id),
  assigned_to UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Conversion Tracking
  converted_to_order BOOLEAN DEFAULT FALSE,
  order_reference TEXT,

  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_opportunity UNIQUE (customer_id, supplier_id, product_packaging_spec_id, is_active)
  WHERE is_active = TRUE
);

-- Indexes for performance
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX idx_opportunities_supplier ON opportunities(supplier_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_opportunities_valid_till ON opportunities(valid_till) WHERE valid_till IS NOT NULL;
```

### 3. Opportunity Creation Workflow

#### From Trade Potential:
1. **View All Potential**: User sees complete list of customer-supplier-product combinations
2. **Identify Viable Trades**: Look for ✅ Ready status (has price + transport)
3. **Check Opportunity Status**: See if already converted (🎯 badge) or available to convert
4. **Create Opportunity**: Click "Create Opportunity" button
5. **Set Pricing**: Modal opens with:
   - Pre-filled customer, supplier, product info
   - **Estimated Cost**: Auto-calculated from supplier price + transport cost (read-only)
   - **Offer Price**: **Key field** - set the price you want to quote to customer
   - Supplier selection (if multiple available)
   - Transporter selection (showing available routes)
   - Internal notes
   - Valid until date
   - Assigned agent
6. **Creates opportunity** and returns to potential list showing new 🎯 status

### 4. Opportunities Page
**Purpose**: Agent-focused view of opportunities they need to quote to customers

#### List View Features:
- **Agent Filter**: Agents can filter to "My Opportunities" or see all
- **Active/Inactive toggle**: Only shows active opportunities by default
- Status-based tabs (Draft, Active, Negotiating, Offered, etc.)
- Filters:
  - By customer
  - By supplier
  - By product category
  - By assigned agent
  - By date range
  - By priority
  - By validity (expired, expiring soon)
- Sorting options
- Bulk actions (Mark inactive, Set expiry dates)

#### What Each Opportunity Shows:
- **Customer name** (who to quote)
- **Product details** (what to quote)
- **Offer Price** (the price to quote) - **Most important field**
- **Status badge** (Draft, Active, Offered, etc.)
- **Estimated Cost** (your cost basis)
- **Margin** (offer price - estimated cost)
- **Valid Until** date (with expiry warnings)
- **Assigned agent**
- Quick actions: Edit price, Mark as offered, Add feedback, Mark inactive

### 5. Opportunity Detail Page

#### Sections:
1. **Header**
   - Status, Priority badges
   - Quick actions (Edit, Convert to Order, Cancel)
   - Assigned agent info

2. **Trade Details**
   - Customer information
   - Supplier information
   - Product specifications
   - Packaging details

3. **Pricing & Logistics**
   - **Estimated Cost**: Supplier price + transport cost breakdown
   - **Offer Price**: Price being offered to customer
   - **Margin Analysis**: Difference between offer price and estimated cost
   - Selected supplier and transporter details

4. **Timeline & Activity**
   - Creation date
   - Status changes
   - Quote sent date
   - **Quote Feedback**: Customer's response to our quote
   - Notes history
   - Communication log

5. **Actions Panel**
   - Update status (including "Offered" status)
   - **Mark Active/Inactive**
   - Update offer price
   - **Add quote feedback**
   - Set/update valid until date
   - Reassign agent
   - Add notes
   - Convert to order

## Implementation Phases

### Phase 1: Database Setup
1. Create opportunities table
2. Add necessary indexes
3. Create views for reporting

### Phase 2: Backend API
1. Create opportunity CRUD operations
2. Add conversion endpoint (potential → opportunity)
3. Create opportunity hooks
4. Add status transition logic

### Phase 3: Trade Potential Rework
1. Enhance current trade potential view
2. Add "Mark as Opportunity" action
3. Implement bulk selection
4. Add opportunity creation modal

### Phase 4: Opportunities Management
1. Build opportunities list page
2. Create opportunity detail page
3. Implement filters and search
4. Add status management

### Phase 5: Enhancements
1. Email notifications for status changes
2. Dashboard widgets for opportunity metrics
3. Export functionality
4. Reporting features

## Key System Behaviors

### Active vs Inactive Opportunities
- **Active Opportunities**:
  - Shown in opportunities list by default
  - Counted in metrics and dashboards
  - Can be converted to orders
  - Appear in agent workloads

- **Inactive Opportunities**:
  - Hidden from opportunities list (unless specifically filtered to show)
  - **Still visible in trade potential** - this is key behavior you requested
  - Not counted in active metrics
  - Preserved for historical reference
  - Can be reactivated if needed

### Trade Potential Impact
- **All potentials always show** on trade potential page - this is the master view
- **When converted to opportunity**: Potential row shows 🎯 badge + opportunity status + offer price (if active)
- **When opportunity marked inactive**: Disappears from opportunities page but potential row still shows the inactive opportunity status
- This gives you complete visibility: see all possibilities + know what's already being worked on

## Benefits of This Approach

### Workflow Clarity:
1. **Trade Potential = Discovery**: See ALL matching trades, gaps, and current opportunity status
2. **Opportunities = Action**: Agent-focused view of what needs to be quoted with pricing
3. **Complete Visibility**: Know what's possible vs what's being pursued

### Key Features:
4. **Quote Management**: Track offer prices and customer feedback on quotes
5. **Price Visibility**: See offer prices on potential page when opportunities are active
6. **Lifecycle Management**: Active/inactive toggle with validity dates
7. **Agent Focus**: Agents see exactly what they need to quote to which customers
8. **Historical Tracking**: Inactive opportunities preserved but hidden from active work

## Success Metrics

- Number of potentials converted to opportunities
- Opportunity conversion rate to orders
- Average time from opportunity to order
- Opportunity value tracking
- Agent performance metrics

## Next Steps

1. Review and approve the plan
2. Create database migration
3. Build API endpoints
4. Implement UI components
5. Test and iterate

## Questions to Consider

1. Should opportunities have expiration dates?
2. Do we need approval workflows for certain opportunity values?
3. Should we track competitor information in opportunities?
4. How should we handle multi-product opportunities?
5. What notifications should be triggered at each status change?