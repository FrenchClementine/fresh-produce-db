# Trade Opportunities Page Redesign Plan

## Current State Analysis
The current trade opportunities page shows basic information but lacks key logistical details and has cluttered pricing information. We need to enhance it with better transport visibility, cleaner pricing display, and improved agent/customer filtering.

## Key Requirements

### 1. Transport & Logistics Display
- **Show transporter being used** - Display which transport company/method is handling delivery
- **Display delivery hub** - Show the destination hub where goods are delivered
- **Handle no-transport scenarios** - For local/direct deliveries, show origin and destination clearly
- **Transport band quantities** - Display the quantity ranges/bands for transport pricing

### 2. Simplified Pricing Display
- **Sales price only** - Show only the final sales price (e.g., €11.70) to customer
- **Remove cost breakdown** - Hide internal cost calculations from this view
- **Clean margin display** - Keep margin but make it less prominent

### 3. Enhanced Agent & Customer Management
- **Customer agent visibility** - Clearly show which agent manages each customer
- **Agent-based filtering** - Filter opportunities by assigned agent
- **Agent's customer sorting** - Sort/group opportunities by agent's customers
- **Agent workload view** - Show how many opportunities each agent is managing

### 4. Feedback System
- **Feedback input field** - Space to add/edit customer feedback on quotes
- **Feedback status indicators** - Visual indicators for opportunities with feedback
- **Feedback history** - Track feedback over time for each opportunity

## Database Schema Requirements

### New/Updated Fields Needed
```sql
-- Opportunities table additions
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS customer_feedback TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS feedback_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS feedback_status VARCHAR(20) DEFAULT 'none'; -- none, pending, received, addressed

-- Transport information (may already exist)
-- selected_transporter_id, delivery_hub_id, transport_band_id should be available
```

### Key Relationships to Query
- `opportunities -> customers -> agents` (for customer agent)
- `opportunities -> transport_bands` (for quantity bands)
- `opportunities -> hubs` (for delivery location)
- `opportunities -> transporters` (for transport company)

## UI/UX Improvements

### 1. Table Column Restructure
**New Column Layout:**
1. **Customer** (with agent indicator)
2. **Product** (simplified badges)
3. **Sales Price** (clean, prominent display)
4. **Transport & Delivery** (new combined column)
5. **Status & Priority** (combined)
6. **Agent** (customer's assigned agent)
7. **Feedback** (status + quick input)
8. **Valid Until** (with expiry warnings)
9. **Actions** (streamlined)

### 2. Transport & Delivery Column Details
```
┌─────────────────────────────────┐
│ Transport & Delivery            │
├─────────────────────────────────┤
│ 🚛 DHL Express                 │
│ 📍 Amsterdam Hub                │
│ 📦 10-50 units                  │
│ ⏱️ 3-5 days                     │
└─────────────────────────────────┘

For no transport:
┌─────────────────────────────────┐
│ Transport & Delivery            │
├─────────────────────────────────┤
│ 🏭 Direct from Barcelona        │
│ 📍 To Thessaloniki             │
│ 🚚 Customer pickup             │
└─────────────────────────────────┘
```

### 3. Enhanced Filtering System
- **Agent filter** - Filter by customer's agent (not opportunity assigned agent)
- **Transport type filter** - Filter by transport method (direct, courier, freight, etc.)
- **Customer location filter** - Filter by customer's region/country
- **Feedback status filter** - Filter by feedback received/pending/none

### 4. Feedback Integration
- **Inline feedback button** - Quick access to add/view feedback
- **Feedback modal** - Detailed feedback form with date tracking
- **Visual indicators** - Icons showing feedback status in the table

## Technical Implementation Plan

### Phase 1: Database Updates
1. Add feedback columns to opportunities table
2. Verify transport and hub relationship queries
3. Create views for agent-customer-opportunity relationships

### Phase 2: Backend API Updates
1. Update opportunities query to include:
   - Customer agent information
   - Transport company and hub details
   - Transport band quantity information
   - Feedback status and content
2. Create feedback CRUD operations
3. Add new filtering options to API

### Phase 3: Frontend Components
1. **Transport Display Component**
   ```typescript
   interface TransportDisplayProps {
     transporter?: string
     deliveryHub?: string
     transportBand?: string
     directRoute?: boolean
     origin?: string
     destination?: string
   }
   ```

2. **Feedback Component**
   ```typescript
   interface FeedbackProps {
     opportunityId: string
     currentFeedback?: string
     feedbackDate?: Date
     status: 'none' | 'pending' | 'received' | 'addressed'
     onUpdate: (feedback: string) => void
   }
   ```

3. **Enhanced Filters Component**
   - Agent selector (customer agents)
   - Transport type selector
   - Feedback status selector
   - Customer location selector

### Phase 4: Table Redesign
1. Restructure columns as outlined above
2. Implement new transport display logic
3. Add feedback inline editing
4. Simplify pricing display (sales price only)
5. Enhance agent information display

## Data Flow for Key Features

### Transport Information Display
```
opportunity.selected_transporter_id -> transporters.name
opportunity.delivery_hub_id -> hubs.name
opportunity.transport_band_id -> transport_bands.quantity_range
```

### Customer Agent Display
```
opportunity.customer_id -> customers.agent_id -> staff.name
```

### Feedback System
```
User Input -> opportunity.customer_feedback
            -> opportunity.feedback_date = now()
            -> opportunity.feedback_status = 'received'
```

## Agent-Customer Filtering Logic

### Group by Agent's Customers
```sql
SELECT
  o.*,
  c.name as customer_name,
  s.name as customer_agent_name,
  s.id as customer_agent_id
FROM opportunities o
JOIN customers c ON o.customer_id = c.id
JOIN staff s ON c.agent_id = s.id
WHERE s.id = ? -- filter by specific agent
ORDER BY s.name, c.name, o.created_at DESC
```

### Agent Workload Summary
```sql
SELECT
  s.name as agent_name,
  COUNT(o.id) as total_opportunities,
  COUNT(CASE WHEN o.is_active = true THEN 1 END) as active_opportunities
FROM staff s
JOIN customers c ON s.id = c.agent_id
JOIN opportunities o ON c.id = o.customer_id
GROUP BY s.id, s.name
ORDER BY active_opportunities DESC
```

## Success Metrics
1. **Clearer logistics visibility** - Users can immediately see transport and delivery details
2. **Simplified pricing** - Focus on sales price improves clarity
3. **Better agent management** - Easy filtering and sorting by customer agents
4. **Feedback integration** - Streamlined feedback collection and tracking
5. **Improved efficiency** - Faster opportunity management and decision making

## Next Steps
1. Review and approve this plan
2. Verify database schema and relationships
3. Begin with Phase 1 (Database Updates)
4. Create mockups for new table layout
5. Implement changes incrementally with testing at each phase