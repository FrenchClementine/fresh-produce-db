# Trade Pricing System Migration

This SQL creates the necessary table and indexes for the supplier pricing system.

## Create supplier_prices table

```sql
CREATE TABLE "public"."supplier_prices" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "supplier_id" UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    "supplier_product_packaging_spec_id" UUID NOT NULL REFERENCES supplier_product_packaging_spec(id) ON DELETE CASCADE,
    "hub_id" UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    "price_per_unit" DECIMAL(10,4) NOT NULL CHECK (price_per_unit >= 0),
    "currency" TEXT DEFAULT 'EUR' NOT NULL,
    "delivery_mode" delivery_mode_enum NOT NULL,
    "valid_from" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "valid_until" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_by_staff_id" UUID NOT NULL REFERENCES staff(id),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Constraints
    CHECK (valid_until > valid_from),
    -- Ensure no overlapping active prices for same supplier+product+hub+delivery_mode
    EXCLUDE USING gist (
        supplier_id WITH =,
        supplier_product_packaging_spec_id WITH =,
        hub_id WITH =,
        delivery_mode WITH =,
        tstzrange(valid_from, valid_until, '[)') WITH &&
    ) WHERE (is_active = true)
);
```

## Create indexes for performance

```sql
-- Index for finding active prices by supplier
CREATE INDEX "idx_supplier_prices_supplier_id" ON supplier_prices(supplier_id);

-- Index for finding prices by supplier product spec
CREATE INDEX "idx_supplier_prices_spec_id" ON supplier_prices(supplier_product_packaging_spec_id);

-- Index for finding prices by hub
CREATE INDEX "idx_supplier_prices_hub_id" ON supplier_prices(hub_id);

-- Index for finding active prices
CREATE INDEX "idx_supplier_prices_active" ON supplier_prices(is_active) WHERE is_active = true;

-- Index for finding current prices (overlapping with now)
CREATE INDEX "idx_supplier_prices_current" ON supplier_prices(valid_from, valid_until) WHERE is_active = true;

-- Index for finding prices by delivery mode
CREATE INDEX "idx_supplier_prices_delivery_mode" ON supplier_prices(delivery_mode);

-- Index for who created prices (audit trail)
CREATE INDEX "idx_supplier_prices_created_by" ON supplier_prices(created_by_staff_id);

-- Composite index for efficient price lookups
CREATE INDEX "idx_supplier_prices_lookup" ON supplier_prices(supplier_id, hub_id, supplier_product_packaging_spec_id, delivery_mode, is_active);
```

## Create view for current active prices

```sql
CREATE VIEW "public"."current_supplier_prices" AS
SELECT
    sp.*,
    s.name as supplier_name,
    h.name as hub_name,
    h.hub_code,
    pps.product_id,
    p.name as product_name,
    po.label as packaging_label,
    sz.name as size_name,
    staff.name as created_by_name
FROM supplier_prices sp
JOIN suppliers s ON sp.supplier_id = s.id
JOIN hubs h ON sp.hub_id = h.id
JOIN supplier_product_packaging_spec spps ON sp.supplier_product_packaging_spec_id = spps.id
JOIN product_packaging_specs pps ON spps.product_packaging_spec_id = pps.id
JOIN products p ON pps.product_id = p.id
JOIN packaging_options po ON pps.packaging_id = po.id
JOIN size_options sz ON pps.size_option_id = sz.id
JOIN staff ON sp.created_by_staff_id = staff.id
WHERE sp.is_active = true
AND sp.valid_from <= now()
AND sp.valid_until > now();
```

## Add comment to table

```sql
COMMENT ON TABLE supplier_prices IS 'Supplier pricing information with validity periods and delivery modes. Includes constraints to prevent overlapping active prices for the same product/hub/delivery mode combination.';
```

## Run after creating table

Execute these queries in order:
1. Create the table
2. Create the indexes
3. Create the view
4. Add the comment

The EXCLUDE constraint requires the btree_gist extension. If not already enabled, run:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```