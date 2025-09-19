# Trade Potential Page - Implementation Plan

## Overview
Create a new page under `/trade/potential` that shows ALL possible connections between customers and suppliers, highlighting what's missing (pricing or transport) and allowing inline editing to complete the connections.

## Page Concept
Unlike Trade Opportunities (which shows only complete matches), Trade Potential shows:
- ✅ **Complete matches** (have both pricing and transport)
- ⚠️ **Missing pricing** (transport exists, but no supplier price)
- 🚫 **Missing transport** (pricing exists, but no transport route)
- ❌ **Missing both** (no pricing and no transport)

## Core Features

### 1. Comprehensive Matching Algorithm
```typescript
interface TradePotential {
  id: string
  customer: CustomerInfo
  supplier: SupplierInfo
  product: ProductInfo
  status: 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'

  // Existing data
  hasSupplierPrice: boolean
  supplierPrice?: SupplierPrice
  hasTransportRoute: boolean
  transportRoute?: TransportRoute

  // Calculated potential
  estimatedLogistics?: LogisticsSolution
  priceGap: boolean
  transportGap: boolean

  // Actions available
  canAddPrice: boolean
  canAddTransport: boolean
}
```

### 2. Status Categories & Visual Design
- **🟢 Complete**: Green row, shows full pricing
- **🟡 Missing Price**: Yellow row, "Add Price" button
- **🔴 Missing Transport**: Red row, "Add Route" button
- **⚫ Missing Both**: Gray row, both action buttons

### 3. Inline Editing Features

#### Price Addition Modal
```typescript
interface PriceAddModal {
  supplier_id: string
  product_packaging_spec_id: string
  hub_id: string
  price_per_unit: number
  currency: string
  delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  valid_until: date
  min_order_quantity?: number
}
```

#### Transport Route Addition
- Quick route creator
- Origin/destination hub selection
- Basic pricing input
- Duration estimation

## Database Requirements

### New Views/Queries Needed

#### 1. Complete Product-Customer-Supplier Matrix
```sql
-- Get ALL possible combinations
WITH customer_requirements AS (
  SELECT DISTINCT
    c.id as customer_id,
    c.name as customer_name,
    cpps.product_packaging_spec_id,
    pps.id as spec_id
  FROM customers c
  JOIN customer_product_packaging_spec cpps ON c.id = cpps.customer_id
  JOIN product_packaging_specs pps ON cpps.product_packaging_spec_id = pps.id
),
supplier_capabilities AS (
  SELECT DISTINCT
    s.id as supplier_id,
    s.name as supplier_name,
    spps.product_packaging_spec_id,
    pps.id as spec_id
  FROM suppliers s
  JOIN supplier_product_packaging_spec spps ON s.id = spps.supplier_id
  JOIN product_packaging_specs pps ON spps.product_packaging_spec_id = pps.id
)
SELECT
  cr.customer_id,
  cr.customer_name,
  sc.supplier_id,
  sc.supplier_name,
  cr.product_packaging_spec_id,
  -- Check if pricing exists
  CASE WHEN sp.id IS NOT NULL THEN true ELSE false END as has_pricing,
  -- Check if transport exists (simplified)
  CASE WHEN tr.id IS NOT NULL THEN true ELSE false END as has_transport
FROM customer_requirements cr
CROSS JOIN supplier_capabilities sc ON cr.product_packaging_spec_id = sc.product_packaging_spec_id
LEFT JOIN current_supplier_prices sp ON sc.supplier_id = sp.supplier_id
  AND cr.product_packaging_spec_id = sp.product_packaging_spec_id
LEFT JOIN transporter_routes tr ON tr.origin_hub_id = sp.hub_id -- Simplified join
```

#### 2. Gap Analysis Query
```sql
-- Identify specific gaps for each potential connection
SELECT
  customer_id,
  supplier_id,
  product_packaging_spec_id,
  CASE
    WHEN has_pricing AND has_transport THEN 'complete'
    WHEN has_pricing AND NOT has_transport THEN 'missing_transport'
    WHEN NOT has_pricing AND has_transport THEN 'missing_price'
    ELSE 'missing_both'
  END as gap_status,
  -- Missing price details
  CASE WHEN NOT has_pricing THEN
    json_build_object(
      'supplier_id', supplier_id,
      'product_spec_id', product_packaging_spec_id,
      'suggested_hub', supplier_default_hub_id
    )
  END as price_gap_details,
  -- Missing transport details
  CASE WHEN NOT has_transport THEN
    json_build_object(
      'origin_hub', supplier_hub_id,
      'destination_hubs', customer_delivery_hubs
    )
  END as transport_gap_details
FROM trade_potential_matrix
```

## Page Layout & UI Design

### Header Section
```jsx
<div className="mb-6">
  <h1>Trade Potential</h1>
  <p>All possible customer-supplier connections and missing links</p>

  <div className="flex gap-4 mt-4">
    <StatusFilter status="all" count={totalCount} />
    <StatusFilter status="complete" count={completeCount} />
    <StatusFilter status="missing_price" count={missingPriceCount} />
    <StatusFilter status="missing_transport" count={missingTransportCount} />
    <StatusFilter status="missing_both" count={missingBothCount} />
  </div>
</div>
```

### Main Table
```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Customer</TableHead>
      <TableHead>Product</TableHead>
      <TableHead>Supplier</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Price</TableHead>
      <TableHead>Transport</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {potentials.map(potential => (
      <PotentialRow key={potential.id} potential={potential} />
    ))}
  </TableBody>
</Table>
```

### Row Component
```jsx
function PotentialRow({ potential }) {
  const statusColor = {
    complete: 'bg-green-50 border-green-200',
    missing_price: 'bg-yellow-50 border-yellow-200',
    missing_transport: 'bg-red-50 border-red-200',
    missing_both: 'bg-gray-50 border-gray-200'
  }[potential.status]

  return (
    <TableRow className={statusColor}>
      <TableCell>{potential.customer.name}</TableCell>
      <TableCell>{potential.product.name}</TableCell>
      <TableCell>{potential.supplier.name}</TableCell>
      <TableCell>
        <StatusBadge status={potential.status} />
      </TableCell>
      <TableCell>
        {potential.hasSupplierPrice ? (
          <PriceDisplay price={potential.supplierPrice} />
        ) : (
          <Button size="sm" onClick={() => openAddPriceModal(potential)}>
            Add Price
          </Button>
        )}
      </TableCell>
      <TableCell>
        {potential.hasTransportRoute ? (
          <TransportDisplay route={potential.transportRoute} />
        ) : (
          <Button size="sm" onClick={() => openAddTransportModal(potential)}>
            Add Route
          </Button>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger>⋮</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => viewDetails(potential)}>
              View Details
            </DropdownMenuItem>
            {potential.status === 'complete' && (
              <DropdownMenuItem onClick={() => createOpportunity(potential)}>
                Create Opportunity
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
```

## Implementation Steps

### Phase 1: Data Foundation
1. **Create comprehensive matching query**
   - Get all customer requirements
   - Get all supplier capabilities
   - Cross-join to create complete matrix
   - Add pricing and transport existence checks

2. **Build gap analysis logic**
   - Identify missing pricing
   - Identify missing transport routes
   - Calculate completion percentage

### Phase 2: Basic Page Structure
1. **Create `/app/trade/potential/page.tsx`**
2. **Add navigation link in main nav**
3. **Create basic table layout**
4. **Implement status filtering**

### Phase 3: Inline Editing
1. **Price Addition Modal**
   - Form validation with Zod
   - Insert into supplier_prices table
   - Refresh data after submission

2. **Transport Route Addition Modal**
   - Hub selection dropdowns
   - Basic route validation
   - Insert into transporter_routes

### Phase 4: Advanced Features
1. **Bulk actions**
   - Select multiple rows
   - Bulk price updates
   - Bulk route creation

2. **Export capabilities**
   - Export gap analysis
   - Export complete potentials

3. **Analytics dashboard**
   - Completion rates by supplier
   - Most needed transport routes
   - Pricing gap analysis

## File Structure
```
src/
├── app/trade/potential/
│   ├── page.tsx                 # Main potential page
│   └── components/
│       ├── potential-table.tsx  # Main table component
│       ├── potential-row.tsx    # Individual row
│       ├── status-filter.tsx    # Filter buttons
│       ├── add-price-modal.tsx  # Price addition form
│       └── add-route-modal.tsx  # Route addition form
├── hooks/
│   ├── use-trade-potential.ts   # Main data hook
│   ├── use-add-supplier-price.ts
│   └── use-add-transport-route.ts
└── types/
    └── trade-potential.ts       # TypeScript interfaces
```

## API/Hook Requirements

### Main Data Hook
```typescript
export function useTradePotential() {
  return useQuery({
    queryKey: ['trade-potential'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_trade_potential_matrix')

      if (error) throw error
      return data
    }
  })
}
```

### Price Addition Hook
```typescript
export function useAddSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (priceData: NewSupplierPrice) => {
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert(priceData)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['trade-potential'])
      queryClient.invalidateQueries(['trade-opportunities'])
    }
  })
}
```

## Success Metrics
- **Completeness Rate**: % of potential connections that are complete
- **Gap Closure**: Track how many gaps are filled over time
- **User Engagement**: How often inline editing features are used
- **Conversion Rate**: Potentials that become actual opportunities

## Future Enhancements
1. **Smart Suggestions**: AI-powered price and route suggestions
2. **Bulk Import**: CSV upload for pricing and routes
3. **Integration**: Connect with external pricing APIs
4. **Workflows**: Approval processes for price/route additions
5. **Analytics**: Advanced reporting and forecasting

This page will provide a comprehensive view of the entire trade ecosystem and empower users to actively complete missing connections to create more trade opportunities.