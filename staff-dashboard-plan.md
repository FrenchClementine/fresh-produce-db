# Staff-Specific Dashboard Implementation Plan

## Overview
Create dedicated dashboard sections for "My Transporters", "My Suppliers", and "My Customers" where staff members can only view and manage entities assigned to them, while maintaining the same functionality as the admin pages.

## Current State Analysis

### Dashboard Links (src/app/page.tsx)
Currently dashboard links point to admin pages:
- Suppliers: `/suppliers` (admin page)
- Customers: `/customers` (admin page)
- Transport: `/transporters` (admin page)

### Existing Staff Authentication
- `useCurrentStaffMember()` hook available in `src/hooks/use-staff.ts`
- Staff filtering already implemented in data hooks
- Agent-based filtering working in current implementation

## Implementation Plan

### 1. Create Staff-Specific Routes

#### New Route Structure
```
/my/suppliers/          # Staff's assigned suppliers
/my/customers/          # Staff's assigned customers
/my/transporters/       # Staff's assigned transporters
```

#### Files to Create
```
src/app/my/
├── suppliers/
│   ├── page.tsx        # Staff suppliers list
│   └── [id]/
│       └── page.tsx    # Staff supplier detail
├── customers/
│   ├── page.tsx        # Staff customers list
│   └── [id]/
│       └── page.tsx    # Staff customer detail
└── transporters/
    ├── page.tsx        # Staff transporters list
    └── [id]/
        └── page.tsx    # Staff transporter detail
```

### 2. Update Dashboard Links

#### Modify Dashboard Cards (src/app/page.tsx)
Change dashboard links from admin routes to staff routes:

**Current:**
```typescript
<Link href="/suppliers">
<Link href="/customers">
<Link href="/transporters">
```

**New:**
```typescript
<Link href="/my/suppliers">
<Link href="/my/customers">
<Link href="/my/transporters">
```

### 3. Data Filtering Strategy

#### Staff-Filtered Hooks
Create wrapper hooks that automatically filter by current staff:

```typescript
// src/hooks/use-my-data.ts
export function useMySuppliers() {
  const { data: currentStaff } = useCurrentStaffMember()
  return useSuppliers().filter(s => s.agent_id === currentStaff?.id)
}

export function useMyCustomers() {
  const { data: currentStaff } = useCurrentStaffMember()
  return useCustomers().filter(c => c.agent_id === currentStaff?.id)
}

export function useMyTransporters() {
  const { data: currentStaff } = useCurrentStaffMember()
  return useTransporters().filter(t => t.agent_id === currentStaff?.id)
}
```

### 4. Page Component Strategy

#### Option A: Wrapper Components
Create new components that wrap existing ones with staff filtering:

```typescript
// src/app/my/suppliers/page.tsx
import { SuppliersPage } from '@/app/suppliers/page'
import { withStaffFilter } from '@/components/hoc/with-staff-filter'

export default withStaffFilter(SuppliersPage)
```

#### Option B: Duplicate and Modify (Recommended)
Copy existing pages and modify for staff-specific filtering:

**Benefits:**
- More control over behavior
- Can add staff-specific features
- Clear separation of concerns
- Easier to maintain different permission levels

### 5. Navigation Updates

#### Update Sidebar Navigation (src/components/layout/app-sidebar.tsx)
Add new "My" section to navigation:

```typescript
const navigationItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/my',
    label: 'My Workspace',
    icon: User,
    children: [
      {
        href: '/my/suppliers',
        label: 'My Suppliers',
        icon: Building2,
      },
      {
        href: '/my/customers',
        label: 'My Customers',
        icon: Users,
      },
      {
        href: '/my/transporters',
        label: 'My Transporters',
        icon: Truck,
      },
    ],
  },
  // ... existing admin section
]
```

### 6. Permission System

#### Access Control
- Staff can only see entities where `agent_id = current_staff.id`
- Maintain all CRUD operations on their assigned entities
- Block access to entities assigned to other staff members

#### URL Protection
```typescript
// src/middleware.ts or page-level protection
export function withStaffAccess(Component) {
  return function StaffProtectedComponent(props) {
    const { data: currentStaff } = useCurrentStaffMember()
    const { data: entity } = useEntity(props.params.id)

    if (entity?.agent_id !== currentStaff?.id) {
      return <NotAuthorized />
    }

    return <Component {...props} />
  }
}
```

### 7. Implementation Steps

#### Phase 1: Core Infrastructure
1. Create `/my` route structure
2. Create staff-filtered data hooks
3. Update dashboard links

#### Phase 2: Pages Implementation
1. Copy and modify suppliers page (`/my/suppliers`)
2. Copy and modify customers page (`/my/customers`)
3. Copy and modify transporters page (`/my/transporters`)

#### Phase 3: Detail Pages
1. Implement supplier detail pages with staff filtering
2. Implement customer detail pages with staff filtering
3. Implement transporter detail pages with staff filtering

#### Phase 4: Navigation & Security
1. Update sidebar navigation
2. Add URL protection middleware
3. Implement proper error handling for unauthorized access

#### Phase 5: Testing & Polish
1. Test staff filtering across all pages
2. Ensure proper permissions
3. Add loading states and error handling

### 8. Data Filtering Requirements

#### Required Fields
Ensure all entities have proper agent assignment:
- `suppliers.agent_id` → `staff.id`
- `customers.agent_id` → `staff.id`
- `transporters.agent_id` → `staff.id`

#### Application-Level Filtering
All filtering will be handled at the application level using existing hooks and data structures.

### 9. UI/UX Considerations

#### Visual Distinctions
- "My" pages could have slightly different styling/branding
- Staff workspace could have personal dashboard widgets
- Different page titles: "My Suppliers" vs "All Suppliers"

#### Breadcrumbs
```typescript
Dashboard > My Workspace > My Suppliers
vs
Dashboard > Admin > Suppliers
```

### 10. Files to Modify

#### Core Files
- `src/app/page.tsx` - Update dashboard links
- `src/components/layout/app-sidebar.tsx` - Add My Workspace navigation

#### New Files to Create
- `src/app/my/suppliers/page.tsx`
- `src/app/my/customers/page.tsx`
- `src/app/my/transporters/page.tsx`
- `src/app/my/suppliers/[id]/page.tsx`
- `src/app/my/customers/[id]/page.tsx`
- `src/app/my/transporters/[id]/page.tsx`
- `src/hooks/use-my-data.ts`
- `src/components/hoc/with-staff-filter.tsx` (if using HOC approach)

### 11. Testing Checklist

#### Functionality Tests
- [ ] Staff can see only their assigned entities
- [ ] Staff cannot access other staff's entities
- [ ] All CRUD operations work for staff entities
- [ ] Dashboard links point to correct staff pages
- [ ] Navigation reflects current user's permissions

#### Security Tests
- [ ] URL manipulation doesn't allow access to unauthorized entities
- [ ] API calls are properly filtered by staff ID
- [ ] Error handling for unauthorized access attempts

### 12. Future Enhancements

#### Personal Dashboard Widgets
- My recent activities
- My pending tasks
- My performance metrics
- Quick actions for assigned entities

#### Collaboration Features
- Request reassignment of entities
- Share entities with team members
- Commenting on entities

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 2-3 hours

**Total**: 13-19 hours

## Conclusion

This implementation will provide staff members with a personalized workspace while maintaining the full functionality of the admin pages. The approach ensures data security, provides clear user experience, and sets up the foundation for future staff-specific features.