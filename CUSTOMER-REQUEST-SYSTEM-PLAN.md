# Customer Request Tracking System - Implementation Plan

## Executive Summary

This plan outlines a **Customer Request Tracking System** - the inverse of the Trade Potential system. While Trade Potential shows "what suppliers can offer to which customers," this system tracks "what customers are requesting that we need to find suppliers for."

**Key Difference:**
- **Trade Potential**: Supplier → Customer matching (supply-driven)
- **Customer Requests**: Customer → Supplier matching (demand-driven)

---

## Current State Analysis

### What We Have Now

1. **Trade Potential System** (`/trade/potential`)
   - Shows all possible customer-supplier-product combinations
   - Filters: complete, missing_price, missing_transport, missing_both
   - Generates matrix from existing customer specs + supplier capabilities
   - Read-only discovery tool

2. **Opportunities System** (`/trade/opportunity`)
   - Active sales pipeline management
   - Status tracking (draft → active → offered → confirmed)
   - Price change detection
   - Created FROM trade potential matches

3. **Customer Product Specs** (`customer_product_packaging_spec`)
   - Customer requirements already in system
   - Product specs they've agreed to buy
   - Pre-defined, structured requirements

### What's Missing

**No system for ad-hoc customer requests:**
- Customer calls: "I need 10 pallets of organic tomatoes, 500g packs"
- Email request: "Can you source red peppers for next week?"
- Market opportunity: "Client wants to trial new product line"
- Seasonal requests: "Need strawberries for summer season"
- Urgent requests: "Competitor failed, need replacement supplier ASAP"

**Problems:**
- These requests get lost in emails/notes
- No structured tracking of what customers actually want
- Can't systematically search for suppliers to fulfill requests
- No request → opportunity conversion workflow
- No historical record of unfulfilled requests

---

## System Overview

### Customer Request Lifecycle

```
Customer Request → Supplier Search → Match Found → Create Opportunity → Quote → Order
       ↓                                  ↓
   Unfulfilled                      Not Available Yet
```

### Core Concept

**A logged, tracked record of customer product requests that:**
1. Captures what customer wants (product, specs, quantity, timing)
2. Tracks search efforts to fulfill the request
3. Shows matching suppliers (if available)
4. Highlights gaps (no suppliers, no transport, no pricing)
5. Converts to opportunities when matches found
6. Maintains history of unfulfilled requests for future matching

---

## Database Schema Design

### New Table: `customer_product_requests`

```sql
CREATE TABLE customer_product_requests (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer Information
  customer_id UUID NOT NULL REFERENCES customers(id),
  requested_by_contact TEXT, -- Contact person at customer
  requested_by_email TEXT,
  requested_by_phone TEXT,

  -- Product Request Details
  product_id UUID REFERENCES products(id), -- If specific product known
  product_description TEXT NOT NULL, -- Free text description
  product_category TEXT, -- e.g., 'tomatoes', 'peppers'

  -- Specification Requirements
  packaging_type TEXT, -- 'carton', 'crate', 'bag', etc.
  size_requirement TEXT, -- '500g', '1kg', 'large', etc.
  quality_grade TEXT, -- 'Class I', 'Class II', 'Premium'
  certification_requirements TEXT[], -- ['organic', 'GlobalGAP', 'GRASP']

  -- Product spec link (if matches existing spec)
  product_packaging_spec_id UUID REFERENCES product_packaging_specs(id),

  -- Quantity & Timing
  requested_quantity_pallets INTEGER,
  requested_quantity_units INTEGER,
  requested_unit TEXT, -- 'kg', 'boxes', 'pieces'

  delivery_needed_by DATE,
  delivery_frequency TEXT, -- 'one-time', 'weekly', 'monthly', 'seasonal'
  contract_duration_months INTEGER, -- For ongoing requests

  -- Pricing Expectations
  target_price_per_unit DECIMAL(10,2),
  target_currency TEXT DEFAULT 'EUR',
  price_flexibility TEXT, -- 'firm', 'negotiable', 'market-based'
  max_budget DECIMAL(12,2),

  -- Origin & Logistics
  preferred_origin_countries TEXT[], -- ['ES', 'IT', 'NL']
  excluded_origin_countries TEXT[], -- Countries customer won't accept
  delivery_location_id UUID REFERENCES logistics_hubs(id),
  delivery_address TEXT,
  delivery_terms TEXT, -- 'Ex Works', 'Delivered', 'FOB'

  -- Request Status
  status TEXT NOT NULL DEFAULT 'new',
    -- 'new': Just logged
    -- 'searching': Actively looking for suppliers
    -- 'matched': Supplier(s) found
    -- 'quoted': Quote sent to customer
    -- 'opportunity_created': Converted to opportunity
    -- 'fulfilled': Completed successfully
    -- 'unfulfilled': Could not fulfill
    -- 'cancelled': Customer cancelled request
    -- 'expired': Deadline passed

  urgency TEXT DEFAULT 'medium',
    -- 'low': Future planning
    -- 'medium': Normal timeline
    -- 'high': Urgent but manageable
    -- 'critical': Emergency/competitor failure

  -- Matching & Fulfillment
  potential_suppliers_found INTEGER DEFAULT 0,
  opportunities_created INTEGER DEFAULT 0,
  best_match_opportunity_id UUID REFERENCES opportunities(id),

  -- Search tracking
  search_attempts INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP,
  search_notes TEXT,

  -- Customer context
  request_source TEXT, -- 'phone', 'email', 'meeting', 'tender', 'rfq'
  request_context TEXT, -- Why they need it
  internal_notes TEXT,
  customer_notes TEXT, -- Notes to share with customer

  -- Metadata
  created_by UUID REFERENCES staff(id),
  assigned_to UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Fulfillment tracking
  fulfilled_at TIMESTAMP,
  unfulfilled_reason TEXT,
  competitor_fulfilled BOOLEAN DEFAULT false,

  -- Follow-up
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN (
    'new', 'searching', 'matched', 'quoted',
    'opportunity_created', 'fulfilled', 'unfulfilled',
    'cancelled', 'expired'
  )),
  CONSTRAINT valid_urgency CHECK (urgency IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes
CREATE INDEX idx_customer_requests_customer ON customer_product_requests(customer_id);
CREATE INDEX idx_customer_requests_status ON customer_product_requests(status);
CREATE INDEX idx_customer_requests_urgency ON customer_product_requests(urgency);
CREATE INDEX idx_customer_requests_delivery_date ON customer_product_requests(delivery_needed_by);
CREATE INDEX idx_customer_requests_assigned ON customer_product_requests(assigned_to);
CREATE INDEX idx_customer_requests_created_at ON customer_product_requests(created_at DESC);
```

### Supporting Table: `request_supplier_matches`

Track which suppliers we've checked for each request:

```sql
CREATE TABLE request_supplier_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES customer_product_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- Match status
  match_status TEXT NOT NULL,
    -- 'potential': Could potentially supply
    -- 'confirmed': Can supply, has pricing
    -- 'contacted': Reached out to supplier
    -- 'quoted': Supplier provided quote
    -- 'declined': Supplier can't/won't supply
    -- 'not_available': Product not in their catalog

  -- Match quality
  match_score INTEGER, -- 0-100
  match_notes TEXT,

  -- Pricing if available
  supplier_price_id UUID REFERENCES supplier_prices(id),
  quoted_price DECIMAL(10,2),
  quoted_currency TEXT,
  lead_time_days INTEGER,

  -- Communication tracking
  contacted_at TIMESTAMP,
  contacted_by UUID REFERENCES staff(id),
  response_received_at TIMESTAMP,
  supplier_response TEXT,

  -- Logistics check
  has_transport BOOLEAN,
  transport_route_id UUID REFERENCES transporter_routes(id),
  transport_cost_per_unit DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(request_id, supplier_id)
);

CREATE INDEX idx_request_matches_request ON request_supplier_matches(request_id);
CREATE INDEX idx_request_matches_supplier ON request_supplier_matches(supplier_id);
CREATE INDEX idx_request_matches_status ON request_supplier_matches(match_status);
```

### Supporting Table: `request_activity_log`

Audit trail of all actions taken on a request:

```sql
CREATE TABLE request_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES customer_product_requests(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL,
    -- 'created', 'status_changed', 'supplier_searched',
    -- 'supplier_contacted', 'quote_received', 'opportunity_created',
    -- 'note_added', 'assigned', 'updated'

  activity_description TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,

  performed_by UUID REFERENCES staff(id),
  performed_at TIMESTAMP DEFAULT now(),

  metadata JSONB -- Additional context
);

CREATE INDEX idx_request_activity_request ON request_activity_log(request_id);
CREATE INDEX idx_request_activity_date ON request_activity_log(performed_at DESC);
```

---

## Use Cases & User Stories

### 1. Sales Rep Logs Customer Request

**Scenario:** Customer calls asking for organic tomatoes

**Flow:**
1. Sales rep opens "Customer Requests" page
2. Clicks "Log New Request"
3. Fills form:
   - Customer: [Select from dropdown]
   - Product: "Organic Cherry Tomatoes"
   - Packaging: "250g punnets"
   - Quantity: "20 pallets per week"
   - Start date: "Next month"
   - Duration: "3 months contract"
   - Certifications: "Organic, GlobalGAP"
   - Delivery: "Amsterdam hub"
   - Target price: "€2.50/kg"
4. System saves request with status: "new"
5. Request appears in team queue

### 2. Trader Searches for Suppliers

**Scenario:** Fulfill the tomato request

**Flow:**
1. Trader opens request detail page
2. Clicks "Search for Suppliers"
3. System runs intelligent search:
   ```sql
   -- Find suppliers who:
   -- 1. Have this product (or similar)
   -- 2. Have required certifications
   -- 3. Can deliver to required location
   -- 4. Have pricing in acceptable range
   ```
4. Shows match results:
   - **Perfect Match (3)**: Has exact product, pricing, logistics
   - **Good Match (5)**: Has product, needs pricing/logistics check
   - **Partial Match (8)**: Similar product, may need adjustment
   - **No Match (0)**: Can't fulfill
5. Trader reviews matches, updates status to "matched"

### 3. Converting Request to Opportunity

**Scenario:** Found supplier, ready to quote customer

**Flow:**
1. Trader selects best supplier match
2. Clicks "Create Opportunity from Request"
3. Pre-populated opportunity form:
   - Customer: [from request]
   - Supplier: [selected match]
   - Product: [from request or matched spec]
   - Pricing: [from supplier]
   - Transport: [auto-calculated]
4. Adds markup, creates quote
5. Request status → "opportunity_created"
6. Link maintained: request → opportunity

### 4. Unfulfilled Request Tracking

**Scenario:** No suppliers available for exotic fruit

**Flow:**
1. Trader searches, finds no matches
2. Marks request as "unfulfilled"
3. Adds reason: "No suppliers carry dragon fruit"
4. Sets follow-up reminder: 30 days
5. System:
   - Notifies customer account manager
   - Flags request for supplier development team
   - Monitors for new suppliers/products
   - Auto-suggests if match appears later

### 5. Seasonal Request Planning

**Scenario:** Customer wants strawberries for summer

**Flow:**
1. Sales rep logs request in January
2. Delivery needed: June
3. Status: "new" → "searching" (March)
4. System suggests:
   - Suppliers with strawberry history
   - Seasonal pricing trends
   - Last year's successful matches
5. Trader monitors, creates opportunity in April
6. Strawberries sourced, fulfilled in June

### 6. Urgent Competitive Replacement

**Scenario:** Customer's current supplier failed

**Flow:**
1. Request logged with urgency: "critical"
2. Delivery needed: 48 hours
3. System immediately:
   - Alerts all traders
   - Shows emergency dashboard
   - Prioritizes in queue
4. Trader finds supplier with stock
5. Fast-track to opportunity
6. Same-day quote sent
7. Request fulfilled within deadline

### 7. Historical Request Analysis

**Scenario:** Quarterly review

**Manager views:**
- Total requests: 147
- Fulfilled: 98 (67%)
- Unfulfilled: 31 (21%)
- Cancelled: 18 (12%)
- Average time to fulfill: 4.2 days
- Top unfulfilled categories: [exotic fruits, specialty organics]
- Supplier gaps identified: Need more berry suppliers
- Action: Target supplier recruitment

---

## Page Structure & UI

### Page 1: Customer Requests Dashboard

**Route:** `/trade/requests` or `/customers/requests`

**Sections:**

1. **Summary Cards**
   - Total Open Requests
   - New This Week
   - Urgent/Critical
   - Fulfillment Rate %

2. **Request Queue Table**
   - Columns:
     - Customer | Product | Qty | Delivery Date | Status | Urgency | Assigned To | Age | Actions
   - Filters:
     - Status (new, searching, matched, etc.)
     - Urgency (critical, high, medium, low)
     - Assigned To
     - Date Range
     - Customer
   - Sort:
     - Urgency + Delivery Date (default)
     - Created Date
     - Customer Name
   - Actions:
     - View Details
     - Search Suppliers
     - Create Opportunity
     - Mark Unfulfilled

3. **Quick Actions**
   - Log New Request
   - Bulk Import (CSV)
   - Export Report

### Page 2: Request Detail Page

**Route:** `/trade/requests/[id]`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ REQUEST #12345                    [Edit] [Create Opp]   │
│ Status: SEARCHING      Urgency: HIGH      Age: 3 days   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CUSTOMER INFORMATION                                    │
│  ┌─────────────────────────────────────────────┐        │
│  │ Fresh Market Ltd                            │        │
│  │ Amsterdam, Netherlands                      │        │
│  │ Contact: John Smith (j.smith@fresh.com)    │        │
│  │ Account Manager: Sarah Jones                │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  PRODUCT REQUEST                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │ Product: Organic Cherry Tomatoes            │        │
│  │ Packaging: 250g punnets, carton             │        │
│  │ Quality: Class I                            │        │
│  │ Certifications: Organic, GlobalGAP          │        │
│  │ Quantity: 20 pallets/week                   │        │
│  │ Duration: 3 months (12 weeks)               │        │
│  │ Total: ~240 pallets                         │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  DELIVERY & LOGISTICS                                    │
│  ┌─────────────────────────────────────────────┐        │
│  │ Needed By: 2025-02-01                       │        │
│  │ Delivery Hub: Amsterdam Central             │        │
│  │ Terms: Delivered                            │        │
│  │ Preferred Origin: ES, IT, NL                │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  PRICING EXPECTATIONS                                    │
│  ┌─────────────────────────────────────────────┐        │
│  │ Target Price: €2.50/kg                      │        │
│  │ Flexibility: Negotiable (±10%)              │        │
│  │ Max Budget: €15,000/week                    │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SUPPLIER MATCHES                 [Search Suppliers]     │
│  ┌─────────────────────────────────────────────┐        │
│  │ ✅ Perfect Match (2)                         │        │
│  │ ├─ Spanish Organic Farms      Score: 95     │        │
│  │ │  Has pricing, logistics ready             │        │
│  │ │  [Create Opportunity]                     │        │
│  │ └─ Dutch Fresh Produce        Score: 92     │        │
│  │    Has pricing, logistics ready             │        │
│  │    [Create Opportunity]                     │        │
│  │                                              │        │
│  │ ⚠️ Good Match (3)                            │        │
│  │ ├─ Italian Growers Co.        Score: 78     │        │
│  │ │  Has product, need pricing check          │        │
│  │ │  [Contact Supplier]                       │        │
│  │ ...                                          │        │
│  │                                              │        │
│  │ ℹ️ Partial Match (5)                         │        │
│  │ └─ (Collapsed by default)                   │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ACTIVITY LOG                                            │
│  ┌─────────────────────────────────────────────┐        │
│  │ Jan 15, 14:32 - Sarah Jones created request │        │
│  │ Jan 15, 15:45 - System searched 47 suppliers│        │
│  │ Jan 15, 15:45 - Found 10 potential matches  │        │
│  │ Jan 16, 09:12 - Mike assigned to request    │        │
│  │ Jan 16, 10:30 - Contacted Spanish Organic   │        │
│  │ Jan 16, 14:20 - Quote received from Spanish │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  NOTES & CONTEXT                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │ Internal Notes:                              │        │
│  │ Customer's current supplier had quality     │        │
│  │ issues. This is a test order for potential  │        │
│  │ long-term contract. Price is critical.      │        │
│  │                                              │        │
│  │ [Add Note]                                  │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Page 3: Log New Request Form

**Route:** `/trade/requests/new`

**Form Sections:**

1. **Customer Selection**
   - Searchable dropdown
   - Shows recent customers
   - Quick-add new contact

2. **Product Information**
   - Free text description (always required)
   - Optional: Link to existing product
   - Optional: Link to existing product_packaging_spec
   - Category dropdown
   - Certifications multi-select

3. **Specifications**
   - Packaging type
   - Size/weight
   - Quality grade
   - Special requirements (textarea)

4. **Quantity & Timing**
   - Quantity fields (pallets/units)
   - Delivery date picker
   - Frequency (one-time/recurring)
   - Contract duration

5. **Logistics**
   - Delivery location (hub selector)
   - Alternative address
   - Preferred origins (country multi-select)
   - Excluded origins
   - Delivery terms

6. **Pricing**
   - Target price
   - Currency
   - Flexibility indicator
   - Max budget

7. **Context & Priority**
   - Request source (dropdown)
   - Urgency (dropdown)
   - Context/background (textarea)
   - Internal notes (textarea)
   - Assign to (staff selector)

8. **Actions**
   - Save & Search Suppliers (primary)
   - Save as Draft
   - Cancel

---

## Matching Algorithm

### Intelligent Supplier Search

When "Search for Suppliers" is clicked:

```typescript
async function findSuppliersForRequest(requestId: string) {
  const request = await getRequest(requestId)

  // 1. Exact product match
  const exactMatches = await findSuppliersWithExactProduct(
    request.product_packaging_spec_id
  )

  // 2. Similar product match
  const similarMatches = await findSuppliersWithSimilarProduct({
    category: request.product_category,
    packaging: request.packaging_type,
    size: request.size_requirement,
  })

  // 3. Certification filter
  const certifiedSuppliers = await filterByCertifications(
    [...exactMatches, ...similarMatches],
    request.certification_requirements
  )

  // 4. Logistics check
  const withLogistics = await checkLogisticsAvailability(
    certifiedSuppliers,
    request.delivery_location_id,
    request.delivery_terms
  )

  // 5. Pricing filter
  const inBudget = await filterByPricing(
    withLogistics,
    request.target_price_per_unit,
    request.price_flexibility,
    request.max_budget
  )

  // 6. Origin filter
  const originMatched = await filterByOrigin(
    inBudget,
    request.preferred_origin_countries,
    request.excluded_origin_countries
  )

  // 7. Score and rank
  const scored = await scoreMatches(originMatched, request)

  // 8. Save results
  await saveMatchResults(requestId, scored)

  return scored
}

function scoreMatches(suppliers, request) {
  return suppliers.map(supplier => {
    let score = 0

    // Exact product match: +40
    if (supplier.has_exact_product) score += 40

    // Has current pricing: +20
    if (supplier.has_active_pricing) score += 20

    // Logistics available: +20
    if (supplier.has_transport_route) score += 20

    // Price in range: +10
    if (supplier.price_within_target) score += 10

    // Has certifications: +5
    if (supplier.has_required_certs) score += 5

    // Preferred origin: +5
    if (request.preferred_origins.includes(supplier.country)) score += 5

    return {
      supplier,
      score,
      match_quality: score >= 85 ? 'perfect' : score >= 65 ? 'good' : 'partial'
    }
  }).sort((a, b) => b.score - a.score)
}
```

---

## Integration Points

### 1. Trade Potential Integration

**Bi-directional relationship:**

```typescript
// When trade potential is complete, check for matching requests
async function checkPendingRequests(tradePotential: TradePotential) {
  if (tradePotential.status !== 'complete') return

  const matchingRequests = await findRequestsMatching({
    customer_id: tradePotential.customer.id,
    product_category: tradePotential.product.category,
    status: ['new', 'searching']
  })

  if (matchingRequests.length > 0) {
    // Notify trader: "This trade potential matches 3 open customer requests!"
    notifyTrader(matchingRequests)
  }
}

// When request is created, check trade potential
async function checkTradeMatches(request: CustomerRequest) {
  const potentials = await getTradePotential({
    customer_id: request.customer_id,
    status: 'complete'
  })

  const matches = potentials.filter(p =>
    matchesRequestCriteria(p, request)
  )

  if (matches.length > 0) {
    // Auto-populate supplier matches
    await addMatchesToRequest(request.id, matches)
  }
}
```

### 2. Opportunity Creation Flow

```typescript
async function createOpportunityFromRequest(
  requestId: string,
  supplierId: string
) {
  const request = await getRequest(requestId)
  const match = await getSupplierMatch(requestId, supplierId)

  const opportunity = await createOpportunity({
    customer_id: request.customer_id,
    supplier_id: supplierId,
    product_packaging_spec_id: request.product_packaging_spec_id,

    // Pre-populate from request
    offer_price_per_unit: calculateOfferPrice(
      match.supplier_price,
      request.target_price_per_unit
    ),
    customer_requirements: request.product_description,
    internal_notes: `Created from request #${request.id}`,

    // Pre-populate logistics if available
    selected_transport_route_id: match.transport_route_id,

    priority: urgencyToPriority(request.urgency),
    assigned_to: request.assigned_to,
  })

  // Link back to request
  await updateRequest(requestId, {
    status: 'opportunity_created',
    opportunities_created: request.opportunities_created + 1,
    best_match_opportunity_id: opportunity.id
  })

  // Log activity
  await logActivity({
    request_id: requestId,
    activity_type: 'opportunity_created',
    activity_description: `Opportunity #${opportunity.id} created with ${supplierName}`,
    metadata: { opportunity_id: opportunity.id }
  })

  return opportunity
}
```

### 3. Unfulfilled Request Monitoring

```typescript
// Daily job: Check for new supplier matches
async function checkUnfulfilledRequests() {
  const unfulfilled = await getRequests({
    status: 'unfulfilled',
    follow_up_date: { lte: today() }
  })

  for (const request of unfulfilled) {
    // Re-run supplier search
    const newMatches = await findSuppliersForRequest(request.id)

    if (newMatches.length > 0) {
      // Found new suppliers!
      await updateRequest(request.id, {
        status: 'matched',
        potential_suppliers_found: newMatches.length
      })

      await notifyAssignedTrader(request, newMatches)
    }
  }
}

// When new supplier added to system
async function checkAgainstRequests(supplierId: string) {
  const supplier = await getSupplier(supplierId)
  const products = await getSupplierProducts(supplierId)

  const matchingRequests = await findRequestsForProducts(
    products.map(p => p.category)
  )

  for (const request of matchingRequests) {
    await scoreSupplierForRequest(request.id, supplierId)
    // Auto-notify if high score
  }
}
```

---

## Reports & Analytics

### Dashboard Metrics

1. **Request Funnel**
   ```
   New Requests (50)
     → Searching (23)
       → Matched (15)
         → Quoted (8)
           → Opportunity Created (5)
             → Fulfilled (3)
   ```

2. **Fulfillment Performance**
   - Fulfillment rate: 67%
   - Average time to match: 1.8 days
   - Average time to fulfill: 4.2 days
   - SLA compliance: 89%

3. **Request Sources**
   - Email: 45%
   - Phone: 32%
   - Meeting: 15%
   - Tender/RFQ: 8%

4. **Urgency Distribution**
   - Critical: 5
   - High: 18
   - Medium: 42
   - Low: 12

5. **Top Unfulfilled Categories**
   - Exotic fruits: 12 requests
   - Specialty organics: 8 requests
   - Large volumes: 5 requests

6. **Supplier Gap Analysis**
   - Need more: Berry suppliers (15 requests unfulfilled)
   - Need better: Eastern Europe logistics
   - Opportunity: Organic certifications (high demand)

### Standard Reports

1. **Open Requests Report**
   - All active/searching requests
   - Grouped by urgency
   - Assigned trader
   - Days open

2. **Unfulfilled Requests Report**
   - What we couldn't deliver
   - Reasons for unfulfillment
   - Patterns/trends
   - Supplier development priorities

3. **Fulfillment by Customer**
   - Request success rate per customer
   - Average response time
   - Customer satisfaction proxy

4. **Trader Performance**
   - Requests assigned
   - Fulfillment rate
   - Average time to fulfill
   - Opportunities created

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Database schema
- [ ] Basic CRUD for requests
- [ ] Simple request list page
- [ ] Log new request form
- [ ] Request detail page
- [ ] Basic status tracking

### Phase 2: Matching (Week 3-4)
- [ ] Supplier search algorithm
- [ ] Match scoring system
- [ ] Display supplier matches
- [ ] Manual match creation
- [ ] request_supplier_matches table

### Phase 3: Workflow (Week 5-6)
- [ ] Create opportunity from request
- [ ] Status transitions
- [ ] Activity logging
- [ ] Notifications/assignments
- [ ] Follow-up reminders

### Phase 4: Intelligence (Week 7-8)
- [ ] Auto-matching with trade potential
- [ ] Unfulfilled request monitoring
- [ ] New supplier auto-matching
- [ ] Bulk import
- [ ] Advanced filters

### Phase 5: Analytics (Week 9-10)
- [ ] Dashboard metrics
- [ ] Standard reports
- [ ] Export functionality
- [ ] Performance tracking
- [ ] Supplier gap analysis

---

## Technical Implementation Notes

### React Hooks Structure

```typescript
// src/hooks/use-customer-requests.ts
export function useCustomerRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: ['customer-requests', filters],
    queryFn: () => fetchCustomerRequests(filters)
  })
}

export function useCustomerRequest(id: string) {
  return useQuery({
    queryKey: ['customer-request', id],
    queryFn: () => fetchCustomerRequest(id)
  })
}

export function useCreateCustomerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomerRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-requests'] })
    }
  })
}

export function useSearchSuppliersForRequest(requestId: string) {
  return useMutation({
    mutationFn: () => searchSuppliers(requestId),
    onSuccess: (matches) => {
      // Update request with match count
      // Invalidate queries
    }
  })
}

export function useCreateOpportunityFromRequest() {
  return useMutation({
    mutationFn: ({ requestId, supplierId }) =>
      createOpportunityFromRequest(requestId, supplierId)
  })
}
```

### Component Structure

```
src/
  app/
    trade/
      requests/
        page.tsx                    # Dashboard
        [id]/
          page.tsx                  # Request detail
        new/
          page.tsx                  # Log new request
  components/
    requests/
      request-list.tsx              # Table component
      request-filters.tsx           # Filter panel
      request-card.tsx              # Summary card
      supplier-match-list.tsx       # Match results
      create-request-form.tsx       # Form
      request-activity-log.tsx      # Activity feed
  hooks/
    use-customer-requests.ts
    use-request-matches.ts
    use-request-activity.ts
  types/
    customer-requests.ts
```

---

## Key Differences from Trade Potential

| Aspect | Trade Potential | Customer Requests |
|--------|----------------|-------------------|
| **Direction** | Supply → Demand | Demand → Supply |
| **Trigger** | System-generated matrix | User-logged request |
| **Data Source** | Existing specs in DB | Ad-hoc customer needs |
| **Purpose** | Discover opportunities | Fulfill specific requests |
| **Action** | Convert to opportunity | Search & match suppliers |
| **Lifecycle** | Static discovery | Active tracking workflow |
| **Completeness** | Shows all combinations | Shows request status |
| **Updates** | Regenerated on data change | Manually progressed |
| **Success Metric** | Completion % | Fulfillment rate |

---

## Success Metrics

### Key Performance Indicators

1. **Request Volume**
   - Target: 50-100 requests/month
   - Growth: 15% month-over-month

2. **Fulfillment Rate**
   - Target: 75% requests fulfilled
   - Benchmark: Industry 60-70%

3. **Time to Match**
   - Target: <2 days average
   - Critical requests: <4 hours

4. **Conversion Rate**
   - Request → Opportunity: 65%
   - Request → Order: 45%

5. **Customer Satisfaction**
   - Response time: <24 hours
   - Request updates: Daily
   - Feedback score: 4.5/5

### Business Impact

- **Revenue**: Track requests → opportunities → orders
- **Customer retention**: Fulfill rate correlation
- **Market intelligence**: What customers want vs. what we have
- **Supplier strategy**: Gap analysis drives recruitment
- **Competitive advantage**: Faster response than competitors

---

## Next Steps

1. **Review & Approve** this plan with stakeholders
2. **Database Migration**: Create tables and indexes
3. **Type Definitions**: Define TypeScript interfaces
4. **API Layer**: Build Supabase queries
5. **UI Components**: Build reusable components
6. **Integration Testing**: Ensure smooth workflow
7. **User Training**: Train sales and trading teams
8. **Pilot Launch**: Start with one team/region
9. **Iterate**: Gather feedback, improve
10. **Full Rollout**: Deploy to all users

---

## Appendix: Example Request Lifecycle

**Day 0: Request Logged**
```
Customer: Fresh Market Ltd
Product: Organic Cherry Tomatoes, 250g punnets
Quantity: 20 pallets/week for 12 weeks
Delivery: Amsterdam, by Feb 1
Target Price: €2.50/kg
Status: NEW → SEARCHING
Assigned: Mike (Trader)
```

**Day 0: Auto-Search**
```
System searches 47 suppliers
Found: 2 perfect, 3 good, 5 partial matches
Status: MATCHED
Notification sent to Mike
```

**Day 1: Review Matches**
```
Mike reviews:
- Spanish Organic Farms: Has product, €2.40/kg, logistics ready
- Dutch Fresh Produce: Has product, €2.55/kg, logistics ready
Action: Contact both for availability confirmation
```

**Day 2: Supplier Confirmation**
```
Spanish Organic confirms availability
Dutch Fresh needs 3-day lead time
Mike creates opportunity with Spanish Organic
Status: OPPORTUNITY_CREATED
```

**Day 3: Quote Sent**
```
Opportunity quote sent to customer
Offer price: €2.75/kg (10% markup)
Waiting for customer response
```

**Day 5: Customer Accepts**
```
Customer accepts quote
Opportunity → Order conversion
Request status: FULFILLED
Total cycle time: 5 days
```

**Outcome:**
- ✅ Request fulfilled successfully
- ✅ New supplier relationship established
- ✅ Customer need met on time
- ✅ Revenue generated
- 📊 Added to fulfillment metrics

---

*End of Plan*
