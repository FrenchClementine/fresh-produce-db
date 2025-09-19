# Trade Opportunities Page - Implementation Plan

> **Goal**: Create a dashboard showing staff members their customers and matching trade opportunities with current pricing

---

## 🎯 **Page Overview**

The **Trade Opportunities** page (at `/trade/trader`) will serve as a centralized dashboard for staff to:

1. **View assigned customers** and their product requirements
2. **See matching suppliers** with current pricing for customer needs
3. **Calculate complete pricing** (supplier cost + transport + margin)
4. **Identify trade opportunities** where we can connect customers with suppliers
5. **Track opportunity status** and follow-up actions

---

## 📊 **Data Architecture**

### **Core Data Sources**

1. **Customer Requirements** (`customer_product_packaging_spec`)
   - Products each customer needs
   - Seasonal availability windows
   - Specification requirements

2. **Customer Logistics** (`customer_logistics_capabilities`)
   - Loading/delivery hubs
   - Preferred delivery modes
   - Lead time requirements

3. **Current Supplier Pricing** (`current_supplier_prices` view)
   - Active pricing for all products
   - Supplier capabilities by hub
   - Valid pricing periods

4. **Staff Assignments** (`customers.agent_id` → `staff`)
   - Which team member manages each customer
   - Customer portfolio per staff member

5. **Transport Routes** (`transporter_routes` + `transporter_route_price_bands`)
   - Hub-to-hub transport costs
   - Delivery timeframes
   - Pallet pricing tiers

### **Opportunity Calculation Logic**

For each **Customer-Product combination**:

```sql
-- Simplified query structure
SELECT
  customers.name,
  customers.agent_id,
  customer_products.product_name,
  supplier_prices.supplier_name,
  supplier_prices.price_per_unit,
  transport_costs.cost_per_unit,
  (supplier_prices.price_per_unit + transport_costs.cost_per_unit + margin) as total_price
FROM customer_product_packaging_spec customer_products
JOIN customers ON customer_products.customer_id = customers.id
JOIN current_supplier_prices supplier_prices ON customer_products.product_packaging_spec_id = supplier_prices.product_packaging_spec_id
LEFT JOIN transport_route_costs transport_costs ON (supplier_hub → customer_hub)
WHERE customers.is_active = true
  AND supplier_prices.is_active = true
  AND transport_costs.is_available = true (or delivery_mode = 'Ex Works')
```

---

## 🎨 **UI/UX Design**

### **Page Layout Structure**

```
┌─────────────────────────────────────────────────────────────┐
│                     Trade Opportunities                     │
│         Discover and manage customer-supplier matches        │
├─────────────────────────────────────────────────────────────┤
│  📊 Stats Cards                                             │
│  [🎯 Active Opportunities] [👥 My Customers] [💰 Avg Margin] [🚚 Routes Available] │
├─────────────────────────────────────────────────────────────┤
│  🔍 Filters & Controls                                       │
│  [👤 Staff: All/Me] [🏢 Customer] [📦 Product] [🌍 Region] [⭐ Priority] │
├─────────────────────────────────────────────────────────────┤
│  📋 Opportunities Table                                      │
│  Customer | Agent | Product Needed | Best Supplier | Price | Actions │
│  ---------|-------|----------------|---------------|-------|---------|
│  Tesco UK | John  | Tomatoes S     | Farm Co €2.50 | €3.20 | [Quote] │
│  Carref FR| Mary  | Lettuce M      | Green Ltd €1.80| €2.45 | [Call]  │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### **Opportunity Detail View (Modal/Drawer)**

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Trade Opportunity Details                               │
├─────────────────────────────────────────────────────────────┤
│  👥 Customer: Tesco UK (Leeds)        👤 Agent: John Smith   │
│  📦 Product: Cherry Tomatoes, Size M, 5kg boxes             │
│  🚚 Delivery: Ex Works → Leeds Hub (3 days)                │
├─────────────────────────────────────────────────────────────┤
│  💰 Pricing Breakdown:                                      │
│  Supplier Price:    €2.50 /unit                            │
│  Transport Cost:    €0.35 /unit                            │
│  Suggested Margin:  €0.35 /unit (14%)                      │
│  ─────────────────────────────                              │
│  Total Quote Price: €3.20 /unit                            │
├─────────────────────────────────────────────────────────────┤
│  🏪 Available Suppliers (3):                               │
│  • Farm Co (Netherlands) - €2.50 ⭐⭐⭐⭐⭐ [Best Price]      │
│  • Green Farms (Spain) - €2.70 ⭐⭐⭐⭐ [Reliable]           │
│  • Local Produce - €2.95 ⭐⭐⭐ [Fast Delivery]              │
├─────────────────────────────────────────────────────────────┤
│  📊 Seasonal Availability: Available Now (Peak Season)      │
│  🎯 Customer Requirements: Organic Certification Required    │
│  📞 Next Steps: [Generate Quote] [Contact Customer] [Book Call] │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Technical Implementation**

### **New Hooks to Create**

#### 1. `useTradeOpportunities(filters)`
```typescript
interface TradeOpportunityFilters {
  staffId?: string // 'me' for current user, 'all' for everyone
  customerId?: string
  productCategory?: string
  region?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'potential' | 'quoted'
}

interface TradeOpportunity {
  id: string
  customer: {
    id: string
    name: string
    city: string
    agent: StaffMember
  }
  product: {
    id: string
    name: string
    category: string
    specifications: ProductSpec
  }
  bestSupplier: {
    id: string
    name: string
    price: number
    currency: string
    hubName: string
    distance: number
  }
  transport: {
    cost: number
    duration: number
    mode: string
    route?: TransportRoute
  }
  pricing: {
    supplierPrice: number
    transportCost: number
    suggestedMargin: number
    totalPrice: number
    marginPercentage: number
  }
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'potential' | 'quoted'
  seasonalInfo: {
    isCurrentlyAvailable: boolean
    availableMonths: string[]
    peakSeason: boolean
  }
  lastUpdated: string
}
```

#### 2. `useOpportunityDetails(opportunityId)`
```typescript
interface OpportunityDetails extends TradeOpportunity {
  customerRequirements: {
    certifications: string[]
    deliveryMode: string
    leadTime: number
    specifications: any
  }
  supplierOptions: Array<{
    supplier: Supplier
    price: number
    rating: number
    certifications: string[]
    availability: string
    pros: string[]
    cons: string[]
  }>
  transportOptions: TransportRoute[]
  priceHistory: PriceHistoryPoint[]
  suggestedActions: string[]
}
```

#### 3. `useStaffOpportunityStats(staffId)`
```typescript
interface StaffOpportunityStats {
  totalOpportunities: number
  activeCustomers: number
  averageMargin: number
  availableRoutes: number
  highPriorityCount: number
  quotedThisMonth: number
}
```

### **New Components to Build**

1. **`<OpportunityCard>`** - Individual opportunity display
2. **`<OpportunityFilters>`** - Filter controls
3. **`<OpportunityDetailsModal>`** - Detailed view modal
4. **`<PricingBreakdown>`** - Price calculation display
5. **`<SupplierComparisonTable>`** - Compare supplier options
6. **`<TradeOpportunityStats>`** - Dashboard stats cards

### **Data Flow Architecture**

```
Customer Requirements (DB)
         ↓
Current Supplier Prices (DB)
         ↓
Transport Routes & Costs (DB)
         ↓
[useTradeOpportunities Hook]
         ↓
Trade Opportunity Calculations
         ↓
UI Components (Filters → Table → Details)
```

---

## 📋 **Page Features**

### **Core Features**

1. **Staff-Centric View**
   - Default: Show only current user's customers
   - Option: View all opportunities (management view)
   - Customer assignment clearly visible

2. **Opportunity Prioritization**
   - **High**: Customer has urgent need + we have competitive pricing
   - **Medium**: Good match but seasonal/timing considerations
   - **Low**: Potential opportunities requiring follow-up

3. **Smart Filtering**
   - By staff member (dropdown with all active staff)
   - By customer (searchable)
   - By product category
   - By geographic region
   - By opportunity status

4. **Pricing Intelligence**
   - Real-time supplier pricing
   - Transport cost calculations
   - Suggested margin recommendations
   - Competitive analysis

5. **Action Tracking**
   - Generate formal quotes
   - Log customer communications
   - Track opportunity status
   - Set follow-up reminders

### **Advanced Features** (Future Enhancement)

1. **Price Alerts**
   - Notify when competitor pricing changes
   - Alert when new suppliers become available
   - Seasonal availability notifications

2. **Customer Intelligence**
   - Purchase history analysis
   - Preference learning
   - Demand forecasting

3. **Supplier Performance**
   - Delivery reliability scores
   - Quality ratings
   - Price competitiveness trends

---

## 🚀 **Implementation Phases**

### **Phase 1: MVP** (Initial Implementation)
- [ ] Basic opportunity identification (customer + supplier + pricing)
- [ ] Simple filtering (staff, customer, product)
- [ ] Static pricing calculations
- [ ] Basic UI with table view

### **Phase 2: Enhanced Features**
- [ ] Transport cost integration
- [ ] Detailed opportunity modal
- [ ] Multiple supplier comparisons
- [ ] Staff assignment functionality

### **Phase 3: Intelligence Features**
- [ ] Priority scoring algorithm
- [ ] Seasonal availability integration
- [ ] Action tracking and follow-up
- [ ] Pricing recommendations

---

## 🔍 **Success Metrics**

1. **Usage Metrics**
   - Daily active users (staff members)
   - Opportunities viewed per session
   - Filter usage patterns

2. **Business Metrics**
   - Quotes generated from opportunities
   - Conversion rate (opportunity → quote → sale)
   - Average margin achieved
   - Customer response time improvement

3. **Efficiency Metrics**
   - Time to identify opportunities
   - Reduced manual customer-supplier matching
   - Faster quote generation

---

## 📝 **Database Considerations**

### **New Views Needed**

1. **`trade_opportunities_view`**
   - Combines customer requirements with supplier availability
   - Includes transport cost calculations
   - Pre-filters for active opportunities

2. **`staff_customer_portfolio_view`**
   - Each staff member's assigned customers
   - Customer requirements summary
   - Recent activity tracking

### **Performance Optimizations**

1. **Indexes**
   - `customers(agent_id, is_active)`
   - `customer_product_packaging_spec(customer_id)`
   - `current_supplier_prices(product_packaging_spec_id, is_active)`

2. **Caching Strategy**
   - Cache transport cost calculations
   - Refresh pricing data hourly
   - Real-time updates for critical changes

---

## 🎯 **Next Steps**

1. **Review & Approval** - Go through this plan with stakeholders
2. **Database Design** - Create necessary views and optimize queries
3. **Hook Development** - Build data fetching and calculation logic
4. **UI Implementation** - Create components and layout
5. **Testing & Iteration** - Staff feedback and refinement

---

**Ready to proceed with Phase 1 implementation?**

The plan provides a solid foundation for building a valuable trade opportunities dashboard that will help staff identify and manage customer-supplier matches more effectively.