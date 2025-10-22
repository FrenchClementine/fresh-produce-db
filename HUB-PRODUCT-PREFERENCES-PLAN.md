# Hub Product Preferences Implementation Plan

## Overview
Create a system to manage which products each hub is interested in. This acts as a filter for Market Potential - showing only the products a hub wants.

**Think of it like**: Customer Requests (customer wants specific products) → Hub Preferences (hub wants specific products)

## Database Schema

### Table: `hub_product_preferences`

```sql
CREATE TABLE hub_product_preferences (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Packaging preferences (optional - can prefer specific packaging)
  packaging_option_id UUID REFERENCES packaging_options(id),
  size_option_id UUID REFERENCES size_options(id),

  -- If they want a specific product_packaging_spec
  product_packaging_spec_id UUID REFERENCES product_packaging_specs(id),

  -- Priority and Status
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,

  -- Volume Requirements
  estimated_volume_per_week NUMERIC(10,2),
  volume_unit TEXT, -- 'kg', 'pallets', 'boxes'

  -- Notes
  notes TEXT,
  requirements TEXT, -- Quality requirements, certifications needed, etc.

  -- Metadata
  added_by UUID REFERENCES staff(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate active preferences
  CONSTRAINT unique_hub_product_preference UNIQUE (hub_id, product_id, product_packaging_spec_id, is_active)
);

-- Indexes
CREATE INDEX idx_hub_product_preferences_hub ON hub_product_preferences(hub_id);
CREATE INDEX idx_hub_product_preferences_product ON hub_product_preferences(product_id);
CREATE INDEX idx_hub_product_preferences_spec ON hub_product_preferences(product_packaging_spec_id);
CREATE INDEX idx_hub_product_preferences_active ON hub_product_preferences(is_active) WHERE is_active = true;
CREATE INDEX idx_hub_product_preferences_priority ON hub_product_preferences(priority);

-- Update trigger
CREATE TRIGGER update_hub_product_preferences_updated_at
    BEFORE UPDATE ON hub_product_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE hub_product_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view hub_product_preferences" ON hub_product_preferences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create hub_product_preferences" ON hub_product_preferences
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hub_product_preferences" ON hub_product_preferences
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete hub_product_preferences" ON hub_product_preferences
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON hub_product_preferences TO authenticated;
GRANT ALL ON hub_product_preferences TO anon;
GRANT ALL ON hub_product_preferences TO service_role;

-- View for detailed hub preferences
CREATE OR REPLACE VIEW v_hub_product_preferences_detailed AS
SELECT
    hpp.id as preference_id,
    hpp.hub_id,
    h.name as hub_name,
    h.hub_code,
    h.city_name as hub_city,
    h.country_code as hub_country,

    hpp.product_id,
    p.name as product_name,
    p.category as product_category,
    p.sold_by,

    hpp.product_packaging_spec_id,
    pps.boxes_per_pallet,
    pps.weight_per_pallet,
    pps.weight_unit,

    hpp.packaging_option_id,
    po.label as packaging_label,

    hpp.size_option_id,
    so.name as size_name,

    hpp.priority,
    hpp.is_active,
    hpp.estimated_volume_per_week,
    hpp.volume_unit,
    hpp.notes,
    hpp.requirements,

    hpp.added_by,
    hpp.added_at,
    hpp.updated_at,

    -- Count how many suppliers can provide this
    (
        SELECT COUNT(DISTINCT spps.supplier_id)
        FROM supplier_product_packaging_spec spps
        WHERE spps.product_packaging_spec_id = hpp.product_packaging_spec_id
        AND EXISTS (
            SELECT 1 FROM suppliers s
            WHERE s.id = spps.supplier_id
            AND s.is_active = true
        )
    ) as available_supplier_count

FROM hub_product_preferences hpp
JOIN hubs h ON hpp.hub_id = h.id
JOIN products p ON hpp.product_id = p.id
LEFT JOIN product_packaging_specs pps ON hpp.product_packaging_spec_id = pps.id
LEFT JOIN packaging_options po ON hpp.packaging_option_id = po.id
LEFT JOIN size_options so ON hpp.size_option_id = so.id
WHERE hpp.is_active = true;

GRANT SELECT ON v_hub_product_preferences_detailed TO authenticated;
GRANT SELECT ON v_hub_product_preferences_detailed TO anon;
GRANT SELECT ON v_hub_product_preferences_detailed TO service_role;
```

## TypeScript Types

### `src/types/hub-preferences.ts`

```typescript
export type HubPreferencePriority = 'low' | 'medium' | 'high' | 'urgent' | 'all'

export interface HubProductPreference {
  id: string
  hub_id: string
  product_id: string
  product_packaging_spec_id?: string
  packaging_option_id?: string
  size_option_id?: string
  priority: string
  is_active: boolean
  estimated_volume_per_week?: number
  volume_unit?: string
  notes?: string
  requirements?: string
  added_by?: string
  added_at: string
  updated_at: string

  // Joined data
  hub?: {
    id: string
    name: string
    hub_code: string
    city_name: string
    country_code: string
  }
  product?: {
    id: string
    name: string
    category: string
    sold_by: string
  }
  product_packaging_spec?: {
    id: string
    boxes_per_pallet: number
    weight_per_pallet: number
    weight_unit: string
  }
  packaging_option?: {
    id: string
    label: string
  }
  size_option?: {
    id: string
    name: string
  }
}

export interface HubProductPreferenceDetailed {
  preference_id: string
  hub_id: string
  hub_name: string
  hub_code: string
  hub_city: string
  hub_country: string

  product_id: string
  product_name: string
  product_category: string
  sold_by: string

  product_packaging_spec_id?: string
  boxes_per_pallet?: number
  weight_per_pallet?: number
  weight_unit?: string

  packaging_option_id?: string
  packaging_label?: string

  size_option_id?: string
  size_name?: string

  priority: string
  is_active: boolean
  estimated_volume_per_week?: number
  volume_unit?: string
  notes?: string
  requirements?: string

  added_by?: string
  added_at: string
  updated_at: string

  available_supplier_count: number
}

export interface AddHubPreferenceData {
  hub_id: string
  product_id: string
  product_packaging_spec_id?: string
  packaging_option_id?: string
  size_option_id?: string
  priority?: string
  estimated_volume_per_week?: number
  volume_unit?: string
  notes?: string
  requirements?: string
}
```

## React Hooks

### `src/hooks/use-hub-preferences.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { HubProductPreference, HubProductPreferenceDetailed, AddHubPreferenceData } from '@/types/hub-preferences'
import { toast } from 'sonner'

// Get all preferences for a hub
export function useHubPreferences(hubId?: string) {
  return useQuery({
    queryKey: ['hub-preferences', hubId],
    queryFn: async () => {
      let query = supabase
        .from('v_hub_product_preferences_detailed')
        .select('*')
        .order('priority', { ascending: false })
        .order('product_name', { ascending: true })

      if (hubId) {
        query = query.eq('hub_id', hubId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as HubProductPreferenceDetailed[]
    },
    enabled: !!hubId || hubId === undefined,
  })
}

// Get summary stats
export function useHubPreferencesSummary() {
  return useQuery({
    queryKey: ['hub-preferences-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_product_preferences')
        .select('hub_id, is_active, priority')
        .eq('is_active', true)

      if (error) throw error

      const byHub = data.reduce((acc, pref) => {
        if (!acc[pref.hub_id]) {
          acc[pref.hub_id] = { total: 0, high: 0, urgent: 0 }
        }
        acc[pref.hub_id].total++
        if (pref.priority === 'high') acc[pref.hub_id].high++
        if (pref.priority === 'urgent') acc[pref.hub_id].urgent++
        return acc
      }, {} as Record<string, { total: number; high: number; urgent: number }>)

      return {
        totalPreferences: data.length,
        byHub,
      }
    },
  })
}

// Add preference
export function useAddHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddHubPreferenceData) => {
      const { data: result, error } = await supabase
        .from('hub_product_preferences')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences', variables.hub_id] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Product preference added')
    },
    onError: (error: any) => {
      toast.error(`Failed to add preference: ${error.message}`)
    },
  })
}

// Update preference
export function useUpdateHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HubProductPreference> }) => {
      const { data, error } = await supabase
        .from('hub_product_preferences')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Preference updated')
    },
    onError: (error: any) => {
      toast.error(`Failed to update preference: ${error.message}`)
    },
  })
}

// Delete preference
export function useDeleteHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hub_product_preferences')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Preference removed')
    },
    onError: (error: any) => {
      toast.error(`Failed to remove preference: ${error.message}`)
    },
  })
}
```

## Pages & Components

### 1. Page: `/src/app/trade/hub-preferences/page.tsx`

Simple page to manage hub product preferences:
- Select hub
- View preferred products for that hub
- Add new product preferences
- Edit priority, volume requirements
- Remove preferences

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ HUB PRODUCT PREFERENCES                         │
│ Configure which products each hub wants         │
├─────────────────────────────────────────────────┤
│ Select Hub: [Dropdown]              [Add Product]│
├─────────────────────────────────────────────────┤
│ Product          | Packaging | Priority | Volume│
│ Tomatoes Roma    | Box       | High     | 50 pal│
│ Peppers Bell Red | Box       | Medium   | 30 pal│
│ Cucumbers        | Box       | Urgent   | 70 pal│
└─────────────────────────────────────────────────┘
```

### 2. Component: Add Product Dialog

Similar to other "add" dialogs:
- Search/select product
- Optional: select specific packaging spec
- Set priority
- Set estimated volume
- Add notes/requirements

## Integration with Market Potential

### Update `use-market-potential.ts`

Add parameter to filter by hub preferences:

```typescript
export function useMarketPotential(
  hubId?: string,
  statusFilter?: PotentialStatus,
  preferredOnly?: boolean  // NEW: Only show preferred products
) {
  return useQuery({
    queryKey: ['market-potential', hubId, statusFilter, preferredOnly],
    queryFn: async () => {
      // ... existing logic ...

      // If preferredOnly is true, get hub preferences
      if (preferredOnly && hubId) {
        const { data: preferences } = await supabase
          .from('hub_product_preferences')
          .select('product_id, product_packaging_spec_id')
          .eq('hub_id', hubId)
          .eq('is_active', true)

        // Filter potentials to only include preferred products
        potentials = potentials.filter(p => {
          return preferences?.some(pref => {
            // Match by product_id and optionally by spec_id
            const productMatch = pref.product_id === p.product.id
            const specMatch = !pref.product_packaging_spec_id ||
                             pref.product_packaging_spec_id === p.product.specId
            return productMatch && specMatch
          })
        })
      }

      return { potentials, summary }
    }
  })
}
```

### Update Market Potential Page

Add toggle:
```typescript
const [showPreferredOnly, setShowPreferredOnly] = useState(false)

// In the filters section:
<Label className="flex items-center gap-2">
  <Switch
    checked={showPreferredOnly}
    onCheckedChange={setShowPreferredOnly}
  />
  <span>Show Preferred Products Only</span>
</Label>
```

## Navigation

Add to sidebar under Trade section:
```typescript
{
  href: '/trade/hub-preferences',
  label: 'Hub Preferences',
  icon: Heart, // or Star, or ListCheck
}
```

## Implementation Order

1. **Database** (First!)
   - Create `hub_product_preferences` table
   - Create view `v_hub_product_preferences_detailed`

2. **Types**
   - Create `src/types/hub-preferences.ts`

3. **Hooks**
   - Create `src/hooks/use-hub-preferences.ts`

4. **Hub Preferences Page**
   - Create `/app/trade/hub-preferences/page.tsx`
   - Add product selection dialog
   - Table to manage preferences

5. **Integrate with Market Potential**
   - Add `preferredOnly` parameter to `use-market-potential.ts`
   - Add toggle to Market Potential page

6. **Navigation**
   - Add to sidebar

## Usage Flow

1. **Setup Phase**: Go to Hub Preferences page
   - Select "Paris Hub"
   - Add preferred products: Tomatoes, Peppers, Cucumbers
   - Set priorities and volume needs

2. **Discovery Phase**: Go to Market Potential page
   - Select "Paris Hub"
   - Toggle "Show Preferred Products Only" ON
   - See only Tomatoes, Peppers, Cucumbers matches
   - See which suppliers can provide them
   - Create market opportunities for the best matches

3. **Management Phase**: Go to Market Opportunities page
   - View active opportunities for Paris Hub
   - Track pricing, adjust margins
   - Manage supplier relationships
