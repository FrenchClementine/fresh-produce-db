# Market Opportunity Implementation Plan

## Overview
Copy the exact pattern of **Trade Potential → Trade Opportunities** but for markets:
- **Market Potential**: Shows all hub → supplier product matches (like Trade Potential shows customer → supplier)
- **Market Opportunities**: Active market opportunities that can be maintained (like Trade Opportunities)

## Database Schema

### 1. Create `market_opportunities` table
*Copied from `opportunities` table structure, but hub-based instead of customer-based*

```sql
CREATE TABLE market_opportunities (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships (HUB instead of CUSTOMER)
  hub_id UUID NOT NULL REFERENCES hubs(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_packaging_spec_id UUID NOT NULL REFERENCES product_packaging_specs(id),

  -- Supplier Product Relationship
  supplier_product_packaging_spec_id UUID NOT NULL REFERENCES supplier_product_packaging_spec(id),

  -- Selected Options
  selected_supplier_id UUID REFERENCES suppliers(id),
  selected_transporter_id UUID REFERENCES transporters(id),
  selected_route_id UUID REFERENCES transporter_routes(id),
  selected_transport_band_id UUID REFERENCES transporter_route_price_bands(id),

  -- Price Source (which hub the supplier price is from)
  price_source_hub_id UUID REFERENCES hubs(id),

  -- Pricing Information (snapshot at creation)
  supplier_price_id UUID REFERENCES supplier_prices(id),
  supplier_price_per_unit NUMERIC(10,4),
  transport_cost_per_unit NUMERIC(10,4),
  transport_cost_per_pallet NUMERIC(10,2),
  diesel_surcharge_per_pallet NUMERIC(10,2),

  -- Market Pricing
  margin_percentage NUMERIC(5,2) DEFAULT 15.00,
  custom_markup NUMERIC(10,2),
  delivered_price_per_unit NUMERIC(10,4), -- Final price at hub

  -- Validity and Lifecycle
  valid_till DATE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Status Management
  status TEXT CHECK (status IN ('draft', 'active', 'suspended', 'cancelled', 'expired')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Notes
  internal_notes TEXT,
  supplier_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES staff(id),
  assigned_to UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate active opportunities for same hub-supplier-product
  CONSTRAINT unique_market_opportunity UNIQUE (hub_id, supplier_id, product_packaging_spec_id, is_active)
);

-- Indexes
CREATE INDEX idx_market_opportunities_status ON market_opportunities(status);
CREATE INDEX idx_market_opportunities_hub ON market_opportunities(hub_id);
CREATE INDEX idx_market_opportunities_supplier ON market_opportunities(supplier_id);
CREATE INDEX idx_market_opportunities_assigned ON market_opportunities(assigned_to);
CREATE INDEX idx_market_opportunities_created_at ON market_opportunities(created_at DESC);
CREATE INDEX idx_market_opportunities_active ON market_opportunities(is_active);
CREATE INDEX idx_market_opportunities_valid_till ON market_opportunities(valid_till) WHERE valid_till IS NOT NULL;

-- Unique index to prevent duplicate active opportunities
CREATE UNIQUE INDEX idx_market_opportunities_unique_active
ON market_opportunities(hub_id, supplier_id, product_packaging_spec_id)
WHERE is_active = TRUE;

-- Update trigger
CREATE TRIGGER update_market_opportunities_updated_at
    BEFORE UPDATE ON market_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE market_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view market_opportunities" ON market_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create market_opportunities" ON market_opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update market_opportunities" ON market_opportunities
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete market_opportunities" ON market_opportunities
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON market_opportunities TO authenticated;
GRANT ALL ON market_opportunities TO anon;
GRANT ALL ON market_opportunities TO service_role;
```

## TypeScript Types

### 1. Create `src/types/market-potential.ts`
*Copy from `trade-potential.ts` but replace customer → hub*

```typescript
export interface MarketPotential {
  id: string
  hub: {                    // Instead of customer
    id: string
    name: string
    hubCode: string
    city: string
    country: string
  }
  supplier: {
    id: string
    name: string
    city: string
    country: string
    defaultHubId?: string
    defaultHubName?: string
  }
  product: {
    id: string
    name: string
    category: string
    packagingLabel: string
    sizeName: string
    soldBy: string
    specId: string
    supplierProductPackagingSpecId: string
    palletDimensions: string | null
    boxesPerPallet: number
  }
  status: 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'

  hasSupplierPrice: boolean
  hasTransportRoute: boolean

  supplierPrice?: {
    id: string
    pricePerUnit: number
    currency: string
    deliveryMode: string
    hubId: string
    hubName: string
    validUntil: string
  }

  transportRoute?: {
    id: string
    transporterId: string | null
    originHubId: string
    destinationHubId: string
    originHubName: string
    destinationHubName: string
    transporterName: string
    durationDays: number
    pricePerPallet: number
    dieselSurchargePerPallet: number
    pricePerUnit: number
    unitsPerPallet: number
    customsCostPerShipment: number
    availableBands: Array<{...}>
  }

  availableTransportRoutes?: Array<{...}>

  priceGap: boolean
  transportGap: boolean
  canAddPrice: boolean
  canAddTransport: boolean
  completionScore: number
  logisticsSolution?: 'SUPPLIER_DELIVERY' | 'THIRD_PARTY_TRANSPORT' | 'MULTI_LEG_TRANSPORT' | 'UNKNOWN'

  // CRITICAL: Market Opportunity tracking (like Trade Potential has hasOpportunity)
  hasMarketOpportunity: boolean
  isActiveMarketOpportunity: boolean
  marketOpportunity?: {
    id: string
    status: string
    priority: string
    createdAt: string
    updatedAt: string
  }
}
```

### 2. Create `src/types/market-opportunities.ts`
*Copy from opportunities types*

```typescript
export type MarketOpportunityStatus = 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired' | 'all'
export type MarketOpportunityPriority = 'low' | 'medium' | 'high' | 'urgent' | 'all'

export interface MarketOpportunity {
  id: string
  hub_id: string
  supplier_id: string
  product_packaging_spec_id: string
  supplier_product_packaging_spec_id: string

  selected_supplier_id?: string
  selected_transporter_id?: string
  selected_route_id?: string
  selected_transport_band_id?: string

  price_source_hub_id?: string
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_unit?: number
  transport_cost_per_pallet?: number
  diesel_surcharge_per_pallet?: number

  margin_percentage: number
  custom_markup?: number
  delivered_price_per_unit?: number

  valid_till?: string
  is_active: boolean
  status: string
  priority: string

  internal_notes?: string
  supplier_notes?: string

  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string

  // Joined data
  hub?: {
    id: string
    name: string
    hub_code: string
  }
  supplier?: {
    id: string
    name: string
  }
  product_packaging_spec?: {
    // ...
  }
}
```

## React Hooks

### 1. Create `src/hooks/use-market-potential.ts`
*Copy from `use-trade-potential.ts`*

Key differences:
- Query hubs instead of customers
- Join with hubs table instead of customers
- Check for market_opportunities instead of opportunities
- Set `hasMarketOpportunity` flag

```typescript
// In the query, join with market_opportunities
const { data: existingMarketOpportunities } = await supabase
  .from('market_opportunities')
  .select('*')
  .eq('is_active', true)

// When creating potentials, check if market opportunity exists
const existingMarketOpportunity = existingMarketOpportunities?.find(
  opp =>
    opp.hub_id === hub.id &&
    opp.supplier_id === supplier.id &&
    opp.product_packaging_spec_id === spec.id
)

const hasMarketOpportunity = !!existingMarketOpportunity
const isActiveMarketOpportunity = existingMarketOpportunity?.is_active ?? false
```

### 2. Create `src/hooks/use-market-opportunities.ts`
*Copy from `use-opportunities.ts`*

Standard CRUD hooks:
- useMarketOpportunities(status, priority, activeOnly, assignedTo)
- useMarketOpportunitySummary()
- useCreateMarketOpportunity()
- useUpdateMarketOpportunity()
- useDeleteMarketOpportunity()

## Pages & Components

### 1. Create `/src/app/trade/market-potential/page.tsx`
*Copy from `/src/app/trade/potential/page.tsx`*

Changes:
- Title: "MARKET POTENTIAL"
- Description: "Hub → Supplier product matches and their opportunity status"
- Filter by hub instead of customer
- Show hasMarketOpportunity status
- Link to "/trade/market-opportunity"

### 2. Create `/src/app/trade/market-potential/components/table-mode.tsx`
*Copy from trade potential table-mode.tsx*

Changes:
- Hub column instead of Customer column
- Filter by hub instead of customer
- Check `hasMarketOpportunity` instead of `hasOpportunity`
- Create market opportunities instead of trade opportunities

### 3. Create `/src/app/trade/market-opportunity/page.tsx`
*Copy from `/src/app/trade/trader/page.tsx`*

Changes:
- Title: "MARKET OPPORTUNITIES"
- Description: "Manage active hub product catalogs"
- Hub column instead of Customer
- Use market opportunity hooks

## Navigation Updates

### Update Sidebar (`src/components/layout/app-sidebar.tsx`)

Add to Trade section:
```typescript
{
  href: '/trade/market-potential',
  label: 'Market Potential',
  icon: Store,
},
{
  href: '/trade/market-opportunity',
  label: 'Market Opportunities',
  icon: Eye,
},
```

### Update Trade Dashboard (`src/app/trade/page.tsx`)

Add cards for Market Potential and Market Opportunities

## Implementation Order

1. **Database**
   - Create market_opportunities table migration
   - Apply migration

2. **Types**
   - Create market-potential.ts
   - Create market-opportunities.ts

3. **Hooks**
   - Create use-market-potential.ts (copy from use-trade-potential.ts)
   - Create use-market-opportunities.ts (copy from use-opportunities.ts)

4. **Market Potential Page**
   - Create /app/trade/market-potential/page.tsx
   - Create /app/trade/market-potential/components/table-mode.tsx
   - Copy all supporting components

5. **Market Opportunities Page**
   - Create /app/trade/market-opportunity/page.tsx
   - Copy opportunity management UI

6. **Navigation**
   - Add to sidebar
   - Add to trade dashboard

## Key Pattern to Follow

### Trade System (existing):
```
Customer Requests → Trade Potential → Create Opportunities → Trade Opportunities (active management)
```

### Market System (new):
```
Hub Selection → Market Potential → Create Opportunities → Market Opportunities (active management)
```

## Critical Differences from Old Implementation

❌ **OLD (wrong)**:
- Tried to create custom solution
- Different pattern from Trade
- Cache functions and complex pricing
- Didn't track opportunity relationship

✅ **NEW (correct)**:
- **Exact copy** of Trade Potential pattern
- Hub-based instead of customer-based
- Uses same opportunity tracking
- Same UI components and flow
- `hasMarketOpportunity` flag (like `hasOpportunity`)
