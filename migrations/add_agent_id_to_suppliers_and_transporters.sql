-- Add agent_id column to suppliers and transporters tables
-- This allows assigning staff members as agents for suppliers and transporters
-- similar to how customers work

-- Add agent_id to suppliers table
ALTER TABLE suppliers
ADD COLUMN agent_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Add agent_id to transporters table
ALTER TABLE transporters
ADD COLUMN agent_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_suppliers_agent_id ON suppliers(agent_id);
CREATE INDEX idx_transporters_agent_id ON transporters(agent_id);

-- Add comments for documentation
COMMENT ON COLUMN suppliers.agent_id IS 'Responsible internal staff member for this supplier';
COMMENT ON COLUMN transporters.agent_id IS 'Responsible internal staff member for this transporter';