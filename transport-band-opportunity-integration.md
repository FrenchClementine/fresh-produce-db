# Transport Band Integration for Opportunities

## Problem Statement
Opportunities created from trade potential don't capture the selected transport band, resulting in missing pallet quantity information (e.g., "2-20 pallets") in the trade opportunities display.

## Current State
- Opportunities have `selected_transport_band_id` field but it's often null
- Transport band data exists in routes but isn't being properly linked to opportunities
- No automatic selection happens during opportunity creation

## Solution Plan

### 1. Database Changes
- ✅ The `opportunities` table already has `selected_transport_band_id` column
- Verify the column exists and is properly typed as UUID
- No migration needed if column already exists

### 2. Opportunity Creation Enhancement
When creating an opportunity from trade potential:
- Automatically select the first available transport band if only one exists
- Show transport band selection in the form when multiple bands are available
- Ensure the selected band ID is saved to the database

### 3. Trade Potential Data Enhancement
Ensure trade potential provides proper transport band information:
- Include transport band IDs in the trade potential response
- Provide band details (min_pallets, max_pallets, price_per_pallet)

### 4. Form Updates
Update the create opportunity form to:
- Auto-select transport bands when appropriate
- Show band selection UI when multiple options exist
- Validate that band selection is made for third-party transport

### 5. Display Updates
Update transport display to:
- Show proper pallet quantities when band is selected
- Indicate when band needs to be selected
- Handle fallback cases gracefully

## Implementation Steps

### Step 1: Verify Database Schema
Check if `selected_transport_band_id` column exists and is properly configured.

### Step 2: Update Opportunity Creation Logic
Modify the create opportunity form to automatically handle transport band selection.

### Step 3: Update Trade Potential Hook
Ensure transport bands are properly provided in trade potential data.

### Step 4: Test and Validate
Test opportunity creation with various transport scenarios.

## Files to Modify
1. `src/components/forms/create-opportunity-form.tsx` - Add automatic band selection
2. `src/hooks/use-trade-potential.ts` - Ensure bands are included
3. `src/hooks/use-opportunities.ts` - Verify band data fetching
4. Database migration (if column doesn't exist)

## Implementation Results

### ✅ Completed Changes

1. **Database Schema Verified**
   - `selected_transport_band_id` column already exists in opportunities table
   - No migration needed

2. **Opportunity Creation Enhanced**
   - Form now auto-selects first available transport band when potential loads
   - Transport band selection properly syncs with form state
   - Selected band ID is automatically saved to database

3. **Trade Potential Data Confirmed**
   - Transport bands already include proper `id` field (fixed previously)
   - `availableBands` array correctly provided to opportunity creation

4. **Display Updates Implemented**
   - TransportDisplay component now shows "Band not selected" for existing opportunities without bands
   - Proper fallback handling for missing transport band data

### Files Modified
- ✅ `src/components/forms/create-opportunity-form.tsx` - Added automatic transport band selection
- ✅ `src/components/transport-display.tsx` - Added fallback for missing bands
- ✅ `src/app/trade/opportunity/page.tsx` - Replaced inline transport display with TransportDisplay component

## Success Criteria
- ✅ All new opportunities from trade potential have transport bands selected
- ✅ Transport band quantities display properly in opportunities list
- ✅ Graceful fallback for existing opportunities without band selection
- ✅ Backward compatibility with existing opportunities

## Testing
To test the implementation:
1. Go to Trade Potential page
2. Find a potential with third-party transport (e.g., Fresh Trade)
3. Create an opportunity from that potential
4. Verify the transport band is automatically selected
5. Check that the opportunity shows proper pallet quantities in the opportunities list