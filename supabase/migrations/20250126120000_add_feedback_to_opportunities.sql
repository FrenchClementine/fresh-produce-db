-- Add feedback columns to opportunities table
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS customer_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS feedback_status VARCHAR(20) DEFAULT 'none' CHECK (feedback_status IN ('none', 'pending', 'received', 'addressed'));

-- Add comment for documentation
COMMENT ON COLUMN opportunities.customer_feedback IS 'Customer feedback on the opportunity/quote';
COMMENT ON COLUMN opportunities.feedback_date IS 'Date when feedback was last updated';
COMMENT ON COLUMN opportunities.feedback_status IS 'Status of customer feedback: none, pending, received, addressed';