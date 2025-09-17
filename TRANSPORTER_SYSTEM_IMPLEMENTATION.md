# Transporter System Implementation Guide

> **Complete logistics planning system for fresh produce distribution**
> 
> Last updated: 2025-09-12

## Overview

The Transporter System extends your fresh produce database with sophisticated logistics planning capabilities. It manages third-party transporters, their route networks, dynamic pricing with diesel surcharges, and enables multi-hop route planning for complex supply chain scenarios.

## System Architecture

### Core Components

1. **Transporters** - Third-party logistics providers
2. **Routes** - Hub-to-hub transportation services  
3. **Price Bands** - Flexible pricing for groupage vs full truck loads
4. **Customs Costs** - Fixed shipment fees for international routes
5. **Route Chaining** - Multi-hop logistics optimization

### Integration with Existing System

- **Extends** your existing `hubs` table as shared infrastructure
- **Complements** `supplier_logistics_capabilities` (suppliers focus on produce, transporters handle logistics)
- **Maintains** your current hub-based distribution model

## Database Schema

### Tables Structure

```sql
transporters                    -- Logistics service providers
├── id (UUID)
├── name, email, phone_number  -- Contact information  
├── address, city, country     -- Location details
├── diesel_surcharge_percentage -- Applied to all routes
└── is_active, created_at

transporter_routes             -- Hub-to-hub services
├── id (UUID)
├── transporter_id → transporters(id)
├── origin_hub_id → hubs(id)
├── destination_hub_id → hubs(id)  
├── transport_duration_days    -- Transit time
├── fixed_departure_days[]     -- Weekly schedule ['monday', 'friday']
├── customs_cost_per_shipment  -- Fixed customs cost per shipment
├── customs_description        -- Description of customs requirements
└── is_active, created_at

transporter_route_price_bands  -- Tiered pricing by pallet size
├── id (UUID)
├── transporter_route_id → transporter_routes(id)
├── pallet_dimensions          -- '120x80' or '120x100' (cm)
├── min_pallets, max_pallets   -- Quantity tiers (e.g., 1-15, 16-26, 27+ for UK)
├── price_per_pallet           -- Base rate per pallet size
└── created_at, last_updated_at -- Price tracking
```

### Key Design Decisions

- **Pallet dimension-based pricing** - '120x80' (Euro) vs '120x100' (UK Standard)
- **Percentage-based diesel surcharge** applied to total route cost
- **Price bands** support both groupage (small quantities) and full truck pricing
- **Price history tracking** with `last_updated_at` timestamps
- **Shared hub infrastructure** - new hubs automatically available to all transporters
- **Route uniqueness** - one route per transporter per hub pair

## Functionality & Use Cases

### 1. Direct Route Planning

**Use Case**: Find all transportation options between two hubs

```sql
-- Find direct routes from Amsterdam to Barcelona for 10 pallets
SELECT * FROM find_direct_routes(
    'amsterdam-hub-uuid',
    'barcelona-hub-uuid', 
    10
);
```

**Returns**:
- Available transporters and schedules
- Base cost, diesel surcharge, customs cost, total cost
- Transit days and departure schedule
- Price age (how old the pricing is)

### 2. Cost Comparison & Analysis

**Use Case**: Compare transporter pricing and identify best options

**Features**:
- Automatic diesel surcharge calculation
- Customs cost calculation for international routes
- Price band selection based on pallet count
- Price aging alerts (prices older than X days)
- Cost breakdown (base + diesel surcharge + customs)

### 3. Route Chaining (Multi-hop Planning)

**Use Case**: Plan logistics when no direct route exists

**Example Scenario**: 
- Need to ship from Stockholm → Valencia
- No direct route available
- System finds: Stockholm → Hamburg → Valencia

```sql
-- 2-hop route discovery query included in schema
-- Finds all possible intermediate hubs
-- Calculates total transit time
-- Identifies required transporters for each leg
```

### 4. Pricing Management

**Use Case**: Track and update transporter pricing

**Features**:
- **Price Band Management**: Different rates for groupage vs full truck
- **Price Aging**: Track when prices were last updated
- **Diesel Surcharge**: Percentage-based, transporter-specific
- **Customs Costs**: Fixed per-shipment fees for international routes
- **Historical Tracking**: Last updated timestamps on all prices

### 5. Logistics Network Analysis

**Use Case**: Analyze transportation network coverage and gaps

```sql
-- Routes with outdated pricing (>30 days old)
SELECT transporter, origin, destination, days_old 
FROM pricing_age_analysis 
WHERE days_old > 30;

-- Network coverage by transporter
SELECT transporter_name, COUNT(*) as route_count
FROM active_routes_view
GROUP BY transporter_name;
```

## Implementation Features

### Smart Pricing Calculation

- **Automatic cost calculation** including diesel surcharge and customs costs
- **Quantity-based pricing** with price band selection
- **International route handling** with customs fee calculation
- **Price aging warnings** for outdated rates

### Route Optimization

- **Direct route finder** with cost comparison
- **Multi-hop route discovery** for network gaps
- **Transit time calculation** across route chains

### Data Management

- **Automatic hub creation** when adding transporters from new locations
- **Price history tracking** with update timestamps  
- **Flexible scheduling** with day-of-week departure patterns

## Practical Use Cases

### Scenario 1: Daily Route Planning

**Situation**: Planning tomorrow's deliveries from Netherlands to Spain

**Process**:
1. Query direct Amsterdam → Barcelona routes
2. Check departure schedules (e.g., Monday/Wednesday/Friday)
3. Compare costs across transporters
4. Factor in diesel surcharge percentages and customs costs
5. Select optimal transporter based on total cost + schedule

### Scenario 2: Network Gap Analysis  

**Situation**: Customer needs delivery to a location with no direct service

**Process**:
1. Search for direct routes → none found
2. Activate route chaining algorithm
3. Find intermediate hubs with connections
4. Calculate multi-hop costs and transit times
5. Present options: Rotterdam → Munich → Milan

### Scenario 3: Pricing Review & Updates

**Situation**: Monthly pricing review with transporters

**Process**:
1. Query routes with prices >30 days old
2. Contact transporters for updated rates
3. Update price bands with new diesel surcharge rates
4. Track price history and aging

### Scenario 4: Seasonal Route Planning

**Situation**: Peak season logistics planning

**Process**:
1. Analyze all available routes by destination
2. Compare full truck vs groupage pricing
3. Plan consolidation strategies
4. Optimize based on departure schedules

## Integration Points

### With Existing Supplier System

- **Suppliers** handle produce availability and basic logistics capabilities
- **Transporters** handle actual transportation between hubs  
- **Combined planning** uses both systems for complete supply chain

### With Hub Network

- **Shared infrastructure** - all transporters use same hub definitions
- **Automatic expansion** - new transporter locations become available hubs
- **Consistent addressing** - single hub system for all logistics

### Future Enhancement Opportunities

1. **Route Optimization Engine**: Multi-criteria optimization (cost + time + reliability)
2. **Capacity Management**: Track available space on scheduled routes
3. **Performance Tracking**: Delivery times, reliability scores per transporter
4. **Automated Pricing**: Integration with fuel price APIs for dynamic surcharges
5. **Load Consolidation**: Optimize groupage across multiple suppliers

## Technical Implementation

### Database Functions Included

- `calculate_route_cost()` - Cost calculation with diesel surcharge and customs costs
- `find_direct_routes()` - Direct route discovery with comprehensive pricing
- Route chaining queries for multi-hop planning
- Price aging analysis queries

### Indexes for Performance

- Hub-based routing indexes
- Departure day GIN indexes for schedule queries
- Price update timestamp indexes for aging analysis
- Transporter activity status indexes

### Sample Data Structure

```sql
-- Example: European logistics network
Transporters: European Express, Fresh Trans Solutions, Mediterranean Freight
Routes: 12 major European hub connections  

Price Bands for 120x80cm (Euro Pallets):
- Groupage: 1-15 pallets
- Part Load: 16-32 pallets  
- Full Truck: 33 pallets

Price Bands for 120x100cm (UK Standard):
- Groupage: 1-12 pallets
- Part Load: 13-25 pallets
- Full Truck: 26 pallets

Diesel Surcharge: 12.5% - 20% depending on transporter
Customs Costs: €150-350 per shipment for international routes
```

## Getting Started

1. **Run the SQL schema** (`transporter_system.sql`)
2. **Add your transporters** with contact details and diesel rates
3. **Define routes** between existing hubs with customs costs where applicable
4. **Set up price bands** for groupage and full truck loads
5. **Test route planning** with sample queries

The system is designed for immediate use with your existing hub infrastructure while providing the foundation for sophisticated multi-modal logistics planning.