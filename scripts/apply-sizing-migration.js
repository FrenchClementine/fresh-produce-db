const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://yozvhqqzrnnnahszgiow.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ0OTc5NCwiZXhwIjoyMDczMDI1Nzk0fQ.4eGhN-Jqm7ZNJxZb8wMB8xzKXG7oEHyMSr8FNqWaGUE'

// Note: Using anon key for now since we don't have service role key
const supabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3OTQsImV4cCI6MjA3MzAyNTc5NH0.qa3XfmUmuPbQdsH8XqU0UAKXX1HGms15DhnSU7ZZ6f8')

async function applySizingMigration() {
  console.log('🚀 Applying sizing system migration...')
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250910130000_add_sizing_system.sql', 'utf8')
    
    // Split the SQL into individual statements (basic splitting on semicolons)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Since we can't execute raw SQL with anon key, let's create the tables manually
    console.log('Creating sizes table...')
    
    // First, let's try to create the sizes table
    const { error: sizesError } = await supabase
      .from('sizes')
      .select('id')
      .limit(1)
    
    if (sizesError && sizesError.message.includes('relation "sizes" does not exist')) {
      console.log('❌ Cannot create tables with current permissions')
      console.log('Please run this migration using the Supabase dashboard or CLI with admin access')
      console.log('')
      console.log('Alternative: Run this SQL manually in the Supabase SQL editor:')
      console.log('---')
      console.log(migrationSQL)
      return
    }
    
    // If we get here, the table might already exist, let's check
    console.log('✅ Sizes table appears to be accessible')
    
    // Try to insert sample data
    const sampleSizes = [
      { size_code: '60-65mm', size_category: 'diameter', min_value: 60, max_value: 65, unit: 'mm', description: 'Medium fruit diameter' },
      { size_code: 'Class I', size_category: 'grade', description: 'Premium quality - minimal defects' },
      { size_code: 'Large', size_category: 'general', description: 'General large size classification' }
    ]
    
    const { data, error } = await supabase
      .from('sizes')
      .upsert(sampleSizes, { onConflict: 'size_code' })
      .select()
    
    if (error) {
      console.error('❌ Error inserting sample sizes:', error)
    } else {
      console.log('✅ Sample sizes inserted successfully:', data?.length || 0, 'records')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('Please apply the migration manually using:')
    console.log('1. Supabase Dashboard > SQL Editor')
    console.log('2. Copy the contents of: supabase/migrations/20250910130000_add_sizing_system.sql')
    console.log('3. Execute the SQL')
  }
}

applySizingMigration()