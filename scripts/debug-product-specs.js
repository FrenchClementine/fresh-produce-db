const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yozvhqqzrnnnahszgiow.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3OTQsImV4cCI6MjA3MzAyNTc5NH0.qa3XfmUmuPbQdsH8XqU0UAKXX1HGms15DhnSU7ZZ6f8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugProductSpecs() {
  console.log('=== DEBUGGING PRODUCT SPECS ===')
  
  // First, get the Iceberg Lettuce product
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%iceberg%')
    
  console.log('Iceberg Lettuce products:', products)
  
  if (!products || products.length === 0) {
    console.log('No Iceberg Lettuce found')
    return
  }
  
  const icebergProduct = products[0]
  console.log('Iceberg Product ID:', icebergProduct.id)
  
  // Get all product packaging specs
  const { data: allSpecs, error: allSpecsError } = await supabase
    .from('product_packaging_specs')
    .select('*')
    
  console.log('All product packaging specs:', allSpecs)
  
  // Filter specs for Iceberg
  const icebergSpecs = allSpecs?.filter(spec => spec.product_id === icebergProduct.id) || []
  console.log('Iceberg specs (filtered):', icebergSpecs)
  
  // Test the join query that the hook uses
  console.log('\n=== TESTING JOIN QUERY ===')
  const { data: joinSpecs, error: joinError } = await supabase
    .from('product_packaging_specs')
    .select(`
      *,
      products:product_id(id, name, category),
      packaging_options:packaging_id(id, label, unit_type),
      pallets:pallet_id(id, label, dimensions_cm)
    `)
    .eq('product_id', icebergProduct.id)
    
  if (joinError) {
    console.log('Join query error:', joinError)
  } else {
    console.log('Join query results:', joinSpecs)
  }
  
  // Test with different column reference
  console.log('\n=== TESTING ALTERNATE COLUMN REFERENCE ===')
  const { data: altJoinSpecs, error: altJoinError } = await supabase
    .from('product_packaging_specs')
    .select(`
      *,
      products!product_id(id, name, category),
      packaging_options!packaging_id(id, label, unit_type),
      pallets!pallet_id(id, label, dimensions_cm)
    `)
    .eq('product_id', icebergProduct.id)
    
  if (altJoinError) {
    console.log('Alt join query error:', altJoinError)
  } else {
    console.log('Alt join query results:', altJoinSpecs)
  }
}

debugProductSpecs().catch(console.error)