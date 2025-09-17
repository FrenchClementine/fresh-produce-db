# Dynamic Multi-Hop Transport Implementation Plan

> Implementation plan for dynamic 2-segment transport routing using transshipment hubs

## Overview

Enable flexible transport routing where **any** supplier/transporter can deliver TO a transshipment hub, and **any** transporter/customer can pickup FROM a transshipment hub. The system dynamically creates possible routes by matching available connections.

**Example Use Case:**
- Verona is marked as a transshipment hub
- Any supplier that can deliver to Verona + any transporter that can pickup from Verona = possible multi-hop route
- System automatically discovers: Valencia → Verona (Supplier A) + Verona → Amsterdam (Transporter B)

## Database Schema Changes

### 1. Hub Capabilities Enhancement

Add transshipment capability to existing hubs table:

```sql
-- Add new column to existing hubs table
ALTER TABLE hubs ADD COLUMN can_transship BOOLEAN DEFAULT false;
ALTER TABLE hubs ADD COLUMN transship_handling_time_hours INTEGER DEFAULT 0;
ALTER TABLE hubs ADD COLUMN transship_cost_per_pallet DECIMAL(10,2) DEFAULT 0;

-- Create index for transshipment hubs
CREATE INDEX idx_hubs_can_transship ON hubs(can_transship) WHERE can_transship = true;
```

### 2. No Additional Tables Needed!

The genius of this approach is we **don't need new tables** for transport chains. We use the existing structure dynamically:

**Existing Tables We Use:**
- `supplier_logistics_capabilities` - suppliers can deliver TO transshipment hubs
- `transporter_routes` - transporters can pickup FROM transshipment hubs
- `customer_logistics_capabilities` - customers can pickup FROM transshipment hubs
- `hubs` - just add transshipment capability flag

**Dynamic Route Discovery:**
```sql
-- The system will query like this to find multi-hop possibilities:

-- Step 1: Find suppliers that can deliver to transshipment hubs
SELECT DISTINCT
    slc.supplier_id,
    slc.origin_hub_id as supplier_hub,
    slc.destination_hub_id as transship_hub,
    h.name as transship_hub_name
FROM supplier_logistics_capabilities slc
JOIN hubs h ON slc.destination_hub_id = h.id
WHERE h.can_transship = true
    AND slc.mode IN ('DELIVERY', 'TRANSIT');

-- Step 2: Find transporters that can pickup from those same transshipment hubs
SELECT DISTINCT
    tr.transporter_id,
    tr.origin_hub_id as transship_hub,
    tr.destination_hub_id as final_destination,
    t.name as transporter_name
FROM transporter_routes tr
JOIN transporters t ON tr.transporter_id = t.id
JOIN hubs h ON tr.origin_hub_id = h.id
WHERE h.can_transship = true
    AND tr.is_active = true;

-- Step 3: Match them together dynamically in the application
-- Supplier delivers TO Hub X + Transporter picks up FROM Hub X = Multi-hop route
```

## Data Setup Strategy

### 1. Mark Strategic Hubs as Transshipment Capable

```sql
-- Update major distribution/logistics centers as transshipment capable
UPDATE hubs SET
    can_transship = true,
    transship_handling_time_hours = 4,
    transship_cost_per_pallet = 15.00
WHERE name IN (
    'Verona Distribution Center',
    'Perpignan Logistics Hub',
    'Rotterdam Port Hub',
    'Frankfurt Distribution Center',
    'Milan Cross-dock Facility',
    'Lyon Distribution Hub'
    -- Any major hub that can handle cross-docking
);
```

### 2. Existing Data Requirements

**No new data needed!** The system uses existing:

**Supplier Logistics:**
```sql
-- Suppliers already have delivery capabilities TO hubs
-- If they can deliver to Verona, they can now participate in multi-hop
SELECT * FROM supplier_logistics_capabilities
WHERE destination_hub_id IN (SELECT id FROM hubs WHERE can_transship = true);
```

**Transporter Routes:**
```sql
-- Transporters already have pickup capabilities FROM hubs
-- If they can pickup from Verona, they can now be second leg of multi-hop
SELECT * FROM transporter_routes
WHERE origin_hub_id IN (SELECT id FROM hubs WHERE can_transship = true);
```

**Example Scenario:**
- Supplier A: Can deliver Valencia → Verona (already in supplier_logistics_capabilities)
- Transporter B: Can transport Verona → Amsterdam (already in transporter_routes)
- System automatically discovers: Valencia → Verona → Amsterdam route!

## Code Implementation Changes

### 1. Update Product Finder Hook

Modify `/src/hooks/use-product-finder.ts` to discover multi-hop routes dynamically:

```typescript
// Add to the existing hook after current single-hop route fetching logic

// Get multi-hop possibilities for delivery mode
let multiHopRoutes = null
if (criteria.delivery_mode === 'delivery' && targetHubIds.length > 0) {

  // Step 1: Find all transshipment hubs that transporters can reach our target destinations from
  const { data: transshipHubs, error: transshipError } = await supabase
    .from('transporter_routes')
    .select(`
      origin_hub_id,
      destination_hub_id,
      transporter_id,
      transport_duration_days,
      origin_hub:hubs!origin_hub_id(
        id,
        name,
        city_name,
        country_code,
        can_transship,
        transship_handling_time_hours,
        transship_cost_per_pallet
      ),
      destination_hub:hubs!destination_hub_id(id, name, city_name, country_code),
      transporters(id, name)
    `)
    .in('destination_hub_id', targetHubIds)
    .eq('is_active', true)
    .not('origin_hub.can_transship', 'is', null)
    .eq('origin_hub.can_transship', true)

  if (transshipError) {
    console.error('Error fetching transshipment routes:', transshipError)
  } else {
    multiHopRoutes = transshipHubs
  }

  // Get pricing for the second leg (transshipment → destination)
  if (multiHopRoutes && multiHopRoutes.length > 0) {
    const routeIds = multiHopRoutes.map(r => r.id)
    const { data: secondLegPricing, error: pricingError } = await supabase
      .from('transporter_route_price_bands')
      .select('*')
      .in('transporter_route_id', routeIds)
      .order('min_pallets', { ascending: true })

    if (!pricingError && secondLegPricing) {
      multiHopRoutes.forEach(route => {
        route.pricing_bands = secondLegPricing.filter(p => p.transporter_route_id === route.id)
      })
    }
  }
}

console.log('Available transshipment hubs for multi-hop:', multiHopRoutes?.map(r => ({
  transship_hub: r.origin_hub?.name,
  transship_hub_id: r.origin_hub_id,
  to: r.destination_hub?.name,
  transporter: r.transporters?.name,
  can_transship: r.origin_hub?.can_transship
})))
```

### 2. Enhanced Supplier Result Processing

Update the supplier result processing to discover multi-hop possibilities dynamically:

```typescript
// In the delivery mode processing section, after checking direct delivery:

if (!directDelivery) {
  // Check if this supplier can deliver to any transshipment hub that has onward transport
  const supplierCanDeliverToTransship = supplierLogistics.find(sl => {
    // Check if supplier can deliver TO a transshipment hub
    if (!sl.destination_hub_id) return false

    // Check if there's a transporter route FROM that same hub to our target
    const onwardRoute = multiHopRoutes?.find(mhr =>
      mhr.origin_hub_id === sl.destination_hub_id
    )

    return !!onwardRoute
  })

  if (supplierCanDeliverToTransship) {
    // Find the matching onward transport route
    const onwardRoute = multiHopRoutes?.find(mhr =>
      mhr.origin_hub_id === supplierCanDeliverToTransship.destination_hub_id
    )

    if (onwardRoute) {
      const routePricing = onwardRoute.pricing_bands || []
      const transshipHub = onwardRoute.origin_hub

      // Calculate total cost and time
      const supplierDuration = supplierCanDeliverToTransship.typical_lead_time_days || 1
      const transportDuration = onwardRoute.transport_duration_days || 2
      const handlingTime = Math.ceil((transshipHub?.transship_handling_time_hours || 4) / 24)
      const totalDuration = supplierDuration + transportDuration + handlingTime

      // Estimate total cost (supplier delivery + handling + transport)
      const handlingCost = transshipHub?.transship_cost_per_pallet || 15
      const transportCost = routePricing.length > 0 ? routePricing[0].price_per_pallet : 40
      const estimatedTotalCost = handlingCost + transportCost

      deliveryToHub = {
        id: onwardRoute.destination_hub.id,
        name: onwardRoute.destination_hub.name,
        city: onwardRoute.destination_hub.city_name || 'Unknown',
        country_code: onwardRoute.destination_hub.country_code || 'N/A',
        transport_days: totalDuration,
        cost_estimate: estimatedTotalCost,
        is_supplier_transport: false,
        transporter_name: 'Multi-hop Transport',
        multi_hop_route: {
          transshipment_hub: {
            id: transshipHub?.id,
            name: transshipHub?.name,
            city: transshipHub?.city_name,
            handling_time_hours: transshipHub?.transship_handling_time_hours,
            handling_cost_per_pallet: transshipHub?.transship_cost_per_pallet
          },
          first_leg: {
            from_hub: logistic.origin_hub?.name,
            to_hub: transshipHub?.name,
            duration_days: supplierDuration,
            transport_type: 'supplier_delivery',
            mode: supplierCanDeliverToTransship.mode
          },
          second_leg: {
            from_hub: transshipHub?.name,
            to_hub: onwardRoute.destination_hub.name,
            duration_days: transportDuration,
            transport_type: 'transporter_delivery',
            transporter_name: onwardRoute.transporters?.name,
            cost_per_pallet: transportCost
          }
        },
        pricing_bands: routePricing.map(p => ({
          min_pallets: p.min_pallets,
          max_pallets: p.max_pallets,
          price_per_pallet: p.price_per_pallet + handlingCost, // Include handling in total price
          pallet_dimensions: p.pallet_dimensions
        }))
      }
    }
  }
}
```

### 3. Update SupplierResult Interface

Extend the interface in `/src/hooks/use-product-finder.ts`:

```typescript
export interface SupplierResult {
  // ... existing fields
  delivery_to_hub?: {
    // ... existing fields
    multi_hop_route?: {
      transshipment_hub: {
        id: string
        name: string
        city: string
        handling_time_hours?: number
        handling_cost_per_pallet?: number
      }
      first_leg: {
        from_hub: string
        to_hub: string
        duration_days: number
        transport_type: 'supplier_delivery'
        mode: string
      }
      second_leg: {
        from_hub: string
        to_hub: string
        duration_days: number
        transport_type: 'transporter_delivery'
        transporter_name?: string
        cost_per_pallet?: number
      }
    }
  }
}
```

## UI Updates

### 1. Product Finder Results Display

Update `/src/components/product-finder-widget.tsx` to show multi-hop transport:

```tsx
// In the supplier result display
{supplier.delivery_to_hub?.multi_hop_route && (
  <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-md border-l-4 border-blue-400">
    <h4 className="font-medium text-blue-900 flex items-center">
      🚛 Multi-hop Transport
      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
        {supplier.delivery_to_hub.transport_days} days total
      </span>
    </h4>

    <div className="mt-3 space-y-2">
      {/* First Leg - Supplier Delivery */}
      <div className="flex items-center text-sm">
        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
          1
        </div>
        <div className="flex-1">
          <span className="font-medium text-gray-900">
            {supplier.delivery_to_hub.multi_hop_route.first_leg.from_hub}
          </span>
          <span className="mx-2">→</span>
          <span className="font-medium text-blue-700">
            {supplier.delivery_to_hub.multi_hop_route.first_leg.to_hub}
          </span>
          <div className="text-xs text-gray-500 mt-1">
            Supplier delivery ({supplier.delivery_to_hub.multi_hop_route.first_leg.mode}) •
            {supplier.delivery_to_hub.multi_hop_route.first_leg.duration_days} days
          </div>
        </div>
      </div>

      {/* Transshipment Hub */}
      <div className="flex items-center text-sm bg-yellow-50 p-2 rounded">
        <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs mr-3">
          🔄
        </div>
        <div className="flex-1">
          <span className="font-medium text-yellow-800">
            Transshipment at {supplier.delivery_to_hub.multi_hop_route.transshipment_hub.name}
          </span>
          <div className="text-xs text-yellow-600 mt-1">
            Handling: {supplier.delivery_to_hub.multi_hop_route.transshipment_hub.handling_time_hours}h •
            €{supplier.delivery_to_hub.multi_hop_route.transshipment_hub.handling_cost_per_pallet}/pallet
          </div>
        </div>
      </div>

      {/* Second Leg - Transporter Delivery */}
      <div className="flex items-center text-sm">
        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
          2
        </div>
        <div className="flex-1">
          <span className="font-medium text-blue-700">
            {supplier.delivery_to_hub.multi_hop_route.second_leg.from_hub}
          </span>
          <span className="mx-2">→</span>
          <span className="font-medium text-gray-900">
            {supplier.delivery_to_hub.multi_hop_route.second_leg.to_hub}
          </span>
          <div className="text-xs text-gray-500 mt-1">
            {supplier.delivery_to_hub.multi_hop_route.second_leg.transporter_name} •
            {supplier.delivery_to_hub.multi_hop_route.second_leg.duration_days} days •
            €{supplier.delivery_to_hub.multi_hop_route.second_leg.cost_per_pallet}/pallet
          </div>
        </div>
      </div>
    </div>

    <div className="mt-3 pt-2 border-t border-blue-200">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-blue-900">Total Cost Estimate:</span>
        <span className="font-bold text-blue-900">€{supplier.delivery_to_hub.cost_estimate}/pallet</span>
      </div>
    </div>
  </div>
)}
```

### 2. Hub Management Enhancement

Simply add transshipment capability to existing hub management:

**In Hub Edit Form:** Add checkboxes/fields for:
- ☑️ Can handle transshipment
- ⏰ Handling time (hours)
- 💰 Handling cost per pallet

**No new transport chain management needed** - the system discovers routes dynamically!

## Migration Steps

### Phase 1: Database Setup (5 minutes)
1. Add 3 columns to existing `hubs` table
2. Mark 5-10 strategic hubs as transshipment capable
3. **No new tables needed!**

### Phase 2: Code Updates (2-3 hours)
1. Update product finder hook with dynamic multi-hop discovery logic
2. Enhance supplier result interface
3. Update UI to display multi-hop routes beautifully

### Phase 3: Configuration (30 minutes)
1. Configure major hubs with transshipment capability
2. Set realistic handling times and costs
3. **System automatically discovers all possible routes**

### Phase 4: Testing (1 hour)
1. Test with real scenarios: Valencia → Verona → Amsterdam
2. Verify cost calculations and timing
3. Check UI displays routes clearly

## Business Benefits

- **🌍 Expanded supplier network**: Access suppliers anywhere, even if they can't deliver directly
- **💰 Cost optimization**: Perfect mix of supplier delivery + professional transport
- **⚡ Instant route discovery**: No manual route creation - system finds all possibilities automatically
- **📈 Infinite scalability**: Every new hub/transporter/supplier exponentially increases possibilities
- **🎯 Zero maintenance**: Routes update automatically as capabilities change

## Performance Advantages

- **Lightning fast queries**: Uses existing indexes and simple JOINs
- **No pre-computation needed**: Discovers routes in real-time
- **Minimal storage overhead**: Just 3 columns added to existing table
- **Smart caching**: Can cache transshipment hub queries easily
- **Graceful degradation**: Falls back to direct routes if no multi-hop found

## Example Dynamic Discovery

```
Scenario: Customer needs tomatoes in Amsterdam

System automatically discovers:
1. Supplier A (Valencia) → can deliver to → Verona (transship hub)
2. Transporter B → can pickup from → Verona → deliver to → Amsterdam
3. ✨ MATCH! Valencia → Verona → Amsterdam route created dynamically

Result: Customer gets access to Valencia supplier without any manual route setup!
```

**This approach scales infinitely - every new connection creates exponentially more possibilities!**