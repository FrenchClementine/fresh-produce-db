const { createClient } = require('@supabase/supabase-js')

// These should match your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seedCertifications() {
  console.log('Starting to seed certifications...')

  // Seed some basic certifications
  const certifications = [
    { name: 'Organic EU', description: 'European organic certification' },
    { name: 'Fair Trade', description: 'Fair trade certification' },
    { name: 'Global GAP', description: 'Good Agricultural Practice certification' },
    { name: 'Rainforest Alliance', description: 'Sustainable agriculture certification' },
    { name: 'BRC Food Safety', description: 'British Retail Consortium food safety standard' },
    { name: 'ISO 22000', description: 'Food safety management system certification' },
    { name: 'USDA Organic', description: 'United States Department of Agriculture organic certification' },
    { name: 'JAS Organic', description: 'Japan Agricultural Standards organic certification' },
  ]

  console.log('Inserting certifications...')
  const { data: certData, error: certError } = await supabase
    .from('certifications')
    .upsert(certifications, { onConflict: 'name' })
    .select()

  if (certError) {
    console.error('Error inserting certifications:', certError)
  } else {
    console.log(`Successfully inserted ${certData.length} certifications`)
  }

  console.log('Certification seed complete!')
}

seedCertifications().catch(console.error)