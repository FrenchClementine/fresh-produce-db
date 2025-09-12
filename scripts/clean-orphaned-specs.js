const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yozvhqqzrnnnahszgiow.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3OTQsImV4cCI6MjA3MzAyNTc5NH0.qa3XfmUmuPbQdsH8XqU0UAKXX1HGms15DhnSU7ZZ6f8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanOrphanedSpecs() {
  console.log('Cleaning orphaned product specs...')

  try {
    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name')

    if (productsError) throw productsError

    console.log('Found products:', products.map(p => `${p.name} (${p.id})`))

    // Get all specs
    const { data: specs, error: specsError } = await supabase
      .from('product_packaging_specs')
      .select('id, product_id')

    if (specsError) throw specsError

    console.log('Found specs:', specs.map(s => `${s.id} -> ${s.product_id}`))

    // Find orphaned specs
    const validProductIds = products.map(p => p.id)
    const orphanedSpecs = specs.filter(spec => !validProductIds.includes(spec.product_id))

    console.log('Orphaned specs:', orphanedSpecs)

    if (orphanedSpecs.length > 0) {
      // Delete orphaned specs
      const { error: deleteError } = await supabase
        .from('product_packaging_specs')
        .delete()
        .in('id', orphanedSpecs.map(s => s.id))

      if (deleteError) throw deleteError

      console.log(`Deleted ${orphanedSpecs.length} orphaned specs`)
    } else {
      console.log('No orphaned specs found')
    }

    // Show remaining specs
    const { data: remainingSpecs, error: remainingError } = await supabase
      .from('product_packaging_specs')
      .select('*')

    if (remainingError) throw remainingError

    console.log(`${remainingSpecs.length} specs remaining:`, remainingSpecs)

  } catch (error) {
    console.error('Error cleaning orphaned specs:', error)
  }
}

cleanOrphanedSpecs().catch(console.error)