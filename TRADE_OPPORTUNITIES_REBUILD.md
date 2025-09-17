# Trade Opportunities Matching System - Complete Rebuild

## Current Problem
The existing matching logic is overly complex, inconsistent, and produces illogical results (like UK customers matched with Barcelona delivery suppliers). We need a clean, simple, and logical approach.

## Core Business Logic

### What is a Trade Opportunity?
A trade opportunity exists when:
1. **Customer needs a product** (has a requirement)
2. **Supplier offers that product** (has active pricing)
3. **Logistics solution exists** to get product from supplier to customer
4. **Economics make sense** (pricing allows for reasonable margin)

## Simplified Matching Framework

### Step 1: Product Matching
```
Customer Requirement + Supplier Price = Product Match
- Same product (exact or compatible specs)
- Supplier has active, valid pricing
- Quantities align (supplier can fulfill customer volume)
```

### Step 2: Logistics Validation
```
Supplier Location + Customer Location + Delivery Mode = Logistics Solution

THREE SCENARIOS:
1. Ex Works: Customer picks up at supplier hub
2. Supplier Delivery: Supplier delivers to customer hub
3. Third-Party Transport: External transport from supplier to customer
```

### Step 3: Economic Validation
```
Supplier Price + Transport Cost + Margin = Customer Price
- Must be commercially viable
- Standard 10% margin minimum
- Customer willing to pay market rate
```

## Detailed Logistics Scenarios

### Scenario 1: Ex Works (Customer Pickup)
```
Supplier: Van Dijck, VENLO, Ex Works €1.08
Customer: G's Fresh UK, Logistics Capability: Pickup from VENLO
Result: ✅ MATCH - Customer can pickup directly
Transport: €0 (customer handles)
Final Price: €1.08 + 10% margin = €1.19
```

### Scenario 2: Supplier Delivery
```
Supplier: G's Fresh, Barcelona, DELIVERY €9.35
Customer: Spanish Customer, Logistics Preference: Delivery to Barcelona
Result: ✅ MATCH - Supplier delivers to customer location
Transport: €0 (included in supplier price)
Final Price: €9.35 + 10% margin = €10.29
```

### Scenario 3: Third-Party Transport Required
```
Supplier: Van Dijck, VENLO, Ex Works €1.08
Customer: G's Fresh UK, Logistics Preference: Delivery to Spalding
Transport Route: VENLO → Spalding via EuroTransport €50/pallet
Result: ✅ MATCH - Transport route exists
Transport: €50/pallet
Final Price: €1.08 + €0.20/unit transport + 10% margin = €1.41
```

### Scenario 4: No Logistics Solution
```
Supplier: Van Dijck, VENLO, Ex Works €1.08
Customer: Australian Customer, No pickup capability, No transport routes
Result: ❌ NO MATCH - No way to get product to customer
```

## Database Schema Requirements

### Customer Logistics Capabilities
```sql
-- What can customers do?
customer_logistics_capabilities:
- customer_id
- hub_id (where they can pickup/receive)
- capability_type ('PICKUP', 'DELIVERY')
- is_active
```

### Supplier Delivery Capabilities
```sql
-- Where can suppliers deliver?
supplier_delivery_capabilities:
- supplier_id
- hub_id (where they can deliver)
- delivery_mode ('DELIVERY', 'TRANSIT')
- max_distance_km
- is_active
```

### Transport Routes
```sql
-- Third-party transport options
transporter_routes:
- origin_hub_id
- destination_hub_id
- transporter_id
- duration_days
- price_bands (per pallet, volume breaks)
```

## Simplified Algorithm

```typescript
function findTradeOpportunities(customerRequirements) {
  const opportunities = []

  for (const requirement of customerRequirements) {
    // 1. Find suppliers with matching products
    const matchingSuppliers = findSuppliersForProduct(requirement.product_spec_id)

    for (const supplier of matchingSuppliers) {
      // 2. Find logistics solution
      const logisticsSolution = findLogisticsSolution(
        supplier.hub_id,
        supplier.delivery_mode,
        requirement.customer_id
      )

      if (logisticsSolution) {
        // 3. Calculate total cost
        const totalCost = calculateTotalCost(
          supplier.price_per_unit,
          logisticsSolution.transport_cost,
          requirement.units_per_pallet
        )

        // 4. Create opportunity
        opportunities.push({
          customer: requirement.customer,
          supplier: supplier,
          product: requirement.product,
          logistics: logisticsSolution,
          pricing: totalCost
        })
      }
    }
  }

  return opportunities
}

function findLogisticsSolution(supplierHubId, deliveryMode, customerId) {
  const customer = getCustomer(customerId)

  switch (deliveryMode) {
    case 'Ex Works':
      // Can customer pickup at supplier hub?
      if (customerCanPickupAt(customerId, supplierHubId)) {
        return { type: 'CUSTOMER_PICKUP', cost: 0, hub: supplierHubId }
      }

      // Find transport to customer delivery hubs
      const transportRoute = findTransportRoute(
        supplierHubId,
        customer.delivery_hubs
      )

      if (transportRoute) {
        return {
          type: 'THIRD_PARTY_TRANSPORT',
          cost: transportRoute.cost_per_pallet,
          transporter: transportRoute.transporter_name,
          duration: transportRoute.duration_days
        }
      }

      return null // No solution

    case 'DELIVERY':
      // Can supplier deliver to customer location?
      if (supplierDeliversTo(supplier.id, customer.delivery_hubs)) {
        return { type: 'SUPPLIER_DELIVERY', cost: 0, hub: supplierHubId }
      }

      return null // Supplier doesn't deliver to customer location

    case 'TRANSIT':
      // Similar to delivery but may require additional transport
      return findTransitSolution(supplierHubId, customer.delivery_hubs)
  }
}
```

## Clean Data Model

### Trade Opportunity Interface
```typescript
interface TradeOpportunity {
  id: string

  // Customer Info
  customer: {
    id: string
    name: string
    location: string
    agent: string
  }

  // Product Info
  product: {
    id: string
    name: string
    specifications: ProductSpec
    required_quantity: number
  }

  // Supplier Info
  supplier: {
    id: string
    name: string
    location: string
    price_per_unit: number
    delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
    valid_until: string
  }

  // Logistics Solution
  logistics: {
    type: 'CUSTOMER_PICKUP' | 'SUPPLIER_DELIVERY' | 'THIRD_PARTY_TRANSPORT'
    origin_hub: string
    destination_hub: string
    transporter?: string
    duration_days: number
    cost_per_pallet: number
  }

  // Economics
  pricing: {
    supplier_price: number
    transport_cost: number
    subtotal: number
    margin_percentage: number
    margin_amount: number
    total_price: number
    currency: string
  }

  // Metadata
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number // 0-100% based on data completeness
  created_at: string
}
```

## Implementation Steps

### Phase 1: Clean Slate
1. **Remove existing complex matching logic**
2. **Create simple product matching** (customer requirement → supplier price)
3. **Stub logistics with basic rules** (same country = match)
4. **Test basic product matching works**

### Phase 2: Customer Logistics Capabilities
1. **Create customer logistics capabilities table/data**
2. **Implement customer pickup capability lookup**
3. **Implement customer delivery hub preferences**
4. **Test customer-centric logistics**

### Phase 3: Supplier Delivery Capabilities
1. **Create supplier delivery capabilities data**
2. **Implement supplier delivery area lookup**
3. **Match supplier delivery with customer hubs**
4. **Test supplier-centric logistics**

### Phase 4: Transport Integration
1. **Use existing transport routes and RPC functions**
2. **Implement third-party transport fallback**
3. **Calculate real transport costs and price bands**
4. **Test complete end-to-end logistics**

### Phase 5: Economics & UI
1. **Implement proper pricing calculations**
2. **Add margin and currency handling**
3. **Create priority scoring algorithm**
4. **Update UI to show logistics details clearly**

## Success Criteria

✅ **Logical Results**: UK customers only see suppliers they can actually buy from
✅ **Clear Logistics**: Each opportunity shows exactly how product gets to customer
✅ **Accurate Pricing**: All costs transparent (supplier + transport + margin)
✅ **Real Data**: Uses actual transport routes and pricing when available
✅ **Graceful Fallbacks**: Works even with incomplete logistics data
✅ **Scalable**: Easy to add new logistics capabilities and transport routes

## Key Principles

1. **Geography Matters**: Never show impossible logistics combinations
2. **Transparency**: Always show how product gets from A to B
3. **Real Economics**: Use actual costs, not estimates where possible
4. **Customer-Centric**: Focus on what customer can actually receive
5. **Supplier Capabilities**: Respect what suppliers actually offer
6. **Transport Reality**: Use real routes or clear estimates

---

This rebuild will create a logical, maintainable system that produces sensible trade opportunities based on real logistics capabilities rather than complex algorithmic guessing.