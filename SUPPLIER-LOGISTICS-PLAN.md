# Supplier Logistics Capabilities Implementation Plan

## Database Schema Analysis

Based on `database-schema.md`, we have:

### Tables Involved:
1. **`hubs`** - Logistics hubs for routing and distribution
   - Fields: id, name, hub_code, country_code, city_name, region, is_active
   
2. **`supplier_logistics_capabilities`** - Supplier delivery capabilities between hubs
   - Fields: supplier_id, mode (delivery_mode_enum), origin_hub_id, destination_hub_id, typical_lead_time_days, fixed_operational_days (day_of_week_enum[]), notes

### Enums:
- **`delivery_mode_enum`**: 'Ex Works', 'DELIVERY', 'TRANSIT'
- **`day_of_week_enum`**: 'monday' through 'sunday'

## User Requirements Analysis

You want to:
1. Add hubs management (already partially in settings)
2. Add supplier logistics capabilities on supplier detail pages
3. Show what delivery routes each supplier can handle
4. Configure operational days and lead times

## Implementation Plan

### Phase 1: Ensure Hubs Management (Settings)
**Status**: ✅ Already implemented in settings page

### Phase 2: Add Data Hooks for Logistics
**Files to create/modify:**
- `src/hooks/use-products.ts` - Add hooks for supplier logistics capabilities

### Phase 3: Supplier Detail Page - Logistics Section
**Files to modify:**
- `src/app/suppliers/[id]/page.tsx` - Add logistics capabilities section

### Phase 4: Forms for Managing Logistics Capabilities
**Files to create:**
- `src/components/forms/add-supplier-logistics-form.tsx`
- `src/components/forms/edit-supplier-logistics-form.tsx`

## Detailed Implementation Strategy

### 1. Data Layer (Hooks)

```typescript
// Add to src/hooks/use-products.ts
export function useSupplierLogistics(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-logistics', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          *,
          origin_hub:hubs!origin_hub_id(*),
          destination_hub:hubs!destination_hub_id(*)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}
```

### 2. UI Components Structure

#### Supplier Detail Page Layout:
```
Current Layout:
- Contact Info Card
- Delivery Modes Card  
- Notes Card
- Product Offerings Card

New Layout:
- Contact Info Card
- Delivery Modes Card
- Notes Card
- **NEW: Logistics Capabilities Card**
- Product Offerings Card
```

#### Logistics Capabilities Card Features:
- Display all logistics routes (Origin → Destination)
- Show delivery mode for each route
- Display lead time and operational days
- Add/Edit/Delete capabilities
- Filter by delivery mode
- Sort by lead time or hub names

### 3. Form Requirements

#### Add Logistics Capability Form:
- **Origin Hub**: Dropdown (from active hubs)
- **Destination Hub**: Dropdown (from active hubs, exclude selected origin)
- **Delivery Mode**: Radio buttons ('Ex Works', 'DELIVERY', 'TRANSIT')
- **Lead Time**: Number input (days)
- **Operational Days**: Multi-select checkboxes (monday-sunday)
- **Notes**: Textarea

#### Validation Rules:
- Origin ≠ Destination (database constraint)
- Lead time > 0 (database constraint)
- At least one operational day selected
- Prevent duplicate routes (same origin + destination + mode)

### 4. Database Operations

#### Queries Needed:
```sql
-- Get supplier logistics with hub details
SELECT slc.*, 
       oh.name as origin_hub_name, oh.hub_code as origin_hub_code,
       dh.name as destination_hub_name, dh.hub_code as destination_hub_code
FROM supplier_logistics_capabilities slc
JOIN hubs oh ON slc.origin_hub_id = oh.id
JOIN hubs dh ON slc.destination_hub_id = dh.id
WHERE slc.supplier_id = ? 
ORDER BY oh.name, dh.name;

-- Get active hubs for dropdowns
SELECT * FROM hubs WHERE is_active = true ORDER BY name;
```

## UI/UX Considerations

### 1. Visual Design:
- Use route visualization: "Hub A → Hub B" format
- Color-code delivery modes (badges)
- Show operational days as compact pills
- Lead time as prominent metric

### 2. User Experience:
- Inline editing for quick updates
- Bulk operations for managing multiple routes
- Search/filter capabilities for large lists
- Validation feedback in real-time

### 3. Data Display:
```
Route: Amsterdam Hub → Berlin Hub
Mode: DELIVERY | Lead Time: 2 days
Operational: Mon, Wed, Fri | Notes: Express service available
```

## Implementation Order

1. **Add data hooks** (`useSupplierLogistics`, `useHubs`)
2. **Create logistics forms** (Add/Edit components)
3. **Update supplier detail page** (Add logistics section)
4. **Test with sample data** (Ask user to add hubs first)
5. **Refine UI/UX** based on usage

## Dependencies

### Required before implementation:
- [ ] Hubs must be added in Settings (we have the functionality, need data)
- [ ] Confirm if any sample hub data should be added

### Existing components we can reuse:
- ✅ Dialog patterns from supplier forms
- ✅ Badge components for modes/days
- ✅ Table components for listings
- ✅ Form validation patterns

## Questions for Clarification

1. **Data Initialization**: Should we ask you to add some sample hubs first, or create a few default ones?

2. **Route Display**: Do you want to see all routes in one table, or group by delivery mode?

3. **Operational Days**: Should we show these as abbreviated (M,T,W) or full names (Mon, Tue, Wed)?

4. **Lead Time**: Display as "X days" or allow for hours/other units?

5. **Permissions**: Should logistics capabilities be editable by all users, or restricted?

## Risk Mitigation

- Database constraint validation (origin ≠ destination)
- Enum value validation (delivery modes, days of week)  
- Prevent orphaned records if hubs are deleted
- Handle timezone considerations for operational days
- Form state management for complex multi-select fields

---

**Next Steps**: 
1. Confirm hub data strategy
2. Approve implementation approach  
3. Begin with data hooks implementation
4. Proceed with UI components