# Claude Code Assistant Rules

> **Mandatory reference document for all development work**

## Core Principles

### Database First Approach
- **ALWAYS** consult `database-schema.md` before making any database-related changes
- **VERIFY** enum values, table structures, and relationships before coding
- **ENSURE** all form fields match database column types and constraints
- **CHECK** foreign key relationships when implementing data connections

### Before Coding
- **BP-1 (MUST)** Ask clarifying questions before starting any work
- **BP-2 (SHOULD)** Draft and confirm approach for complex tasks - write md files with the plan
- **BP-3 (MUST)** Check similar parts of codebase for consistency 

### Planning & Analysis Process

1. **Understand Requirements**
   - Read the user request carefully
   - Identify all components that need to be created/modified
   - Check dependencies and relationships

2. **Database Schema Review**
   - Open and consult `database-schema.md`
   - Verify table structures, enums, and constraints
   - Check existing relationships and foreign keys
   - Ensure form validation matches database requirements

3. **Codebase Analysis**
   - Look for similar existing implementations
   - Follow established patterns and conventions
   - Check imports and dependencies in similar files
   - Maintain consistent naming and structure

4. **Implementation Planning**
   - Break down complex tasks into smaller steps
   - Use TodoWrite tool to track progress
   - Plan the order of implementation (dependencies first)
   - Consider error handling and edge cases

### Development Standards

#### Forms & Validation
- Use React Hook Form with Zod validation
- Match validation schema to database constraints
- Use correct enum values from `database-schema.md`
- Include proper error handling and user feedback

#### Data Fetching
- Use TanStack Query for all data operations
- Implement proper loading states and error handling
- Follow established patterns in `hooks/use-products.ts`
- Cache invalidation after mutations

#### UI Components
- Use shadcn/ui components consistently
- Follow established Dialog patterns for forms
- Maintain consistent spacing and layout
- Use proper accessibility attributes

#### Database Operations
- Always use Supabase client
- Include proper error handling
- Use transactions for related operations
- Follow RLS policies and permissions

### File Organization
- Forms go in `components/forms/`
- Data hooks in `hooks/`
- Pages in `app/[route]/`
- Shared utilities in `lib/`

### Error Prevention Checklist

Before implementing any feature:
- [ ] Consulted `database-schema.md`
- [ ] Checked similar existing implementations
- [ ] Verified enum values match database
- [ ] Planned database operations and relationships
- [ ] Considered error states and validation
- [ ] Confirmed UI component availability

### Common Patterns

#### CRUD Operations
1. List view with search/filter
2. Add dialog form with validation
3. Edit dialog form with pre-populated data
4. Delete confirmation dialog
5. Toast notifications for feedback
6. Query invalidation after mutations

#### Form Structure
```typescript
const schema = z.object({
  // Match database column types exactly
})

// Use proper default values
// Handle optional fields correctly
// Include proper validation messages
```

### Emergency Procedures

If encountering errors:
1. **Check database schema first** - most errors are type/constraint mismatches
2. **Verify enum values** - ensure form options match database enums
3. **Check similar implementations** - follow established patterns
4. **Review database permissions** - ensure tables are accessible

---

**Remember**: This document should be your first reference point for any development work. When in doubt, always check the database schema and existing patterns before proceeding.