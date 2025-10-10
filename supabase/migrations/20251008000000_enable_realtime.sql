-- Enable realtime for supplier_prices table
ALTER PUBLICATION supabase_realtime ADD TABLE supplier_prices;

-- Enable realtime for opportunities table
ALTER PUBLICATION supabase_realtime ADD TABLE opportunities;

-- Enable realtime for customer_product_requests table (for active items)
ALTER PUBLICATION supabase_realtime ADD TABLE customer_product_requests;
