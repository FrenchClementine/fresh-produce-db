# Logistics Matching System Plan

## Current Status
✅ **Basic supplier matching is working** - customers are being matched with suppliers based on product requirements
✅ **Database view updated** - `current_supplier_prices` now includes `product_packaging_spec_id` for proper matching
✅ **Transport validation temporarily disabled** - need to implement proper logistics matching

## Problem Analysis

From the database schema and customer logistics examples shown:

### Customer Logistics Preferences (Image #2)
- **DELIVERY**: Customer wants delivery to "Spalding UK-SPALD" hub
- **Origin Hub**: "Spalding UK-SPALD"
- **Destination Hub**: "Spalding UK-SPALD"
- This means customer can receive deliveries at Spalding hub

### Customer Logistics Capabilities (Image #3)
- **Bari (Pickup) IT-SOUTHE**: Customer can pick up Ex Works from Bari hub
- **Mode**: Ex Works (customer pickup capability)
- **Lead Time**: 1 day
- **Operational Days**: MON-SAT

## Logistics Matching Logic

### Scenario 1: Supplier has DELIVERY price mode
```
Supplier: Van Dijck Groenteproducties
Location: VENLO, Netherlands
Price Mode: DELIVERY
Target: Customer delivery hub (Spalding)

MATCHING LOGIC:
1. Check if supplier has delivery capability to customer's delivery hub
2. If YES → Use supplier's delivery price (includes transport)
3. If NO → Cannot match (supplier doesn't deliver to that hub)
```

### Scenario 2: Supplier has Ex Works price mode
```
Supplier: Van Dijck Groenteproducties
Location: VENLO, Netherlands
Price Mode: Ex Works
Target: Customer delivery hub (Spalding)

MATCHING LOGIC:
1. Check if customer has pickup capability at supplier's hub (VENLO)
   - If YES → Customer picks up, use Ex Works price
2. If NO pickup capability → Find third-party transport:
   - Use find_direct_routes(VENLO → Spalding)
   - Calculate: Ex Works price + Transport cost + Margin
   - Show transport bands with price ranges
```

### Scenario 3: Supplier has TRANSIT price mode
```
Supplier: G's Fresh
Location: Barcelona, Spain
Price Mode: TRANSIT
Target: Customer delivery hub (Spalding)

MATCHING LOGIC:
1. Check supplier's transit capabilities to customer delivery hub
2. If available → Use transit price
3. If not available → Find third-party transport solution
```

## Implementation Plan

### Phase 1: Customer Logistics Capability Analysis
```typescript
interface CustomerLogisticsCapability {
  customer_id: string
  origin_hub_id: string    // Where customer can pick up (Ex Works)
  destination_hub_id: string // Where customer wants delivery
  mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  lead_time_days: number
  operational_days: string[]
}

interface CustomerLogisticsPreference {
  customer_id: string
  origin_hub_id: string
  destination_hub_id: string
  mode: 'DELIVERY'
  preferred_time: string
  requirements: string
}
```

### Phase 2: Supplier Capability Analysis
```typescript
interface SupplierDeliveryCapability {
  supplier_id: string
  hub_id: string           // Hub where supplier can deliver
  delivery_mode: 'DELIVERY' | 'TRANSIT'
  lead_time_days: number
  max_distance_km: number
}
```

### Phase 3: Transport Route Integration
```typescript
interface TransportSolution {
  route_id: string
  transporter_name: string
  agent_name: string
  origin_hub_id: string
  destination_hub_id: string
  transport_days: number
  price_bands: TransportPriceBand[]
  customs_cost: number
  diesel_surcharge: number
}
```

### Phase 4: Matching Algorithm

```typescript
function findLogisticsSolution(
  customerRequirement: CustomerRequirement,
  supplierPrice: SupplierPrice,
  customerLogistics: CustomerLogisticsCapability[],
  customerPreferences: CustomerLogisticsPreference[]
): LogisticsSolution | null {

  // 1. DELIVERY MODE MATCHING
  if (supplierPrice.delivery_mode === 'DELIVERY') {
    // Check if supplier delivers to customer's preferred delivery hub
    const customerDeliveryHubs = customerPreferences
      .filter(p => p.mode === 'DELIVERY')
      .map(p => p.destination_hub_id)

    if (supplierDeliversTo(supplierPrice.supplier_id, customerDeliveryHubs)) {
      return {
        type: 'SUPPLIER_DELIVERY',
        price: supplierPrice.price_per_unit,
        delivery_hub: customerDeliveryHub,
        lead_time: supplier.lead_time_days
      }
    }
  }

  // 2. EX WORKS MODE MATCHING
  if (supplierPrice.delivery_mode === 'Ex Works') {
    // Option A: Customer can pick up at supplier hub
    const customerPickupHubs = customerLogistics
      .filter(cap => cap.mode === 'Ex Works')
      .map(cap => cap.origin_hub_id)

    if (customerPickupHubs.includes(supplierPrice.hub_id)) {
      return {
        type: 'CUSTOMER_PICKUP',
        price: supplierPrice.price_per_unit,
        pickup_hub: supplierPrice.hub_id,
        lead_time: customerLogistics.lead_time_days
      }
    }

    // Option B: Third-party transport required
    const customerDeliveryHubs = customerPreferences
      .filter(p => p.mode === 'DELIVERY')
      .map(p => p.destination_hub_id)

    for (const deliveryHub of customerDeliveryHubs) {
      const transportRoutes = await findDirectRoutes(
        supplierPrice.hub_id,
        deliveryHub
      )

      if (transportRoutes.length > 0) {
        return {
          type: 'THIRD_PARTY_TRANSPORT',
          base_price: supplierPrice.price_per_unit,
          transport_routes: transportRoutes,
          price_bands: calculatePriceBands(transportRoutes),
          delivery_hub: deliveryHub
        }
      }
    }
  }

  return null // No logistics solution found
}
```

## Display Implementation

### Trade Opportunities Table Updates
```typescript
interface EnhancedTradeOpportunity {
  // ... existing fields ...

  logistics: {
    solution_type: 'SUPPLIER_DELIVERY' | 'CUSTOMER_PICKUP' | 'THIRD_PARTY_TRANSPORT'
    delivery_hub?: string
    pickup_hub?: string
    transport_solution?: {
      transporter_name: string
      agent_name: string
      duration_days: number
      price_bands: {
        min_pallets: number
        max_pallets: number
        price_per_pallet: number
        dimensions: string
      }[]
    }
    total_price_range: {
      min_price: number
      max_price: number
      currency: string
    }
  }
}
```

### UI Display Logic

#### Best Supplier Column
```
Van Dijck Groenteproducties
📍 VENLO → 🚛 → Spalding (2 days)
Via: EuroTransport Ltd
Price bands: €45-55/pallet
```

#### Pricing Column
```
Base: €1.08
Transport: €45-55/pallet
Total: €1.53-1.63 (+10% margin)
```

#### New Transport Details Modal
- Show full transport route map
- Display all available price bands
- Show transporter contact details
- Calculate pricing for different pallet quantities

## Database Queries Required

### 1. Customer Logistics Data
```sql
SELECT
  clc.*,
  origin_hub.name as origin_hub_name,
  destination_hub.name as destination_hub_name
FROM customer_logistics_capabilities clc
LEFT JOIN hubs origin_hub ON clc.origin_hub_id = origin_hub.id
LEFT JOIN hubs destination_hub ON clc.destination_hub_id = destination_hub.id
WHERE clc.customer_id = ?
```

### 2. Supplier Delivery Capabilities
```sql
SELECT DISTINCT
  sp.supplier_id,
  sp.hub_id,
  h.name as hub_name,
  sp.delivery_mode
FROM supplier_prices sp
JOIN hubs h ON sp.hub_id = h.id
WHERE sp.delivery_mode IN ('DELIVERY', 'TRANSIT')
AND sp.is_active = true
```

### 3. Transport Routes with Price Bands
```sql
SELECT
  tr.*,
  t.name as transporter_name,
  t.agent_id,
  staff.name as agent_name,
  trpb.pallet_dimensions,
  trpb.min_pallets,
  trpb.max_pallets,
  trpb.price_per_pallet
FROM transporter_routes tr
JOIN transporters t ON tr.transporter_id = t.id
LEFT JOIN staff ON t.agent_id = staff.id
JOIN transporter_route_price_bands trpb ON tr.id = trpb.transporter_route_id
WHERE tr.origin_hub_id = ?
AND tr.destination_hub_id = ?
AND tr.is_active = true
ORDER BY trpb.min_pallets
```

## Success Criteria

✅ **Accurate Logistics Matching**: Every supplier shown has a valid logistics path to customer
✅ **Real Transport Pricing**: Use actual transporter price bands, not mock data
✅ **Comprehensive Coverage**: Handle Ex Works, Delivery, and Transit scenarios
✅ **Price Transparency**: Show base price + transport + margin clearly
✅ **Business Logic**: Never match customer/supplier in same hub unless intended

## Next Steps

1. **Implement customer logistics capability lookup**
2. **Add supplier delivery capability analysis**
3. **Integrate real transport route validation**
4. **Update UI to show transport details**
5. **Add transport details modal**
6. **Test with real customer/supplier/transport data**

---

This plan ensures the logistics matching system respects the real-world constraints of pickup/delivery capabilities while providing transparent pricing with actual transport costs.