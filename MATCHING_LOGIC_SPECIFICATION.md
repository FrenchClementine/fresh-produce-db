# Trade Opportunities Matching Logic Specification

## Analysis of Example Flows

Based on the three example flows provided and database schema analysis, here's the comprehensive matching logic specification:

### Example Flow Analysis

#### Example 1: Ex Works + Third-Party Transport
```
Customer: G's Fresh UK wants Chinese Cabbage delivered to Spalding
Supplier: Van Dijck has Ex Works Chinese Cabbage at VENLO (€1.08)
Transport: EuroTransport route VENLO → Spalding (€50/pallet)
Result: ✅ MATCH - Customer gets product via third-party transport
```

#### Example 2: Supplier Delivery
```
Customer: Spanish Customer wants Chinese Cabbage delivered to Barcelona
Supplier: G's Fresh has DELIVERY Chinese Cabbage to Barcelona (€9.35)
Result: ✅ MATCH - Supplier delivers directly to customer hub
```

#### Example 3: Customer Pickup (Ex Works)
```
Customer: G's Fresh UK can pickup at VENLO
Supplier: Van Dijck has Ex Works Chinese Cabbage at VENLO (€1.08)
Result: ✅ MATCH - Customer picks up directly from supplier hub
```

## Database Schema Mapping

### Key Tables for Matching Logic

#### Customer Requirements
- **Table**: `customer_product_packaging_spec`
- **Purpose**: What products customers need
- **Key Fields**:
  - `customer_id` → Links to customer
  - `product_packaging_spec_id` → Links to product specifications

#### Supplier Pricing (MISSING TABLE!)
**CRITICAL ISSUE**: We need a `supplier_prices` table that doesn't exist in schema!

**Current Workaround**: Use view `current_supplier_prices` which includes:
- `supplier_id`, `hub_id`, `delivery_mode`, `price_per_unit`
- `product_packaging_spec_id` (for matching with customer requirements)

#### Customer Logistics Capabilities
- **Table**: `customer_logistics_capabilities`
- **Purpose**: Where customers can pickup/receive deliveries
- **Key Fields**:
  - `customer_id` → Links to customer
  - `mode` → 'Ex Works' (pickup) or 'DELIVERY' (receive)
  - `origin_hub_id` → Hub where customer can operate
  - `destination_hub_id` → Hub where customer wants delivery (nullable for Ex Works)

#### Supplier Logistics Capabilities
- **Table**: `supplier_logistics_capabilities`
- **Purpose**: Where suppliers can deliver
- **Key Fields**:
  - `supplier_id` → Links to supplier
  - `mode` → 'Ex Works', 'DELIVERY', or 'TRANSIT'
  - `origin_hub_id` → Supplier's hub
  - `destination_hub_id` → Where supplier can deliver (nullable for Ex Works)

#### Transport Routes
- **Table**: `transporter_routes`
- **Purpose**: Third-party transport between hubs
- **Key Fields**:
  - `origin_hub_id` → Starting hub
  - `destination_hub_id` → Ending hub
  - `transport_duration_days` → Transit time

#### Transport Pricing
- **Table**: `transporter_route_price_bands`
- **Purpose**: Cost structure for transport routes
- **Key Fields**:
  - `transporter_route_id` → Links to route
  - `min_pallets`, `max_pallets` → Volume bands
  - `price_per_pallet` → Cost per pallet
  - `pallet_dimensions` → '120x80' or '120x100'

## Matching Algorithm Specification

### Phase 1: Product Matching
```typescript
function findProductMatches(customerRequirements: CustomerRequirement[]): ProductMatch[] {
  const matches = []

  for (const requirement of customerRequirements) {
    // Find suppliers with active pricing for this product spec
    const supplierPrices = await supabase
      .from('current_supplier_prices')
      .select('*')
      .eq('product_packaging_spec_id', requirement.product_packaging_spec_id)
      .eq('is_active', true)

    for (const supplierPrice of supplierPrices) {
      matches.push({
        customer: requirement.customer,
        supplier: supplierPrice,
        product: requirement.product_packaging_spec_id,
        base_price: supplierPrice.price_per_unit
      })
    }
  }

  return matches
}
```

### Phase 2: Logistics Validation
```typescript
function validateLogistics(productMatch: ProductMatch): LogisticsSolution | null {
  const { customer, supplier } = productMatch

  // Get customer logistics capabilities
  const customerCapabilities = await getCustomerLogisticsCapabilities(customer.id)

  // Get supplier logistics capabilities
  const supplierCapabilities = await getSupplierLogisticsCapabilities(supplier.supplier_id)

  // SCENARIO 1: Supplier DELIVERY Mode
  if (supplier.delivery_mode === 'DELIVERY') {
    return validateSupplierDelivery(supplier, customerCapabilities)
  }

  // SCENARIO 2: Supplier Ex Works Mode
  if (supplier.delivery_mode === 'Ex Works') {
    return validateExWorksLogistics(supplier, customerCapabilities)
  }

  // SCENARIO 3: Supplier TRANSIT Mode
  if (supplier.delivery_mode === 'TRANSIT') {
    return validateTransitLogistics(supplier, customerCapabilities)
  }

  return null
}
```

### Scenario 1: Supplier DELIVERY Validation
```typescript
function validateSupplierDelivery(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[]
): LogisticsSolution | null {

  // Find customer delivery hubs (where customer can receive deliveries)
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY')
    .map(cap => cap.destination_hub_id)
    .filter(Boolean) // Remove nulls

  // Check if supplier can deliver to any of customer's delivery hubs
  const supplierDeliveries = await supabase
    .from('supplier_logistics_capabilities')
    .select('*')
    .eq('supplier_id', supplier.supplier_id)
    .eq('mode', 'DELIVERY')
    .in('destination_hub_id', customerDeliveryHubs)

  if (supplierDeliveries.length > 0) {
    return {
      type: 'SUPPLIER_DELIVERY',
      supplier_hub: supplier.hub_id,
      customer_hub: supplierDeliveries[0].destination_hub_id,
      transport_cost: 0, // Included in supplier price
      total_cost: supplier.price_per_unit,
      duration_days: supplierDeliveries[0].typical_lead_time_days
    }
  }

  return null // Supplier doesn't deliver to customer's hubs
}
```

### Scenario 2: Ex Works Validation
```typescript
function validateExWorksLogistics(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[]
): LogisticsSolution | null {

  // Option A: Customer can pickup at supplier hub
  const customerPickupHubs = customerCapabilities
    .filter(cap => cap.mode === 'Ex Works')
    .map(cap => cap.origin_hub_id)

  if (customerPickupHubs.includes(supplier.hub_id)) {
    return {
      type: 'CUSTOMER_PICKUP',
      supplier_hub: supplier.hub_id,
      customer_hub: supplier.hub_id,
      transport_cost: 0,
      total_cost: supplier.price_per_unit,
      duration_days: 1 // Same day pickup
    }
  }

  // Option B: Third-party transport to customer delivery hubs
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY')
    .map(cap => cap.destination_hub_id)
    .filter(Boolean)

  for (const deliveryHub of customerDeliveryHubs) {
    const transportSolution = await findDirectTransport(supplier.hub_id, deliveryHub)

    if (transportSolution) {
      return {
        type: 'THIRD_PARTY_TRANSPORT',
        supplier_hub: supplier.hub_id,
        customer_hub: deliveryHub,
        transport_cost: transportSolution.price_per_pallet,
        total_cost: supplier.price_per_unit + (transportSolution.price_per_pallet / supplier.units_per_pallet),
        duration_days: transportSolution.transport_duration_days,
        transporter: transportSolution.transporter_name
      }
    }
  }

  return null // No logistics solution found
}
```

### Scenario 3: TRANSIT Validation
```typescript
function validateTransitLogistics(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[]
): LogisticsSolution | null {

  // Get customer delivery hubs
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY')
    .map(cap => cap.destination_hub_id)
    .filter(Boolean)

  // Check if supplier has transit capability to customer hubs
  const supplierTransits = await supabase
    .from('supplier_logistics_capabilities')
    .select('*')
    .eq('supplier_id', supplier.supplier_id)
    .eq('mode', 'TRANSIT')
    .in('destination_hub_id', customerDeliveryHubs)

  if (supplierTransits.length > 0) {
    return {
      type: 'SUPPLIER_TRANSIT',
      supplier_hub: supplier.hub_id,
      customer_hub: supplierTransits[0].destination_hub_id,
      transport_cost: 0, // Included in supplier price
      total_cost: supplier.price_per_unit,
      duration_days: supplierTransits[0].typical_lead_time_days
    }
  }

  return null // No transit solution
}
```

### Transport Route Lookup (RPC Function)
```typescript
async function findDirectTransport(originHubId: string, destinationHubId: string) {
  const { data: routes, error } = await supabase.rpc('find_direct_routes', {
    p_origin_hub_id: originHubId,
    p_destination_hub_id: destinationHubId,
    p_pallet_count: 10, // Standard calculation base
    p_pallet_dimensions: '120x100'
  })

  if (error || !routes || routes.length === 0) {
    return null
  }

  // Return cheapest option
  return routes.sort((a, b) => a.total_cost - b.total_cost)[0]
}
```

## Final Trade Opportunity Structure

```typescript
interface TradeOpportunity {
  id: string

  // Customer Info
  customer: {
    id: string
    name: string
    agent_name: string
  }

  // Product Info
  product: {
    id: string
    name: string
    category: string
    packaging_label: string
    size_name: string
    sold_by: string
    units_per_pallet: number
  }

  // Supplier Info
  supplier: {
    id: string
    name: string
    hub_name: string
    base_price: number
    delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
    currency: string
  }

  // Logistics Solution
  logistics: {
    solution_type: 'SUPPLIER_DELIVERY' | 'CUSTOMER_PICKUP' | 'THIRD_PARTY_TRANSPORT' | 'SUPPLIER_TRANSIT'
    supplier_hub: string
    customer_hub: string
    transport_cost_per_pallet: number
    transport_cost_per_unit: number
    transporter_name?: string
    duration_days: number
  }

  // Economics
  pricing: {
    base_price_per_unit: number
    transport_cost_per_unit: number
    subtotal_per_unit: number
    margin_percentage: number // 10%
    margin_per_unit: number
    final_price_per_unit: number
    currency: string
  }

  confidence: number // 0-100 based on data completeness
  created_at: string
}
```

## Implementation Order

### Phase 1: Clean Product Matching ✅
- [x] Match customers to suppliers by `product_packaging_spec_id`
- [x] Use `current_supplier_prices` view
- [x] Filter by active suppliers and valid pricing

### Phase 2: Customer Logistics Analysis
- [ ] Query `customer_logistics_capabilities` for each customer
- [ ] Identify pickup hubs (Ex Works mode)
- [ ] Identify delivery hubs (DELIVERY mode)

### Phase 3: Supplier Logistics Analysis
- [ ] Query `supplier_logistics_capabilities` for each supplier
- [ ] Match supplier delivery capabilities with customer delivery hubs
- [ ] Handle Ex Works supplier pricing correctly

### Phase 4: Transport Integration
- [ ] Use `find_direct_routes` RPC for third-party transport
- [ ] Calculate transport costs per unit based on `units_per_pallet`
- [ ] Show transport price bands for different volumes

### Phase 5: Economics & Display
- [ ] Calculate total costs (base + transport + 10% margin)
- [ ] Display transport details clearly in UI
- [ ] Show pricing breakdown per unit and per pallet

## Success Criteria

✅ **Logical Matching**: UK customers only see suppliers they can actually buy from
✅ **Clear Transport**: Each opportunity shows exactly how product gets delivered
✅ **Accurate Pricing**: Base price + transport + margin = final price
✅ **Real Data**: Uses actual transport routes and pricing from database
✅ **Customer-Centric**: Respects customer pickup/delivery capabilities
✅ **Supplier Respect**: Uses supplier's actual delivery modes and capabilities

## Critical Notes

1. **Units Matter**: All pricing must account for `sold_by` and `units_per_pallet`
2. **Transport Costs**: Convert pallet costs to per-unit costs for accurate pricing
3. **Hub Validation**: Never match customers/suppliers in same hub unless intended
4. **Real Routes**: Use `find_direct_routes` RPC, not estimates
5. **Price Bands**: Show different transport costs for different pallet quantities
6. **Margin**: Standard 10% margin on total cost (base + transport)

This specification ensures logical, transparent, and profitable trade opportunities based on real logistics capabilities and pricing data.