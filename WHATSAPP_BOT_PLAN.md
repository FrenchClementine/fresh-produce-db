# PSE Trade Buddy - WhatsApp Bot Plan

## Vision

A WhatsApp bot that lives inside the PSE community group chat and acts as a **trade assistant** for the team. It can both **read from** and **write to** the Supabase database, making it a two-way bridge between chat conversations and the main system.

Over time, the bot learns and expands its capabilities to become an indispensable trade buddy.

---

## Core Principles

1. **Bidirectional** - Both reads and writes to Supabase
2. **Contextual** - Knows who said what, timestamps everything
3. **Extensible** - Easy to add new capabilities over time
4. **Natural** - Understands natural language, not rigid commands
5. **Integrated** - Data flows to/from the main website seamlessly

---

## Example Interactions

### Price Logging
```
User: @bot Price of iceberg from Ponti today is 3,50/kg

Bot: Got it! Logged iceberg price from Ponti at €3.50/kg
     Saved under: Ponti > Notes > Price Updates
     Reported by: Oliver | 10 Feb 2026 14:32
```

### Price Query
```
User: @bot what is the price of iceberg today?

Bot: Iceberg prices (today):
     • Ponti: €3.50/kg (Oliver, 14:32)
     • Fresh Direct: €3.20/kg (Jan, 09:15)

     Yesterday's avg: €3.35/kg
```

### Task Management
```
User: @bot what are my tasks?

Bot: Your tasks (Oliver):
     □ Call Ponti about iceberg delivery - Due today
     □ Check transport quote for Milan run - Due tomorrow
     ✓ Update pricing sheet (completed yesterday)
```

```
User: @bot remind Jan to send the invoice for order #4521

Bot: Task created for Jan:
     "Send invoice for order #4521"
     Assigned by: Oliver
     I'll remind him tomorrow at 9:00
```

### Transport Search (Original Feature)
```
User: @bot I need transport from Venlo to Milan

Bot: Found 3 options Venlo → Milan:
     1. TransCool - €45-65/pallet, 2 days, Mon/Wed/Fri
     2. Euro Logistics - €38-52/pallet, 3 days, on demand
     3. FastFreight - €55-70/pallet, 1 day, daily

     Reply "1", "2", or "3" for contact details
```

### Customer/Supplier Notes
```
User: @bot note for Ponti: They prefer delivery before 6am

Bot: Note saved for Ponti:
     "They prefer delivery before 6am"
     Added by: Oliver | 10 Feb 2026
```

```
User: @bot what do we know about Ponti?

Bot: Ponti (Supplier):
     📍 Italy
     📞 +39 123 456 789

     Recent notes:
     • Prefers delivery before 6am (Oliver, today)
     • Good quality iceberg, consistent (Jan, 3 Feb)

     Recent prices:
     • Iceberg: €3.50/kg (today)
     • Romaine: €2.80/kg (yesterday)
```

### Quick Lookups
```
User: @bot contact for Fresh Direct

Bot: Fresh Direct
     Contact: Sarah Johnson
     📧 sarah@freshdirect.nl
     📞 +31 6 9876 5432
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WhatsApp Community Group                   │
│                                                              │
│  Oliver: @bot price of tomatoes from ABC is 2.50            │
│  Bot: ✓ Logged tomatoes €2.50/kg from ABC                   │
│  Jan: @bot what are my tasks?                               │
│  Bot: You have 3 tasks...                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Twilio WhatsApp API                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API: /api/bot/webhook                   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Parser    │  │   Router    │  │  Responder  │         │
│  │ (NLP/Intent)│─▶│  (Handler)  │─▶│  (Format)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │   Prices   │ │   Tasks    │ │ Transport  │
    │  Handler   │ │  Handler   │ │  Handler   │
    └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ bot_     │ │ bot_     │ │ bot_     │ │ customers│       │
│  │ prices   │ │ tasks    │ │ notes    │ │ products │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     PSE Website                              │
│                                                              │
│  Dashboard shows:                                           │
│  • Latest prices from WhatsApp                              │
│  • Tasks assigned via bot                                   │
│  • Notes added by team                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (New Tables)

### `bot_users` - Map WhatsApp numbers to system users
```sql
CREATE TABLE bot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT UNIQUE NOT NULL,  -- 'whatsapp:+31612345678'
  user_id UUID REFERENCES staff(id),      -- Link to existing staff
  display_name TEXT NOT NULL,             -- 'Oliver'
  preferences JSONB DEFAULT '{}',         -- Personal bot settings
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bot_price_reports` - Prices logged via WhatsApp
```sql
CREATE TABLE bot_price_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,             -- 'iceberg', 'tomatoes'
  product_id UUID REFERENCES products(id),-- Optional link to product
  supplier_name TEXT,                     -- 'Ponti'
  supplier_id UUID REFERENCES customers(id), -- Optional link to customer
  price DECIMAL(10,2) NOT NULL,           -- 3.50
  currency TEXT DEFAULT 'EUR',
  unit TEXT DEFAULT 'kg',                 -- 'kg', 'box', 'pallet'
  reported_by UUID REFERENCES bot_users(id),
  raw_message TEXT,                       -- Original message for context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_price_reports_product ON bot_price_reports(product_name, created_at DESC);
CREATE INDEX idx_price_reports_supplier ON bot_price_reports(supplier_name, created_at DESC);
```

### `bot_tasks` - Tasks created/managed via WhatsApp
```sql
CREATE TABLE bot_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES bot_users(id),
  created_by UUID REFERENCES bot_users(id),
  due_date TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',          -- 'pending', 'in_progress', 'completed'
  related_customer_id UUID REFERENCES customers(id),
  related_order_id UUID,                  -- If referencing an order
  raw_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### `bot_notes` - Notes attached to customers/suppliers
```sql
CREATE TABLE bot_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  created_by UUID REFERENCES bot_users(id),
  note_type TEXT DEFAULT 'general',       -- 'general', 'price', 'quality', 'logistics'
  raw_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bot_messages` - Message log for context & debugging
```sql
CREATE TABLE bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT NOT NULL,
  direction TEXT NOT NULL,                -- 'inbound', 'outbound'
  message_body TEXT,
  parsed_intent TEXT,                     -- 'log_price', 'query_price', 'task', etc.
  parsed_data JSONB,                      -- Extracted entities
  group_id TEXT,                          -- WhatsApp group identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Intent System

The bot recognizes these intents from natural language:

| Intent | Triggers | Action |
|--------|----------|--------|
| `log_price` | "price of X from Y is Z" | Write to `bot_price_reports` |
| `query_price` | "what is the price of X" | Read from `bot_price_reports` |
| `list_tasks` | "what are my tasks" | Read from `bot_tasks` |
| `create_task` | "remind X to Y", "task for X" | Write to `bot_tasks` |
| `complete_task` | "done with X", "completed X" | Update `bot_tasks` |
| `add_note` | "note for X: Y" | Write to `bot_notes` |
| `query_entity` | "what do we know about X" | Read notes, prices, info |
| `search_transport` | "transport from X to Y" | Query transporter_routes |
| `get_contact` | "contact for X" | Query customers |
| `help` | "help", "what can you do" | List capabilities |

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── bot/
│           ├── webhook/
│           │   └── route.ts           # Main Twilio webhook
│           └── test/
│               └── route.ts           # Dev testing endpoint
│
├── lib/
│   └── bot/
│       ├── index.ts                   # Main exports
│       ├── twilio-client.ts           # Twilio SDK wrapper
│       ├── parser/
│       │   ├── index.ts               # Main parser
│       │   ├── intent-classifier.ts   # Determine intent
│       │   └── entity-extractor.ts    # Extract products, prices, names
│       ├── handlers/
│       │   ├── index.ts               # Handler router
│       │   ├── price-handler.ts       # Log & query prices
│       │   ├── task-handler.ts        # Task management
│       │   ├── note-handler.ts        # Notes management
│       │   ├── transport-handler.ts   # Transport search
│       │   ├── contact-handler.ts     # Contact lookups
│       │   └── help-handler.ts        # Help & onboarding
│       ├── formatters/
│       │   └── response-formatter.ts  # Format for WhatsApp
│       └── db/
│           ├── price-repo.ts          # Price CRUD
│           ├── task-repo.ts           # Task CRUD
│           ├── note-repo.ts           # Note CRUD
│           └── user-repo.ts           # User mapping
│
├── components/
│   └── bot/
│       ├── price-feed.tsx             # Show bot-logged prices on site
│       ├── task-list.tsx              # Show bot tasks on site
│       └── activity-log.tsx           # Recent bot activity
│
└── types/
    └── bot.ts                         # TypeScript interfaces
```

---

## Implementation Phases

### Phase 1: Foundation (Current Focus)
- [ ] Twilio account setup + WhatsApp sandbox
- [ ] Basic webhook that receives and logs messages
- [ ] Bot user registration (map WhatsApp numbers to staff)
- [ ] Simple echo/help response

### Phase 2: Price Logging
- [ ] Parse "price of X from Y is Z" messages
- [ ] Create `bot_price_reports` table
- [ ] Store prices with user attribution
- [ ] Query "what is the price of X"
- [ ] Show prices on website dashboard

### Phase 3: Task Management
- [ ] Parse task creation commands
- [ ] Create `bot_tasks` table
- [ ] "What are my tasks" query
- [ ] Task completion via chat
- [ ] Scheduled reminders

### Phase 4: Notes & Context
- [ ] "Note for X" command
- [ ] "What do we know about X" query
- [ ] Link notes to customers/suppliers
- [ ] Show notes on customer pages

### Phase 5: Transport Integration
- [ ] Integrate existing transport search
- [ ] Format results for WhatsApp
- [ ] Follow-up for contact details

### Phase 6: Intelligence
- [ ] Fuzzy matching for product/supplier names
- [ ] Auto-link to existing database records
- [ ] Price trend analysis
- [ ] Proactive alerts ("Iceberg prices up 20% this week")

---

## Environment Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Bot Config
BOT_TRIGGER=@bot                    # or @PSEBOT, etc.
BOT_DEFAULT_CURRENCY=EUR
BOT_TIMEZONE=Europe/Amsterdam
```

---

## Security & Permissions

1. **User Verification** - Only registered `bot_users` can write data
2. **Group Restriction** - Optionally limit to specific WhatsApp groups
3. **Audit Trail** - All changes logged with `raw_message` and `created_by`
4. **Rate Limiting** - Prevent spam/abuse
5. **Signature Validation** - Verify requests from Twilio

---

## Website Integration Points

### Dashboard Widget
Show recent bot activity:
- Latest price reports
- Tasks created/completed
- Notes added

### Customer Page
- Notes logged via bot
- Price history from bot reports
- Tasks related to customer

### Price Tracker
- Dedicated page showing all bot-logged prices
- Filter by product, supplier, date
- Price trend charts

---

## Questions to Decide

1. **Trigger word**: `@bot`, `@PSEBOT`, `@PSE`, or something else?
2. **User onboarding**: How do team members register their WhatsApp number?
3. **Permissions**: Can anyone log prices, or only certain roles?
4. **Group vs DM**: Should bot work in group chat only, DMs only, or both?
5. **Product matching**: Strict matching to existing products or allow freeform?
6. **Notifications**: Should bot proactively message (reminders, alerts)?

---

## Next Steps

1. **Decide on trigger word and basic config**
2. **Set up Twilio account and WhatsApp sandbox**
3. **Create database tables**
4. **Build Phase 1: Basic webhook + user registration**
5. **Test with team in sandbox mode**
