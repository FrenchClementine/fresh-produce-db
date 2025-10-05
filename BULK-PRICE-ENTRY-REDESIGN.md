# Bulk Price Entry System - Redesign Plan

## Problem Statement

Current input price page is inefficient for bulk entry:
- ❌ Can only add **one price at a time**
- ❌ Must re-select supplier for each product
- ❌ Sequential form flow (supplier → product → mode → hub → price)
- ❌ No way to quickly duplicate similar entries
- ❌ No batch operations
- ❌ Time-consuming for daily price updates (10+ products = 10+ form submissions)

**Common Use Case**: Trader receives daily price list from supplier with 15-20 products → Currently takes 5-10 minutes to enter all prices.

**Goal**: Reduce bulk entry time from 5-10 minutes to **under 1 minute**.

---

## Proposed Solution: Multi-Mode Entry System

### 3 Entry Modes (Tabbed Interface):

1. **Quick Entry** (Single) - Enhanced version of current form
2. **Bulk Entry** (NEW) - Table-based multi-row entry
3. **Import** (NEW) - CSV/Excel upload

---

## Design: Bulk Entry Mode (Primary Focus)

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Input Prices                              [Quick Entry | BULK ENTRY | Import]
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📋 BATCH CONFIGURATION                                             │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Supplier: [G's Fresh ▼]    Default Hub: [Barcelona ▼]        ││
│  │  Delivery Mode: [DELIVERY ▼]    Valid Until: [2025-10-08 📅] ││
│  │  Valid From: [2025-10-05 📅]    Currency: [EUR ▼]            ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  📝 PRICE ENTRIES              [+ Add Row] [+ Add 5 Rows] [Clear All]
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Product ▼          | Price | Boxes/Pallet | Hub ▼    | Valid   ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │ Chinese Cabbage    │ €7.60 │      65      │ Barcelona│ Same    ││
│  │ Rocket Lettuce     │ €3.20 │      80      │ Barcelona│ Same    ││
│  │ Iceberg Lettuce    │ €0.63 │     500      │ VENLO    │ +7 days ││
│  │ Cherry Tomatoes    │ €2.90 │      40      │ Barcelona│ Same    ││
│  │ [Select product...▼│  --   │      --      │   --     │  --     ││ ← New row
│  └────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  💾 [Save All (4 prices)]   [Preview]   [Cancel]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. **Batch Configuration** (Top Section)
- Set common fields once for all entries
- Applies to all rows by default
- Individual rows can override

**Fields:**
- Supplier (applies to all)
- Default Hub (can override per row)
- Default Delivery Mode (can override per row)
- Default Valid From/Until (can override per row)
- Currency (applies to all)

#### 2. **Table-Based Entry** (Middle Section)
- Spreadsheet-like interface
- Add multiple rows
- Each row = one price entry

**Columns:**
- **Product** (Dropdown) - Filtered by selected supplier
- **Price** (Number input) - Required
- **Units/Pallet** (Auto-filled from product spec, editable)
- **Hub** (Dropdown) - Defaults to batch config, can override
- **Valid Until** (Date OR quick select) - "Same" uses batch config, or "+7 days", "+1 month", custom
- **Actions** (Duplicate row, Delete row)

#### 3. **Smart Behaviors**

**Auto-complete:**
- When you select a product, auto-fill:
  - Units per pallet (from product spec)
  - Hub (from batch config)
  - Valid until (from batch config)

**Quick Duplicate:**
- "Duplicate row" button copies all fields
- Useful for similar products with slight variations

**Keyboard Navigation:**
- Tab moves to next field
- Enter saves current row and creates new one
- Shift+Enter adds new blank row

**Validation:**
- Inline validation per row
- Shows errors without blocking other rows
- Only valid rows saved on batch save

#### 4. **Batch Operations**

**Add Rows:**
- "+ Add Row" - Add one blank row
- "+ Add 5 Rows" - Add 5 blank rows
- "Duplicate All" - Copy all current rows for quick variation

**Clear:**
- "Clear All" - Remove all rows (with confirmation)
- Per-row delete icon

**Save:**
- "Save All" button - Saves all valid rows in one transaction
- Shows preview before saving
- Individual row save not allowed (batch only)

---

## Quick Entry Mode (Enhanced)

Keep current form but improve:

1. **Remember Last Values**
   - After saving, pre-fill supplier, hub, mode from last entry
   - "Repeat Last Entry" button to duplicate

2. **Quick Validity Buttons**
   - ✅ Already have: 24h, 3 days, 1 week
   - Add: "Tomorrow EOD", "End of week", "End of month"

3. **Product Quick Add**
   - If product doesn't exist for supplier, quick-add flow
   - Don't navigate away from page

---

## Import Mode (CSV/Excel)

For really large batches (50+ products):

### Upload Flow

1. **Download Template**
   ```
   Supplier, Product, Packaging, Size, Price, Hub, Mode, Valid From, Valid Until
   G's Fresh, Chinese Cabbage, Carton, 8 Pieces, 7.60, Barcelona, DELIVERY, 2025-10-05, 2025-10-08
   G's Fresh, Rocket Lettuce, Bag, 1kg, 3.20, Barcelona, DELIVERY, 2025-10-05, 2025-10-08
   ...
   ```

2. **Upload CSV/Excel**
   - Drag & drop or file picker
   - Auto-detect columns
   - Match to database fields

3. **Validation & Preview**
   - Show table of parsed data
   - Highlight errors in red
   - Allow inline corrections
   - Show what will be created

4. **Import**
   - Batch create all prices
   - Show progress bar
   - Report success/failures

### Template Variants

- **Simple Template** - Just product name and price (looks up other fields)
- **Full Template** - All fields explicit
- **Update Template** - For updating existing prices (includes price ID)

---

## Technical Implementation

### Database Optimization

**Batch Insert:**
```typescript
async function createMultiplePrices(prices: NewSupplierPrice[]) {
  // Use single transaction for all inserts
  const { data, error } = await supabase
    .from('supplier_prices')
    .insert(prices)
    .select()

  if (error) throw error
  return data
}
```

**Validation:**
```typescript
interface BulkPriceEntry {
  supplier_id: string
  product_packaging_spec_id: string
  hub_id: string
  price_per_unit: number
  delivery_mode: string
  valid_from: string
  valid_until: string
  notes?: string

  // Validation state
  isValid: boolean
  errors: {
    product?: string
    price?: string
    hub?: string
    dates?: string
  }
}
```

### Component Structure

```
src/app/trade/prices/
  page.tsx                     # Main page with tabs
  components/
    quick-entry-form.tsx       # Single entry form
    bulk-entry-table.tsx       # Bulk table (NEW)
    import-wizard.tsx          # CSV import (NEW)
    price-entry-row.tsx        # Single row in bulk table (NEW)
    batch-config-panel.tsx     # Batch config section (NEW)
```

### State Management

```typescript
// Bulk entry state
const [batchConfig, setBatchConfig] = useState({
  supplier_id: '',
  default_hub_id: '',
  default_delivery_mode: '',
  default_valid_from: today(),
  default_valid_until: '',
  currency: 'EUR'
})

const [priceRows, setPriceRows] = useState<BulkPriceEntry[]>([
  createEmptyRow()
])

// Add row
const addRow = () => {
  setPriceRows([...priceRows, createEmptyRow()])
}

// Update row
const updateRow = (index: number, field: string, value: any) => {
  const updated = [...priceRows]
  updated[index] = { ...updated[index], [field]: value }
  setPriceRows(validateRow(updated))
}

// Delete row
const deleteRow = (index: number) => {
  setPriceRows(priceRows.filter((_, i) => i !== index))
}

// Validate all
const validateAll = () => {
  return priceRows.map(row => ({
    ...row,
    isValid: validatePriceRow(row),
    errors: getRowErrors(row)
  }))
}

// Save all
const saveBulkPrices = async () => {
  const validRows = priceRows.filter(r => r.isValid)

  const prices = validRows.map(row => ({
    supplier_id: batchConfig.supplier_id,
    product_packaging_spec_id: row.product_packaging_spec_id,
    hub_id: row.hub_id || batchConfig.default_hub_id,
    price_per_unit: row.price_per_unit,
    currency: batchConfig.currency,
    delivery_mode: row.delivery_mode || batchConfig.default_delivery_mode,
    valid_from: row.valid_from || batchConfig.default_valid_from,
    valid_until: row.valid_until || batchConfig.default_valid_until,
    is_active: true,
    created_by_staff_id: currentStaff?.id
  }))

  await createMultiplePrices(prices)
  toast.success(`Saved ${prices.length} prices successfully!`)
}
```

---

## User Stories

### Story 1: Daily Price Update (15 products)

**Before (Current System):**
1. Select supplier
2. Select product #1
3. Select mode, hub
4. Enter price, validity
5. Submit
6. Repeat steps 2-5 **14 more times**
7. **Time: 5-7 minutes**

**After (Bulk Entry):**
1. Select supplier once (batch config)
2. Set default hub, mode, validity once
3. Add 15 rows
4. Fill in product and price for each (tab through)
5. Click "Save All"
6. **Time: 60-90 seconds** ✅

### Story 2: New Supplier Onboarding (20 products)

**Before:**
- 20 separate form submissions
- Repetitive supplier/hub selection
- **Time: 8-10 minutes**

**After:**
1. Set supplier once
2. Import CSV or use bulk entry
3. **Time: 2-3 minutes** ✅

### Story 3: Price Expiry Extension (10 products)

**Current:**
- Can update inline in current prices table ✅ (Good!)
- But only one at a time

**Enhancement:**
1. Select multiple rows in current prices table
2. Bulk action: "Extend validity by 7 days"
3. **Time: 10 seconds** ✅

---

## Implementation Phases

### Phase 1: Bulk Entry Core (Week 1)
- [ ] Create bulk entry tab
- [ ] Batch configuration panel
- [ ] Table-based entry with 5 rows
- [ ] Add/delete row functionality
- [ ] Basic validation
- [ ] Batch save (all rows at once)

### Phase 2: Smart Features (Week 1)
- [ ] Auto-fill from product spec
- [ ] Quick duplicate row
- [ ] Keyboard navigation
- [ ] Inline validation with error display
- [ ] Preview before save

### Phase 3: Import Mode (Week 2)
- [ ] CSV template download
- [ ] CSV upload
- [ ] Parse and validate
- [ ] Preview table
- [ ] Batch import

### Phase 4: Quick Entry Enhancements (Week 2)
- [ ] Remember last values
- [ ] "Repeat last entry" button
- [ ] More quick validity options
- [ ] Product quick-add flow

### Phase 5: Advanced Features (Week 3)
- [ ] Bulk actions on current prices table
- [ ] Excel import support
- [ ] Export current prices to CSV
- [ ] Price templates (saved configurations)
- [ ] Undo/redo for bulk entry

---

## UI/UX Principles

### 1. **Keyboard-First**
- Tab between fields
- Enter to add new row
- Escape to cancel edit
- Ctrl+S to save

### 2. **Visual Feedback**
- Green checkmark for valid rows
- Red border for invalid rows
- Yellow highlight for rows with warnings
- Progress indicator during batch save

### 3. **Error Prevention**
- Inline validation
- Clear error messages
- Prevent saving if any row invalid
- Confirmation for destructive actions

### 4. **Performance**
- Virtual scrolling for 100+ rows
- Debounced validation
- Optimistic UI updates
- Background save with toast notification

---

## Metrics & Success Criteria

**Target Improvements:**
- ✅ Reduce time to enter 15 prices: **5-7min → 1-2min** (70% faster)
- ✅ Reduce clicks per price: **~15 clicks → 2 clicks** (87% fewer)
- ✅ Support bulk operations: **1 at a time → 50+ at once**
- ✅ User satisfaction: **3/5 → 5/5** (based on trader feedback)

**Usage Metrics to Track:**
- Average prices entered per session
- Time spent on price entry page
- Bulk vs Single entry mode usage ratio
- CSV import adoption rate
- Error rate (validation failures)

---

## Visual Mockup

### Bulk Entry Mode - Full View

```
┌──────────────────────────────────────────────────────────────────┐
│ Input Prices                    [Quick | BULK | Import]          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Batch Configuration                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Supplier *      [G's Fresh ▼]                              │ │
│  │ Default Hub     [Barcelona (ES - BARCA) ▼]                 │ │
│  │ Delivery Mode   [DELIVERY ▼]                               │ │
│  │ Valid From      [2025-10-05] → Until [2025-10-12]         │ │
│  │ Quick: [+1 day] [+3 days] [+1 week] [+2 weeks] [+1 month] │ │
│  │ Currency        [EUR]                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  📝 Price Entries (4 items)    [+ Row] [+ 5 Rows] [Clear]       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ #│Product           │Price│Boxes│Hub     │Valid  │Actions  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │1│Chinese Cabbage ▼ │7.60 │  65 │Default │Default│[📋][🗑️]││
│  │ │Carton - 8 Pieces │     │     │        │       │         ││
│  │ │✅ Valid          │     │     │        │       │         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │2│Rocket Lettuce ▼  │3.20 │  80 │Default │Default│[📋][🗑️]││
│  │ │Bag - 1kg         │     │     │        │       │         ││
│  │ │✅ Valid          │     │     │        │       │         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │3│Iceberg Lettuce ▼ │0.63 │ 500 │VENLO ▼ │+7d ▼  │[📋][🗑️]││
│  │ │EPS - Process uni │     │     │        │       │         ││
│  │ │✅ Valid          │     │     │        │       │         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │4│Select product... │     │     │        │       │[🗑️]    ││
│  │ │                  │     │     │        │       │         ││
│  │ │⚪ Empty row      │     │     │        │       │         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Validation: ✅ 3 valid, ⚪ 1 empty                              │
│                                                                   │
│  [Preview Changes]  [💾 Save All (3 prices)]  [Cancel]          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Import Mode - Preview

```
┌──────────────────────────────────────────────────────────────────┐
│ Input Prices                    [Quick | Bulk | IMPORT]          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📤 Import Prices from CSV/Excel                                 │
│                                                                   │
│  Step 1: Upload File                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │     📁 Drag and drop CSV or Excel file here                │ │
│  │              or click to browse                             │ │
│  │                                                             │ │
│  │     [📥 Download Template]                                 │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Step 2: Preview & Validate (prices_2025-10-05.csv)            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Row│Supplier │Product        │Price│Hub     │Mode│Status   ││
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 1  │G's Fresh│Chinese Cabbage│7.60 │Barcelona│DEL │✅ Ready││
│  │ 2  │G's Fresh│Rocket Lettuce │3.20 │Barcelona│DEL │✅ Ready││
│  │ 3  │G's Fresh│Iceberg Lettuce│0.63 │VENLO    │EXW │✅ Ready││
│  │ 4  │G's Fresh│Unknown Product│2.50 │Barcelona│DEL │❌ Error││
│  │    │         │Product not found in database               ││
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Summary: ✅ 3 valid, ❌ 1 error                                │
│                                                                   │
│  [🔧 Fix Errors]  [💾 Import Valid Rows (3)]  [Cancel]         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alternative Approaches Considered

### ❌ Approach 1: Modal-based Multi-Entry
- Popup modal with 5 product fields
- Save all in modal
- **Rejected**: Limited screen space, can't see existing prices while entering

### ❌ Approach 2: Sidebar Batch Entry
- Slide-out sidebar with form
- Main area shows current prices
- **Rejected**: Split attention, harder to navigate

### ✅ Approach 3: Tabbed Interface (CHOSEN)
- Clear separation of modes
- Full screen space for each mode
- Easy to switch contexts
- Familiar pattern for users

---

## Next Steps

1. **User Testing** - Show mockups to 2-3 traders, get feedback
2. **Prototype** - Build Phase 1 (core bulk entry)
3. **Test with Real Data** - Import actual price list
4. **Iterate** - Refine based on usage
5. **Rollout** - Phase by phase implementation

---

## Questions for Discussion

1. Should we allow saving incomplete bulk entries (draft mode)?
2. What's the max number of rows we should support? (50? 100? Unlimited with pagination?)
3. Should we have price history comparison in bulk entry?
4. Excel import: Google Sheets link import as well?
5. Mobile support for bulk entry? Or desktop-only?

---

*End of Plan*
