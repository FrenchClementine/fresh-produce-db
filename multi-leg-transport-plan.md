# Multi-Leg Transport Implementation Plan

## Overview
Enable automatic 2-leg transport chaining through **designated transshipment hubs** to connect suppliers and customers when no direct route exists. Routes are calculated dynamically and intelligently to prevent illogical backtracking.

## Current State

### How Transport Works Now
1. **Single-leg only**: System finds direct routes from `supplier_hub → customer_hub`
2. **Supplier delivery**: Supplier can deliver to customer's transit hub
3. **No chaining**: If no direct route exists, shows "Missing Transport"

### Example Limitation
- Supplier in Spain (Alicante hub)
- Customer in Netherlands (Rotterdam hub)
- No direct Alicante → Rotterdam route
- **BUT** we have:
  - Route 1: Alicante → Verona (€50/pallet)
  - Route 2: Verona → Rotterdam (€80/pallet)
- **System currently shows**: Missing Transport ❌
- **Should show**: Alicante → Verona → Rotterdam (€130/pallet) ✅

## Proposed Solution

### Core Principles

1. **Hub-Level Control**: Only hubs explicitly marked as `is_transshipment_hub = true` can be used as intermediate stops
2. **Dynamic Calculation**: Routes are found during trade potential calculation (not pre-saved)
3. **Geographic Validation**: Prevent illogical backtracking (e.g., South Italy → France → North Italy)
4. **Minimal SQL Overhead**: Store selected route in opportunity as JSONB only when opportunity is created
5. **Flexible**: Easy to enable/disable hubs without code changes

### Architecture (SELECTED APPROACH)

**Dynamic Route Chaining with Hub Whitelisting**
- ✅ Calculate multi-leg routes on-the-fly during trade potential generation
- ✅ **Only consider hubs where `is_transshipment_hub = true`**
- ✅ Store selected route legs in opportunities table **only when opportunity is created**
- ✅ Routes recalculate if transport prices change
- ✅ No pre-computation needed
- ❌ Slightly slower than pre-calculated (acceptable - only runs when viewing potentials)

## Implementation Plan

### Phase 1: Database Changes

#### 1.1 Hubs Table - ALREADY EXISTS ✅
```sql
-- THE HUBS TABLE ALREADY HAS TRANSSHIPMENT FIELDS!
-- No migration needed for hubs table
--
-- Existing columns:
-- - can_transship BOOLEAN DEFAULT false
-- - transship_handling_time_hours INTEGER DEFAULT 0
-- - transship_cost_per_pallet NUMERIC(10,2) DEFAULT 0

-- Simply enable transshipment on desired hubs
UPDATE hubs SET can_transship = true WHERE name IN ('Verona', 'Rotterdam', 'Padova');

-- Optional: Add index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_hubs_can_transship ON hubs(can_transship) WHERE can_transship = true;
```

**✅ Database already prepared!**
- ✅ `can_transship` flag exists
- ✅ `transship_cost_per_pallet` exists for handling fees
- ✅ `transship_handling_time_hours` exists for time calculations
- ✅ Only need to UPDATE existing hubs, no ALTER TABLE needed

#### 1.2 Opportunities Table Extension - NEW MIGRATION NEEDED
```sql
-- Migration: add_multi_leg_transport_to_opportunities.sql
-- Store selected multi-leg route ONLY when opportunity is created
ALTER TABLE opportunities
ADD COLUMN transport_route_legs JSONB DEFAULT NULL,
ADD COLUMN total_transport_legs INTEGER DEFAULT 1;

-- Example structure when saved:
-- {
--   "total_legs": 2,
--   "total_cost_per_pallet": 130.00,
--   "total_duration_days": 3,
--   "legs": [
--     {
--       "leg": 1,
--       "route_id": "uuid",
--       "origin_hub_id": "uuid",
--       "origin_hub_name": "Alicante",
--       "destination_hub_id": "uuid",
--       "destination_hub_name": "Verona",
--       "transporter_id": "uuid",
--       "transporter_name": "TransEuropa",
--       "cost_per_pallet": 50.00,
--       "duration_days": 2
--     },
--     {
--       "leg": 2,
--       "route_id": "uuid",
--       "origin_hub_id": "uuid",
--       "origin_hub_name": "Verona",
--       "destination_hub_id": "uuid",
--       "destination_hub_name": "Rotterdam",
--       "transporter_id": "uuid",
--       "transporter_name": "NL Express",
--       "cost_per_pallet": 80.00,
--       "duration_days": 1
--     }
--   ]
-- }

-- Add GIN index for JSONB queries (optional, for filtering)
CREATE INDEX idx_opportunities_transport_legs ON opportunities USING GIN (transport_route_legs);
```

**Why JSONB?**
- ✅ Flexible: Can store 2, 3, or N legs without schema changes
- ✅ Minimal overhead: NULL when not multi-leg (no storage cost)
- ✅ Queryable: Can filter/search using JSONB operators
- ✅ Self-contained: All route info in one column

#### 1.3 NO Additional Configuration Table Needed
Previously suggested config table is **NOT NEEDED** because:
- Max legs: Hardcoded to 2 (can make configurable later if needed)
- Transshipment hubs: Controlled by `hubs.is_transshipment_hub` flag
- Simpler implementation

### Phase 2: Trade Potential Logic Changes

#### 2.1 Fetch Hubs Data with Transshipment Flag

**File**: `src/hooks/use-trade-potential.ts` (add to data fetching section)

```typescript
// Add to the top of generateTradePotentialMatrix() function
// Around line 104 (after transport routes fetch)

// Fetch all hubs with transshipment flag
const { data: allHubs, error: hubsError } = await supabase
  .from('hubs')
  .select(`
    id,
    name,
    city_name,
    country_code,
    is_transshipment_hub,
    transshipment_handling_fee_per_pallet
  `)

if (hubsError) throw hubsError

console.log(`🏢 Found ${allHubs?.filter(h => h.is_transshipment_hub).length} transshipment hubs`)
```

#### 2.2 Updated Route Finding Algorithm

**File**: `src/hooks/use-trade-potential.ts`

**Current logic** (line 470-481):
```typescript
const availableRoutes = transportRoutes?.filter(route =>
  route.origin_hub_id === supplierHub &&
  customerDeliveryHubs.includes(route.destination_hub_id)
) || []
```

**New logic**:
```typescript
// 1. Try direct routes FIRST (existing logic - FAST)
const directRoutes = transportRoutes?.filter(route =>
  route.origin_hub_id === supplierHub &&
  customerDeliveryHubs.includes(route.destination_hub_id)
) || []

// 2. ONLY if no direct route, try 2-leg routes through transshipment hubs
let multiLegRoutes: MultiLegRoute[] = []
if (directRoutes.length === 0) {
  multiLegRoutes = findTwoLegRoutes(
    supplierHub,
    customerDeliveryHubs,
    transportRoutes,
    allHubs  // Pass hubs to filter transshipment points
  )
}

// 3. Prefer direct routes, but show multi-leg as alternative
const availableRoutes = directRoutes.length > 0
  ? directRoutes.map(r => convertTransportRoute(r, unitsPerPallet))
  : multiLegRoutes.map(mlr => convertMultiLegRoute(mlr, unitsPerPallet))

if (availableRoutes.length > 0) {
  hasTransport = true
  logisticsSolution = directRoutes.length > 0
    ? 'THIRD_PARTY_TRANSPORT'
    : 'MULTI_LEG_TRANSPORT'

  // Convert all routes to standard format
  availableTransportRoutes = availableRoutes

  // Use cheapest route as default
  transportRoute = availableRoutes.sort((a, b) =>
    a.pricePerPallet - b.pricePerPallet
  )[0]
}
```

**Key Points**:
- ✅ Direct routes always checked first (minimal performance impact)
- ✅ Multi-leg only calculated if needed (lazy evaluation)
- ✅ Only transshipment hubs considered (controlled by DB flag)
- ✅ Results sorted by cost (cheapest first)

#### 2.2 New Helper Functions

```typescript
interface MultiLegRoute {
  legs: Array<{
    routeId: string
    originHubId: string
    originHubName: string
    destinationHubId: string
    destinationHubName: string
    transporterId: string
    transporterName: string
    costPerPallet: number
    durationDays: number
  }>
  totalLegs: number
  totalCostPerPallet: number
  totalDurationDays: number
  intermediateHubs: Array<{
    id: string
    name: string
  }>
}

/**
 * Find 2-leg routes through ONLY designated transshipment hubs
 *
 * @param originHubId - Starting hub (supplier location)
 * @param destinationHubIds - Array of possible destination hubs (customer locations)
 * @param allRoutes - All available transport routes
 * @param allHubs - All hubs with transshipment flag info
 * @returns Array of valid 2-leg route options
 */
function findTwoLegRoutes(
  originHubId: string,
  destinationHubIds: string[],
  allRoutes: any[],
  allHubs: any[]
): MultiLegRoute[] {
  const twoLegRoutes: MultiLegRoute[] = []

  // Get only hubs marked as transshipment points
  const transshipmentHubIds = allHubs
    .filter(hub => hub.is_transshipment_hub === true)
    .map(hub => hub.id)

  console.log(`🔄 Found ${transshipmentHubIds.length} transshipment hubs`)

  // Find all routes FROM origin that END at transshipment hubs
  const firstLegRoutes = allRoutes.filter(r =>
    r.origin_hub_id === originHubId &&
    transshipmentHubIds.includes(r.destination_hub_id)
  )

  console.log(`📍 Found ${firstLegRoutes.length} routes from origin to transshipment hubs`)

  firstLegRoutes.forEach(leg1 => {
    // Find routes FROM this transshipment hub TO customer destinations
    const secondLegRoutes = allRoutes.filter(r =>
      r.origin_hub_id === leg1.destination_hub_id &&
      destinationHubIds.includes(r.destination_hub_id)
    )

    secondLegRoutes.forEach(leg2 => {
      const totalCost =
        (leg1.transporter_route_price_bands?.[0]?.price_per_pallet || 0) +
        (leg2.transporter_route_price_bands?.[0]?.price_per_pallet || 0)

      const intermediateHub = allHubs.find(h => h.id === leg1.destination_hub_id)

      twoLegRoutes.push({
        legs: [
          {
            routeId: leg1.id,
            originHubId: leg1.origin_hub_id,
            originHubName: leg1.origin_hub?.name || 'Unknown',
            destinationHubId: leg1.destination_hub_id,
            destinationHubName: intermediateHub?.name || 'Unknown',
            transporterId: leg1.transporter_id,
            transporterName: leg1.transporters?.name || 'Unknown',
            costPerPallet: leg1.transporter_route_price_bands?.[0]?.price_per_pallet || 0,
            durationDays: leg1.transport_duration_days
          },
          {
            routeId: leg2.id,
            originHubId: leg2.origin_hub_id,
            originHubName: intermediateHub?.name || 'Unknown',
            destinationHubId: leg2.destination_hub_id,
            destinationHubName: leg2.destination_hub?.name || 'Unknown',
            transporterId: leg2.transporter_id,
            transporterName: leg2.transporters?.name || 'Unknown',
            costPerPallet: leg2.transporter_route_price_bands?.[0]?.price_per_pallet || 0,
            durationDays: leg2.transport_duration_days
          }
        ],
        totalLegs: 2,
        totalCostPerPallet: totalCost,
        totalDurationDays: leg1.transport_duration_days + leg2.transport_duration_days,
        intermediateHubs: intermediateHub ? [{
          id: intermediateHub.id,
          name: intermediateHub.name
        }] : []
      })
    })
  })

  console.log(`✅ Found ${twoLegRoutes.length} valid 2-leg routes`)

  return twoLegRoutes
}

/**
 * OPTIONAL: Validate route doesn't backtrack geographically
 * This is a future enhancement - for now, trusting transshipment hub selection
 */
function isValidGeographicRoute(leg1: any, leg2: any, allHubs: any[]): boolean {
  // Future: Check if route makes geographic sense
  // E.g., don't go South Italy → France → North Italy
  // Could use hub coordinates and check if intermediate hub is "between" origin and dest
  return true // For now, accept all routes through transshipment hubs
}
```

### Phase 3: UI/Display Changes

#### 3.1 Trade Potential Display
**File**: `src/app/trade/potential/components/table-mode.tsx`

**Current**: Shows "Verona" as transport
**New**: Show "Alicante → Verona → Rotterdam (€130/pallet, 3 days)"

```typescript
// Transport column
{potential.transportRoute?.legs?.length > 1 ? (
  <div className="text-xs">
    <div className="font-medium">
      {potential.transportRoute.legs.map((leg, idx) => (
        <span key={idx}>
          {idx > 0 && ' → '}
          {leg.destinationHubName}
        </span>
      ))}
    </div>
    <div className="text-terminal-muted">
      {potential.transportRoute.totalLegs} legs •
      €{potential.transportRoute.totalCostPerPallet}/pallet •
      {potential.transportRoute.totalDurationDays} days
    </div>
  </div>
) : (
  // Existing single-leg display
)}
```

#### 3.2 Build Opportunity Modal
**File**: `src/components/forms/build-opportunity-modal.tsx`

Add transport leg details section showing each leg of the journey with costs.

#### 3.3 Active Opportunities Display
**File**: `src/app/trade/overview/components/active-opportunities-terminal.tsx`

Show route with stops when expanded:
```
📍 Alicante → Verona → Rotterdam
   Leg 1: €50/pallet (2 days)
   Leg 2: €80/pallet (1 day)
   Total: €130/pallet (3 days)
```

### Phase 4: Type Definitions

**File**: `src/types/trade-potential.ts`

```typescript
export interface TransportLeg {
  leg: number
  routeId: string
  originHubId: string
  originHubName: string
  destinationHubId: string
  destinationHubName: string
  transporterId: string
  transporterName: string
  costPerPallet: number
  costPerUnit: number
  durationDays: number
}

export interface MultiLegTransportRoute {
  id: string
  legs: TransportLeg[]
  totalLegs: number
  totalCostPerPallet: number
  totalCostPerUnit: number
  totalDurationDays: number
  intermediateHubs: Array<{
    id: string
    name: string
  }>
  unitsPerPallet: number
}
```

---

## 📊 SQL CHANGES OVERVIEW

### What Changes in Database Schema?

#### ✅ Hubs Table - NO CHANGES NEEDED
```sql
-- ALREADY EXISTS! No migration needed
-- Existing columns:
-- ✅ can_transship BOOLEAN DEFAULT false
-- ✅ transship_handling_time_hours INTEGER DEFAULT 0
-- ✅ transship_cost_per_pallet NUMERIC(10,2) DEFAULT 0

-- Only need UPDATE statements to enable transshipment:
UPDATE hubs SET can_transship = true WHERE name IN ('Verona', 'Rotterdam', 'Padova');
```

**Impact**: Zero schema changes, only data updates

#### 🆕 Opportunities Table - ADD 2 COLUMNS
```sql
-- Migration: add_multi_leg_transport_to_opportunities.sql
ALTER TABLE opportunities
ADD COLUMN transport_route_legs JSONB DEFAULT NULL,
ADD COLUMN total_transport_legs INTEGER DEFAULT 1;

-- Optional index for JSONB queries
CREATE INDEX idx_opportunities_transport_legs
ON opportunities USING GIN (transport_route_legs);
```

**Impact**: ~10 lines of SQL, backward compatible (NULL for existing records)

### Total SQL Impact
- ✅ **Hubs**: 1 UPDATE statement (enable transshipment on 3 hubs)
- 🆕 **Opportunities**: 2 new columns + 1 index
- 📊 **Total**: ~15 lines of SQL
- ⚡ **Performance**: Minimal (JSONB only populated when multi-leg, GIN index for filtering)

---

## 🔧 SYSTEM CHANGES OVERVIEW

### What Changes in Code?

#### 1. Core Logic Changes
| File | Lines | Complexity | Purpose |
|------|-------|------------|---------|
| `src/hooks/use-trade-potential.ts` | ~150 | ⭐⭐⭐ Medium | Add 2-leg route finding algorithm |
| `src/types/trade-potential.ts` | ~40 | ⭐ Simple | Add MultiLegRoute interfaces |

**Key Changes**:
- Add `findTwoLegRoutes()` helper function (~80 lines)
- Fetch hubs with `can_transship` flag (~15 lines)
- Update route finding logic to try multi-leg if no direct route (~55 lines)

#### 2. UI/Display Changes
| File | Lines | Complexity | Purpose |
|------|-------|------------|---------|
| `src/app/trade/potential/components/table-mode.tsx` | ~30 | ⭐ Simple | Show "A → B → C" format |
| `src/components/forms/build-opportunity-modal.tsx` | ~100 | ⭐⭐ Easy-Medium | Display leg breakdown, save route legs |
| `src/app/trade/overview/components/active-opportunities-terminal.tsx` | ~50 | ⭐⭐ Easy | Show multi-leg route details |
| `src/app/trade/overview/print-report/page.tsx` | ~30 | ⭐ Simple | Print leg-by-leg breakdown |

**Key Changes**:
- Conditional rendering: show multi-leg format if `legs.length > 1`
- Cost breakdown per leg
- Total transport time calculation
- Store `transport_route_legs` JSONB when creating opportunity

#### 3. Database Migration
| File | Lines | Complexity | Purpose |
|------|-------|------------|---------|
| `supabase/migrations/[timestamp]_add_multi_leg_transport.sql` | ~30 | ⭐ Simple | Add columns to opportunities |

### Total System Impact
- 📁 **Files to modify**: 6-7 files
- 📝 **Total LOC**: ~420 lines
- ⏱️ **Estimated effort**: 2-3 weeks (including testing)
- 🔥 **Risk level**: Medium (touches core trade potential logic)

### Change Breakdown by Area

#### Backend/Logic (60% of changes)
- ✅ Add 2-leg route finding algorithm
- ✅ Fetch and filter transshipment hubs
- ✅ Calculate total costs and durations
- ✅ Lazy evaluation (only if no direct route)

#### Frontend/UI (35% of changes)
- ✅ Display multi-leg routes in tables
- ✅ Show leg-by-leg breakdown in modals
- ✅ Format for print reports
- ✅ Select and save multi-leg routes

#### Database (5% of changes)
- ✅ Add 2 columns to opportunities table
- ✅ Enable transshipment flag on specific hubs

---

## 🏗️ BUILD OPPORTUNITY MODAL - DETAILED PLAN

### Current State
**File**: `src/components/forms/build-opportunity-modal.tsx`

The modal currently:
1. Shows supplier price details
2. Displays available transport routes in a dropdown
3. Calculates total cost (supply + transport)
4. Creates opportunity with single `selected_transport_band_id`

### Required Changes

#### 1. Detect Multi-Leg Routes
```typescript
// In build-opportunity-modal.tsx

// Check if selected transport is multi-leg
const isMultiLeg = selectedTransport?.legs?.length > 1

// Display different UI based on route type
{isMultiLeg ? (
  <MultiLegRouteDisplay route={selectedTransport} />
) : (
  <SingleLegRouteDisplay route={selectedTransport} />
)}
```

#### 2. Multi-Leg Route Display Component

**New UI Section**:
```typescript
function MultiLegRouteDisplay({ route }: { route: MultiLegTransportRoute }) {
  return (
    <div className="space-y-2 border border-terminal-border rounded p-3 bg-terminal-panel">
      <div className="text-sm font-medium text-terminal-accent font-mono">
        🚛 Multi-Stop Transport Route
      </div>

      {/* Route Overview */}
      <div className="text-xs font-mono text-terminal-text">
        {route.legs[0].originHubName} →
        {route.intermediateHubs.map(h => ` ${h.name} → `)}
        {route.legs[route.legs.length - 1].destinationHubName}
      </div>

      {/* Leg Breakdown */}
      <div className="space-y-1 mt-2">
        {route.legs.map((leg, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs font-mono">
            <div className="text-terminal-muted">Leg {leg.leg}:</div>
            <div className="text-terminal-text">
              {leg.originHubName} → {leg.destinationHubName}
            </div>
            <div className="text-terminal-accent">
              €{leg.costPerPallet.toFixed(2)}/pallet
            </div>
            <div className="text-terminal-muted">
              ({leg.durationDays}d)
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="border-t border-terminal-border pt-2 mt-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-terminal-muted">Total Transport:</span>
          <span className="text-terminal-accent font-bold">
            €{route.totalCostPerPallet.toFixed(2)}/pallet
          </span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-terminal-muted">Total Duration:</span>
          <span className="text-terminal-text">
            {route.totalDurationDays} days
          </span>
        </div>
      </div>
    </div>
  )
}
```

#### 3. Save Multi-Leg Route on Opportunity Creation

**Update opportunity creation logic**:
```typescript
// In build-opportunity-modal.tsx, when creating opportunity

const createOpportunity = async () => {
  const opportunityData: any = {
    customer_id: potential.customer_id,
    supplier_id: potential.supplier_id,
    product_packaging_spec_id: potential.product_packaging_spec_id,
    // ... other existing fields
  }

  // If multi-leg route selected, store leg details
  if (selectedTransport?.legs?.length > 1) {
    opportunityData.transport_route_legs = {
      total_legs: selectedTransport.totalLegs,
      total_cost_per_pallet: selectedTransport.totalCostPerPallet,
      total_duration_days: selectedTransport.totalDurationDays,
      legs: selectedTransport.legs.map(leg => ({
        leg: leg.leg,
        route_id: leg.routeId,
        origin_hub_id: leg.originHubId,
        origin_hub_name: leg.originHubName,
        destination_hub_id: leg.destinationHubId,
        destination_hub_name: leg.destinationHubName,
        transporter_id: leg.transporterId,
        transporter_name: leg.transporterName,
        cost_per_pallet: leg.costPerPallet,
        duration_days: leg.durationDays
      }))
    }
    opportunityData.total_transport_legs = selectedTransport.totalLegs

    // Store first leg's route ID as selected_transport_band_id for backward compat
    opportunityData.selected_transport_band_id = selectedTransport.legs[0].routeId
  } else {
    // Single-leg route (existing logic)
    opportunityData.selected_transport_band_id = selectedTransport.routeId
    opportunityData.total_transport_legs = 1
    opportunityData.transport_route_legs = null
  }

  // Create opportunity
  const { data, error } = await supabase
    .from('opportunities')
    .insert([opportunityData])
    .select()

  // ... error handling
}
```

#### 4. Transport Route Selection Dropdown

**Update dropdown to show route type**:
```typescript
// In transport route selector
<Select onValueChange={handleSelectTransport}>
  <SelectTrigger>
    <SelectValue placeholder="Select transport route..." />
  </SelectTrigger>
  <SelectContent>
    {availableRoutes.map(route => (
      <SelectItem key={route.id} value={route.id}>
        {route.legs?.length > 1 ? (
          // Multi-leg route option
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span>
              {route.legs[0].originHubName} → ... →
              {route.legs[route.legs.length - 1].destinationHubName}
            </span>
            <span className="text-terminal-accent">
              €{route.totalCostPerPallet.toFixed(2)}
            </span>
            <span className="text-terminal-muted text-xs">
              ({route.totalLegs} legs)
            </span>
          </div>
        ) : (
          // Single-leg route option
          <div className="flex items-center gap-2">
            <span>🚛</span>
            <span>
              {route.originHubName} → {route.destinationHubName}
            </span>
            <span className="text-terminal-accent">
              €{route.costPerPallet.toFixed(2)}
            </span>
            <span className="text-terminal-muted text-xs">
              (direct)
            </span>
          </div>
        )}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### UI Mockup (Text-Based)

```
┌─────────────────────────────────────────────────────────┐
│  Build Opportunity                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Customer: Restaurant ABC                               │
│  Supplier: Garbin SpA                                   │
│  Product: Tomatoes Rounds 67-82mm                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Supplier Price                                   │  │
│  │ Hub: Padova                                      │  │
│  │ Price: €0.90/kg                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🚛 Transport Route                               │  │
│  │ [Select route... ▼]                              │  │
│  │                                                   │  │
│  │ Options:                                          │  │
│  │ • 🔄 Padova → Verona → Netherlands (€130, 2 legs)│  │
│  │ • 🚛 Padova → Netherlands (€140, direct)         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                          │
│  [Selected: Multi-Stop Route]                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🚛 Multi-Stop Transport Route                    │  │
│  │                                                   │  │
│  │ Padova → Verona → Netherlands                    │  │
│  │                                                   │  │
│  │ Leg 1: Padova → Verona                           │  │
│  │        €50.00/pallet (2d)                        │  │
│  │                                                   │  │
│  │ Leg 2: Verona → Netherlands                      │  │
│  │        €80.00/pallet (1d)                        │  │
│  │                                                   │  │
│  │ ─────────────────────────────                    │  │
│  │ Total Transport: €130.00/pallet                  │  │
│  │ Total Duration: 3 days                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                          │
│  Total Opportunity Cost: €2.10/kg                       │
│  (€0.90 supply + €1.20 transport)                       │
│                                                          │
│  [ Cancel ]                    [ Create Opportunity ]   │
└─────────────────────────────────────────────────────────┘
```

### Summary of Modal Changes

| Change | Lines | Complexity |
|--------|-------|------------|
| Detect multi-leg routes | ~5 | ⭐ Simple |
| MultiLegRouteDisplay component | ~50 | ⭐⭐ Easy |
| Update route selector dropdown | ~30 | ⭐ Simple |
| Save multi-leg data on create | ~20 | ⭐ Simple |
| **Total** | **~105** | **⭐⭐ Easy-Medium** |

---

## Impact Analysis

### Files Requiring Changes

#### Critical Changes (Must Modify)
1. ✅ **`src/hooks/use-trade-potential.ts`** - Core route finding logic
2. ✅ **`src/types/trade-potential.ts`** - Add multi-leg types
3. ✅ **`supabase/migrations/[new]_add_multi_leg_transport.sql`** - Database schema
4. ✅ **`src/app/trade/potential/components/table-mode.tsx`** - Display routes

#### Important Changes (Should Modify)
5. ⚠️ **`src/components/forms/build-opportunity-modal.tsx`** - Show route legs when creating opportunity
6. ⚠️ **`src/app/trade/overview/components/active-opportunities-terminal.tsx`** - Display multi-leg routes
7. ⚠️ **`src/hooks/use-opportunities.ts`** - Fetch transport leg data
8. ⚠️ **`src/app/trade/overview/print-report/page.tsx`** - Print multi-leg routes

#### Optional Enhancements
9. 📊 **Transport cost breakdown component** - Visual route display
10. 📊 **Route comparison modal** - Compare direct vs multi-leg options
11. 📊 **Settings page** - Configure max legs, allowed transit hubs

### Estimated Changes by File Type

| Category | Files | LOC Changed | Complexity |
|----------|-------|-------------|------------|
| **Database** | 1 migration | ~30 lines | ⭐ Simple |
| **Hooks** | 1 file (use-trade-potential.ts) | ~150 lines | ⭐⭐⭐ Medium |
| **Types** | 1 file | ~40 lines | ⭐ Simple |
| **Components** | 3-4 files | ~200 lines | ⭐⭐ Easy-Medium |
| **Total** | **6-7 files** | **~420 lines** | **Medium** |

### SQL Overhead Analysis

| Operation | Current | With Multi-Leg | Impact |
|-----------|---------|----------------|--------|
| Fetch hubs | Not fetched | `SELECT * FROM hubs` | +1 query (cached) |
| Trade potential calc | O(R) routes check | O(R²) worst case | Lazy: only if no direct route |
| Opportunity creation | 1 INSERT | 1 INSERT with JSONB | Minimal (JSONB is NULL for direct routes) |
| Opportunity display | 1 SELECT | 1 SELECT | No change (JSONB in same row) |

**Minimal overhead because**:
- ✅ Hubs query runs once, then cached
- ✅ Multi-leg calculation only runs when NO direct route exists
- ✅ JSONB stored only in opportunities (not in potentials)
- ✅ No additional JOIN tables needed

## Performance Considerations

### Route Calculation Complexity

**Current**: O(R) where R = number of routes
- Simple filter: `routes.filter(r => r.origin === X && r.dest === Y)`

**With 2-leg**: O(R²) in worst case
- Nested loop: For each route from origin, check all routes from its destination
- **Mitigation**: Index routes by origin_hub_id

**With N-leg**: O(R^N)
- Exponential growth
- **Mitigation**: Limit to 2-3 legs maximum, use graph algorithms (Dijkstra's)

### Optimization Strategies

1. **Lazy calculation**: Only calculate multi-leg if no direct route
2. **Caching**: Cache calculated multi-leg routes (key: origin+destination)
3. **Hub filtering**: Only consider "major" transit hubs (Verona, Rotterdam, etc.)
4. **Cost ceiling**: Skip if multi-leg > 2x direct route cost estimate
5. **Database indexing**: Create indexes on `origin_hub_id`, `destination_hub_id`

## Testing Strategy

### Test Cases

1. **Direct route exists**: Should prefer direct over multi-leg
2. **Only multi-leg exists**: Should find and calculate correctly
3. **Multiple multi-leg options**: Should sort by total cost
4. **No route exists**: Should show "Missing Transport"
5. **Circular routes**: Should not create infinite loops
6. **Cost comparison**: Total multi-leg cost should be sum of legs

### Example Test Data

```typescript
// Routes setup
const routes = [
  { id: 'r1', origin: 'alicante', dest: 'verona', cost: 50 },
  { id: 'r2', origin: 'verona', dest: 'rotterdam', cost: 80 },
  { id: 'r3', origin: 'alicante', dest: 'padova', cost: 45 },
  { id: 'r4', origin: 'padova', dest: 'rotterdam', cost: 85 }
]

// Expected results for Alicante → Rotterdam
// Option 1: Alicante → Verona → Rotterdam (€130)
// Option 2: Alicante → Padova → Rotterdam (€130)
// Should return both, sorted by cost (tie)
```

## Rollout Plan

### Phase 1: MVP (Week 1)
- ✅ Database migration for multi-leg storage
- ✅ 2-leg route finding algorithm
- ✅ Basic display in trade potential table
- ✅ Test with real data

### Phase 2: Full Integration (Week 2)
- ✅ Update opportunity creation to store legs
- ✅ Display in active opportunities
- ✅ Print report formatting
- ✅ Cost breakdown UI

### Phase 3: Optimization (Week 3)
- ✅ Performance testing
- ✅ Add caching layer
- ✅ Hub filtering configuration
- ✅ User settings for max legs

### Phase 4: Enhancement (Future)
- 📊 3-leg support (if needed)
- 📊 Visual route map
- 📊 Route comparison tool
- 📊 Historical route analytics

## Configuration

### Hub-Level Configuration (DATABASE)

Instead of code configuration, use database flags:

```sql
-- Enable/disable transshipment at hub level
UPDATE hubs SET is_transshipment_hub = true WHERE name = 'Verona';
UPDATE hubs SET is_transshipment_hub = true WHERE name = 'Rotterdam';
UPDATE hubs SET is_transshipment_hub = true WHERE name = 'Padova';

-- Disable a hub as transshipment point
UPDATE hubs SET is_transshipment_hub = false WHERE name = 'Perpignan';

-- Optional: Add handling fee
UPDATE hubs SET transshipment_handling_fee_per_pallet = 5.00 WHERE name = 'Verona';
```

**Benefits**:
- ✅ No code changes needed to enable/disable hubs
- ✅ Changes take effect immediately (on next potential calculation)
- ✅ Can be managed through UI in future
- ✅ Self-documenting (query shows which hubs are transshipment points)

### Code Constants (HARDCODED - Simple)

```typescript
// In use-trade-potential.ts
const MULTI_LEG_CONFIG = {
  maxLegs: 2,                    // Fixed to 2 for now
  preferDirectRoutes: true,      // Always try direct first
  enableMultiLeg: true,          // Can disable entire feature here if needed
}
```

**Why hardcoded?**
- ✅ Simple: No config table needed
- ✅ Can make it dynamic later if needed (environment variable or settings table)
- ✅ For 95% of use cases, 2 legs is sufficient

## Success Metrics

### Before Implementation
- X% of potentials show "Missing Transport"
- Only direct routes available

### After Implementation
- Missing transport reduced by Y%
- Average Z multi-leg routes found per customer
- Cost competitiveness: multi-leg within ±N% of direct

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Performance degradation | High | Lazy calculation, caching, indexing |
| Circular routes | Medium | Track visited hubs, max depth limit |
| Cost explosion | Medium | Cost ceiling checks, prefer fewer legs |
| Complex UI | Low | Progressive disclosure, expandable details |
| Data consistency | Medium | Validate legs exist on opportunity load |

## Design Decisions (RESOLVED)

### ✅ Hub Control
**Decision**: Use `is_transshipment_hub` flag on hubs table
**Why**: Simple, flexible, no code changes needed to enable/disable

### ✅ Route Storage
**Decision**: JSONB in opportunities table, NULL for direct routes
**Why**: Minimal SQL overhead, flexible for future N-leg support

### ✅ Calculation Timing
**Decision**: Dynamic calculation during trade potential view
**Why**: Always accurate, reflects current prices, no sync issues

### ✅ Geographic Validation
**Decision**: NOT implemented in V1 (rely on manual hub curation)
**Why**: Transshipment hubs are manually enabled, so illogical routes prevented by not enabling bad hubs
**Future**: Can add coordinate-based validation later if needed

### ✅ Performance
**Decision**: Lazy calculation (only if no direct route)
**Why**: Minimal impact on common case (direct routes exist)

## Open Questions (For Future)

1. **Hub prioritization**: Should Verona be preferred over Padova? (Future: add priority field)
2. **Cost weighting**: Prefer 1-leg at €100 vs 2-leg at €90? (Future: add preference setting)
3. **Transshipment fees**: Currently have field but not calculating (Future: add to total cost)
4. **Time sensitivity**: Some customers want speed over cost? (Future: add optimization mode)
5. **Customs**: Multi-country routes need customs cost? (Future: add per-leg customs field)

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Create database migration
3. ✅ Implement route finding algorithm
4. ✅ Update types and interfaces
5. ✅ Modify trade potential calculation
6. ✅ Update UI components
7. ✅ Test with real data
8. ✅ Deploy to staging
9. ✅ User acceptance testing
10. ✅ Production rollout

---

**Status**: 📋 Planning Phase
**Priority**: 🔥 High
**Estimated Effort**: 2-3 weeks
**Dependencies**: None
