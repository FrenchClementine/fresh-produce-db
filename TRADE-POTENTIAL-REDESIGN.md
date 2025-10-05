# Trade Potential Page - High-Volume Processing Redesign

## Current State Analysis

### What Works ✅
- Good filtering (Status, Customer, Supplier, Agent)
- Clear status indicators (Complete, Missing Price, Missing Transport, Missing Both)
- Summary cards show counts at a glance
- "Hide converted" toggle to reduce noise

### Pain Points ❌
- **Slow decision-making**: Each item requires multiple clicks (View → Create Opportunity OR Mark as Non-viable)
- **No bulk actions**: Can only process one at a time
- **Table too wide**: Requires horizontal scrolling, hard to scan
- **Limited sorting**: Can't prioritize by margin, urgency, or readiness
- **No keyboard shortcuts**: Everything requires mouse clicks
- **Visual clutter**: Too much information per row
- **No quick preview**: Must click "View" to see details
- **Repetitive actions**: Same action repeated for similar items

### Use Case: Daily Review (50+ Potentials)

**Current workflow:**
1. Scan through table
2. Click "View" on interesting item
3. Navigate to detail page
4. Decide: Create Opportunity or Mark Non-viable
5. Go back to list
6. Repeat 50 times
7. **Time: 20-30 minutes** ⏱️

**Goal: Reduce to 5-10 minutes** 🎯

---

## Redesign Strategy

### Core Principles

1. **Decision-First UI** - Make it easy to decide quickly (Yes/No/Maybe)
2. **Bulk Operations** - Process multiple items at once
3. **Smart Prioritization** - Show best opportunities first
4. **Minimal Clicks** - Inline actions, no navigation needed
5. **Keyboard Navigation** - Power users can fly through
6. **Progressive Disclosure** - Show essentials, hide details until needed

---

## Solution: Multi-Mode Interface

### Mode 1: Queue Mode (NEW - Primary for high volume) 🚀

**Card-based, Tinder-like interface for rapid decision-making**

```
┌────────────────────────────────────────────────────────────────┐
│ Trade Potential Queue                    [Filters ▼] [38 items]│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🏢 Frutas Martinas (Spain) → G's Fresh (UK)            │ │
│  │  🥬 Chinese Cabbage • Carton - 8 Pieces                  │ │
│  │                                                          │ │
│  │  💰 Cost: €7.60  •  Offer: €8.75  •  Margin: €1.15 (15%)│ │
│  │  🚚 Supplier Transport • 1 day                          │ │
│  │  ⏰ Valid until: Oct 09, 2025                           │ │
│  │                                                          │ │
│  │  ✅ Complete - Ready to create opportunity              │ │
│  │                                                          │ │
│  │  [←  Skip] [↓  Non-viable] [✓  Create Opportunity  →]  │ │
│  │     (A)         (S)              (D - Enter)            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Progress: ████████░░░░░░░░░░░░ 8/38 reviewed                 │
│                                                                 │
│  Quick Stats:                                                   │
│  ✓ Approved: 5  •  ✗ Rejected: 3  •  ⏭️  Skipped: 0          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**How it works:**
1. Shows ONE item at a time (focus)
2. Big, clear decision buttons
3. Keyboard shortcuts:
   - **A** = Skip (review later)
   - **S** = Mark as Non-viable
   - **D or Enter** = Create Opportunity (most common action)
   - **Space** = Expand details
4. Auto-advances to next item after decision
5. Undo last action (Ctrl+Z)
6. Shows progress bar

**Benefits:**
- ⚡ Ultra-fast: 5-10 seconds per item
- 🎯 Focused: One decision at a time
- ⌨️ Keyboard-friendly: Hands never leave keyboard
- 📊 Progress tracking: See how many left
- 🔄 Undo mistakes easily

### Mode 2: Bulk Actions Mode (NEW) 📦

**Checkbox-based for batch operations**

```
┌────────────────────────────────────────────────────────────────┐
│ Trade Potential - Bulk Actions          [Select All] [Clear]   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Selected: 12 items                                             │
│  [Create 12 Opportunities] [Mark 12 as Non-viable] [Export]   │
│                                                                 │
│  ☑ Customer           Supplier        Product         Margin   │
│  ────────────────────────────────────────────────────────────  │
│  ☑ Frutas Martinas    G's Fresh       Chinese Cabbage  €1.15   │
│  ☑ G's Fresh UK       Compliment BV   Iceberg Lettuce  €0.20   │
│  ☑ Barba Stathis      Compliment BV   Iceberg Lettuce  €0.20   │
│  ☐ ...                                                          │
│                                                                 │
│  Smart Selections:                                              │
│  • Select all "Complete" items (3)                             │
│  • Select all with margin >10% (8)                             │
│  • Select all from G's Fresh supplier (5)                      │
│  • Select all expiring in 7 days (2)                           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Select multiple items
- Bulk create opportunities
- Bulk mark as non-viable
- Smart selection presets
- Export to CSV

### Mode 3: Table Mode (Enhanced Current View) 📊

Keep table mode but enhance it:

**Enhancements:**
1. **Inline Actions** - No need to click "View"
   - Hover row → Quick action buttons appear
   - Right-click context menu

2. **Expandable Rows** - Click row to expand details inline
   ```
   [+] Frutas Martinas | G's Fresh | Chinese Cabbage | €1.15 margin | ✓ Complete

   Expanded:
   [-] Frutas Martinas | G's Fresh | Chinese Cabbage | €1.15 margin | ✓ Complete
       ├─ Cost: €7.60 • Offer: €8.75 • Margin: 15%
       ├─ Transport: Supplier Transport (1 day)
       ├─ Valid until: Oct 09, 2025
       └─ [Create Opportunity] [Mark Non-viable] [View Full Details]
   ```

3. **Column Customization** - Show/hide columns
4. **Advanced Sorting** - By margin %, days until expiry, completion status
5. **Quick Filters** - Above table, one-click apply
   - [Complete Only] [Margin >10%] [Expiring <7 days] [Has Opportunity]

### Mode 4: Kanban Board (NEW - For visual thinkers) 🎯

**Drag & drop interface**

```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ 🆕 New        │ ⏳ Reviewing  │ ✅ Approved   │ ❌ Rejected   │
│ (15)          │ (8)           │ (12)          │ (3)           │
├───────────────┼───────────────┼───────────────┼───────────────┤
│ [Card]        │ [Card]        │ [Card]        │ [Card]        │
│ Frutas→G's    │ G's→Comp.     │ Barba→Comp.   │ ...           │
│ €1.15 margin  │ €0.20 margin  │ €0.20 margin  │               │
│               │               │               │               │
│ [Card]        │ [Card]        │ ...           │               │
│ ...           │ ...           │               │               │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

**Drag items between columns to change status**
- New → Reviewing = Start reviewing
- Reviewing → Approved = Create opportunity
- Reviewing → Rejected = Mark as non-viable

---

## Feature Breakdown

### 1. Smart Prioritization 🎯

**Auto-sort by "Readiness Score":**

```typescript
function calculateReadinessScore(potential: TradePotential): number {
  let score = 0

  // Completion status (40 points)
  if (potential.status === 'complete') score += 40
  else if (potential.status === 'missing_price') score += 20
  else if (potential.status === 'missing_transport') score += 20
  else score += 0 // missing_both

  // Margin percentage (30 points)
  if (potential.margin_percent >= 20) score += 30
  else if (potential.margin_percent >= 15) score += 25
  else if (potential.margin_percent >= 10) score += 20
  else if (potential.margin_percent >= 5) score += 10

  // Urgency - expiring soon (20 points)
  const daysUntilExpiry = getDaysUntilExpiry(potential.supplierPrice?.validUntil)
  if (daysUntilExpiry <= 3) score += 20
  else if (daysUntilExpiry <= 7) score += 15
  else if (daysUntilExpiry <= 14) score += 10

  // Has opportunity already (10 points - deprioritize)
  if (potential.hasOpportunity) score -= 10

  return score
}
```

**Default sort:** High score → Low score (best opportunities first)

### 2. Keyboard Shortcuts ⌨️

| Key | Action | Mode |
|-----|--------|------|
| **Space** | Expand/Collapse details | All |
| **Enter or D** | Create Opportunity | Queue |
| **A** | Skip/Archive | Queue |
| **S** | Mark as Non-viable | Queue |
| **N** | Next item | Queue |
| **P** | Previous item | Queue |
| **Ctrl+Z** | Undo last action | Queue |
| **Ctrl+A** | Select all | Bulk |
| **Shift+Click** | Select range | Table |
| **/** | Focus search | All |
| **?** | Show keyboard shortcuts | All |

### 3. Inline Quick Actions 🚀

**Hover any row in table mode:**

```
[Eye icon] Preview | [✓] Create Opp | [✗] Non-viable | [Star] Priority | [Pin] Follow-up
```

**Right-click context menu:**
- Create Opportunity
- Mark as Non-viable
- Add to Follow-up List
- Add Note
- Export this Item
- View Full Details

### 4. Batch Creation Wizard 🪄

When creating multiple opportunities in bulk:

```
┌──────────────────────────────────────────────────────────┐
│ Create 12 Opportunities                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Review Items                                    │
│  ✓ Frutas Martinas → G's Fresh (€1.15 margin)          │
│  ✓ G's Fresh UK → Compliment BV (€0.20 margin)         │
│  ... (10 more)                                          │
│                                                          │
│  Step 2: Set Common Defaults                             │
│  Priority: [Medium ▼]                                   │
│  Status: [Draft ▼]                                      │
│  Assigned To: [Auto-assign by customer agent ▼]        │
│  Valid Until: [Use supplier price validity ✓]          │
│                                                          │
│  Step 3: Review & Confirm                                │
│  Will create 12 opportunities in draft status           │
│                                                          │
│  [Back] [Cancel] [Create All Opportunities]             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5. Smart Filters & Views 🔍

**Pre-configured views (Quick access tabs):**

1. **High Priority** - Complete + High margin + Expiring soon
2. **Quick Wins** - Complete status + No opportunity yet
3. **Missing Data** - Missing price OR transport (needs action)
4. **By Customer** - Grouped by customer
5. **By Supplier** - Grouped by supplier
6. **Expiring Soon** - Valid until <7 days
7. **My Items** - Assigned to me or my customers

**Filter combinations saved as views**

### 6. Progressive Disclosure 📝

**Minimal view (default):**
```
Frutas Martinas → G's Fresh | Chinese Cabbage | €1.15 (15%) | ✓ Complete
```

**Expanded view (click to expand):**
```
Frutas Martinas → G's Fresh | Chinese Cabbage | €1.15 (15%) | ✓ Complete
  Customer: Barcelona, Spain • Agent: Oliver Littlechild
  Supplier: United Kingdom
  Product: Chinese Cabbage - Carton - 8 Pieces
  Pricing: Cost €7.60 → Offer €8.75 (Margin: €1.15 / 15%)
  Transport: Supplier Transport • 1 day
  Valid until: Oct 09, 2025
  [Create Opportunity] [Mark Non-viable] [Add Note]
```

**Full details (modal or side panel):**
- Complete pricing breakdown
- Transport route details
- Customer requirements
- Supplier capabilities
- Historical data
- Alternative suppliers

---

## UI Layout Mockups

### Queue Mode - Full Screen

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Trade Potential Queue                    [Table] [Bulk] [?]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│        ┌────────────────────────────────────────────┐           │
│        │                                            │           │
│        │   🏢 Frutas Martinas → G's Fresh          │           │
│        │   📍 Barcelona, Spain → United Kingdom    │           │
│        │                                            │           │
│        │   🥬 Chinese Cabbage                      │           │
│        │   📦 Carton - 8 Pieces                    │           │
│        │                                            │           │
│        │   💰 PRICING                               │           │
│        │   Cost:   €7.60                           │           │
│        │   Offer:  €8.75                           │           │
│        │   Margin: €1.15 (15%) ✓                   │           │
│        │                                            │           │
│        │   🚚 LOGISTICS                             │           │
│        │   Supplier Transport • 1 day              │           │
│        │                                            │           │
│        │   ⏰ VALIDITY                              │           │
│        │   Valid until: Oct 09, 2025 (4 days)     │           │
│        │                                            │           │
│        │   ✅ Status: Complete                     │           │
│        │   Ready to create opportunity             │           │
│        │                                            │           │
│        └────────────────────────────────────────────┘           │
│                                                                  │
│        ┌────────────────────────────────────────────┐           │
│        │   [A] Skip      [S] Non-viable            │           │
│        │                                            │           │
│        │      [D] Create Opportunity →              │           │
│        │         (or press Enter)                   │           │
│        └────────────────────────────────────────────┘           │
│                                                                  │
│        Progress: ████████░░░░░░░░░░░░ 8/38 (21%)                │
│                                                                  │
│        Session: ✓ 5 created  •  ✗ 3 rejected  •  ⏭️ 0 skipped  │
│                                                                  │
│                                                                  │
│        [Space] Show details  •  [N] Next  •  [P] Previous       │
│        [Ctrl+Z] Undo  •  [?] All shortcuts                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Enhanced Table Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ Trade Potential                         [Queue] [Bulk] [Kanban] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Quick Views: [All] [High Priority] [Quick Wins] [Missing Data] │
│                                                                  │
│  Filters: Status [Complete ▼]  Customer [All ▼]  Sort [Score ▼] │
│                                                                  │
│  38 results • Showing 1-20                                       │
│                                                                  │
│  ☑ Customer        Supplier      Product      Margin  Actions   │
│  ──────────────────────────────────────────────────────────────│
│  ☐ Frutas Martinas G's Fresh     Chinese...   €1.15   [···]    │
│     Barcelona, ES  UK            Carton       15%     [✓][✗]   │
│                                                                  │
│  ☐ G's Fresh UK    Compliment BV Iceberg...   €0.20   [···]    │
│     Ely, UK        Venlo, NL     EPS          32%     [✓][✗]   │
│                                                                  │
│  Selected: 0 • [Select all Complete] [Select high margin >10%]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Queue Mode (Week 1-2)
- [ ] Build card-based queue UI
- [ ] Implement keyboard navigation
- [ ] Add progress tracking
- [ ] Create decision action handlers
- [ ] Undo/redo functionality
- [ ] Session statistics

### Phase 2: Bulk Actions (Week 2-3)
- [ ] Checkbox selection in table
- [ ] Bulk create opportunities
- [ ] Bulk mark as non-viable
- [ ] Smart selection presets
- [ ] Batch creation wizard

### Phase 3: Enhanced Table (Week 3-4)
- [ ] Inline expand/collapse
- [ ] Hover quick actions
- [ ] Right-click context menu
- [ ] Column customization
- [ ] Advanced sorting
- [ ] Quick filter pills

### Phase 4: Smart Features (Week 4-5)
- [ ] Readiness score algorithm
- [ ] Pre-configured views
- [ ] Saved filters
- [ ] Keyboard shortcuts panel
- [ ] Undo stack

### Phase 5: Kanban Mode (Week 5-6)
- [ ] Kanban board layout
- [ ] Drag and drop
- [ ] Status columns
- [ ] Card animations

### Phase 6: Polish (Week 6-7)
- [ ] Performance optimization
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] User preferences (default mode)
- [ ] Tutorial/onboarding

---

## Technical Implementation

### State Management

```typescript
// Queue Mode State
interface QueueState {
  items: TradePotential[]
  currentIndex: number
  decisions: {
    [itemId: string]: 'approved' | 'rejected' | 'skipped'
  }
  undoStack: Array<{
    action: 'approve' | 'reject' | 'skip'
    itemId: string
    previousIndex: number
  }>
}

// Actions
const queueActions = {
  next: () => setState({ currentIndex: state.currentIndex + 1 }),
  previous: () => setState({ currentIndex: state.currentIndex - 1 }),
  approve: (id: string) => {
    // Create opportunity
    setState({
      decisions: { ...state.decisions, [id]: 'approved' },
      undoStack: [...state.undoStack, { action: 'approve', itemId: id, previousIndex: state.currentIndex }]
    })
    queueActions.next()
  },
  reject: (id: string) => {
    // Mark as non-viable
    setState({
      decisions: { ...state.decisions, [id]: 'rejected' },
      undoStack: [...state.undoStack, { action: 'reject', itemId: id, previousIndex: state.currentIndex }]
    })
    queueActions.next()
  },
  skip: (id: string) => {
    setState({ decisions: { ...state.decisions, [id]: 'skipped' } })
    queueActions.next()
  },
  undo: () => {
    const lastAction = state.undoStack[state.undoStack.length - 1]
    // Restore previous state
    setState({
      currentIndex: lastAction.previousIndex,
      decisions: omit(state.decisions, lastAction.itemId),
      undoStack: state.undoStack.slice(0, -1)
    })
  }
}
```

### Keyboard Event Handler

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (mode !== 'queue') return

    switch(e.key.toLowerCase()) {
      case 'd':
      case 'enter':
        e.preventDefault()
        handleApprove(currentItem.id)
        break
      case 's':
        e.preventDefault()
        handleReject(currentItem.id)
        break
      case 'a':
        e.preventDefault()
        handleSkip(currentItem.id)
        break
      case 'n':
        queueActions.next()
        break
      case 'p':
        queueActions.previous()
        break
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          queueActions.undo()
        }
        break
      case ' ':
        e.preventDefault()
        toggleDetails()
        break
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [mode, currentItem])
```

---

## Performance Optimizations

1. **Virtualization** - Only render visible items in table (react-window)
2. **Pagination** - Load 50 items at a time
3. **Debounced Search** - Delay filter application
4. **Memoization** - Cache calculated scores
5. **Lazy Loading** - Load details on demand
6. **Optimistic Updates** - Instant UI feedback

---

## Success Metrics

### Target Improvements
- ⚡ **Time to process 50 items**: 20-30 min → **5-10 min** (70% faster)
- 🖱️ **Clicks per decision**: ~5 clicks → **1 click or 1 key** (80% reduction)
- ⌨️ **Keyboard workflow**: 0% → **100%** (full keyboard support)
- 📦 **Bulk operations**: 1 at a time → **50+ at once**
- 🎯 **Decision accuracy**: Improved with better prioritization

### User Satisfaction
- Easier to scan and decide: **4/5 → 5/5**
- Less repetitive strain: **3/5 → 5/5**
- More opportunities created: **+40%**
- Faster turnaround time: **-60%**

---

## Alternative Approaches Considered

### ❌ AI Auto-Decision
- Auto-create opportunities for high-scoring items
- **Rejected**: Traders need control, business rules complex

### ❌ Mobile-First Swipe Interface
- Swipe right = approve, left = reject
- **Rejected**: Desktop is primary use case

### ✅ Multi-Mode Approach (CHOSEN)
- Flexibility for different workflows
- Queue for speed, Table for analysis
- Learn user preferences over time

---

## User Preference Settings

Allow users to customize:
- Default mode (Queue/Table/Bulk/Kanban)
- Auto-advance after decision (Yes/No)
- Keyboard shortcuts customization
- Visible columns in table
- Default sort order
- Filter presets

---

## Next Steps

1. **User Testing** - Show mockups to traders, get feedback
2. **Prototype** - Build Queue Mode first (highest impact)
3. **Test with Real Data** - Import 100+ potentials
4. **Iterate** - Refine based on usage patterns
5. **Rollout** - Gradual rollout with option to use old version

---

*End of Plan*
