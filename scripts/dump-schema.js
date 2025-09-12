const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yozvhqqzrnnnahszgiow.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3OTQsImV4cCI6MjA3MzAyNTc5NH0.qa3XfmUmuPbQdsH8XqU0UAKXX1HGms15DhnSU7ZZ6f8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function dumpSchema() {
  console.log('=== DATABASE SCHEMA DUMP ===')
  
  try {
    // Get all table information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.log('Cannot access information_schema, trying direct table queries...')
      
      // Try to get data from each known table
      const tableNames = [
        'products', 'customers', 'suppliers', 'hubs', 'certifications',
        'packaging_options', 'pallets', 'weight_units', 'product_packaging_specs',
        'supplier_certifications', 'supplier_hubs'
      ]
      
      for (const tableName of tableNames) {
        console.log(`\n--- ${tableName.toUpperCase()} TABLE ---`)
        
        // Get table structure by querying with limit 0
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0)
          
        if (error) {
          console.log(`❌ Error accessing ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ Table ${tableName} exists`)
          
          // Get sample data
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(5)
            
          if (sampleData && sampleData.length > 0) {
            console.log(`📊 Sample data (${sampleData.length} rows):`)
            console.log(JSON.stringify(sampleData, null, 2))
          } else {
            console.log('📊 No data found')
          }
        }
      }
      
      // Also try to get RLS policies information
      console.log('\n--- RLS POLICIES ---')
      const { data: policies, error: policiesError } = await supabase.rpc('get_policies')
      
      if (policies) {
        console.log('Policies:', JSON.stringify(policies, null, 2))
      } else if (policiesError) {
        console.log('Cannot access RLS policies:', policiesError.message)
      }
      
    } else {
      console.log('Tables found:', tables)
    }

  } catch (error) {
    console.error('Error dumping schema:', error)
  }
}

dumpSchema().catch(console.error)