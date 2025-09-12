const { createClient } = require('@supabase/supabase-js')

// These should match your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seedPackagingData() {
  console.log('Starting to seed packaging data...')

  // Seed packaging options
  const packagingOptions = [
    { label: '5kg Box', unit_type: 'Box', description: 'Standard 5kg cardboard box' },
    { label: '10kg Box', unit_type: 'Box', description: 'Standard 10kg cardboard box' },
    { label: '15kg Box', unit_type: 'Box', description: 'Standard 15kg cardboard box' },
    { label: '20kg Box', unit_type: 'Box', description: 'Standard 20kg cardboard box' },
    { label: '10kg Bag', unit_type: 'Bag', description: 'Mesh or plastic bag 10kg' },
    { label: '25kg Bag', unit_type: 'Bag', description: 'Large sack 25kg' },
    { label: 'Wooden Crate', unit_type: 'Crate', description: 'Reusable wooden crate' },
    { label: 'Plastic Crate', unit_type: 'Crate', description: 'Reusable plastic crate' },
  ]

  console.log('Inserting packaging options...')
  const { data: packagingData, error: packagingError } = await supabase
    .from('packaging_options')
    .upsert(packagingOptions, { onConflict: 'label' })
    .select()

  if (packagingError) {
    console.error('Error inserting packaging options:', packagingError)
  } else {
    console.log(`Successfully inserted ${packagingData.length} packaging options`)
  }

  // Seed pallets
  const pallets = [
    { label: 'Euro Pallet', dimensions_cm: '120x80x15' },
    { label: 'UK Standard', dimensions_cm: '120x100x15' },
    { label: 'Half Pallet', dimensions_cm: '60x80x15' },
    { label: 'Quarter Pallet', dimensions_cm: '60x40x15' },
  ]

  console.log('Inserting pallets...')
  const { data: palletData, error: palletError } = await supabase
    .from('pallets')
    .upsert(pallets, { onConflict: 'label' })
    .select()

  if (palletError) {
    console.error('Error inserting pallets:', palletError)
  } else {
    console.log(`Successfully inserted ${palletData.length} pallets`)
  }

  // Seed some basic certifications
  const certifications = [
    { name: 'Organic EU', issuing_body: 'EU Commission', description: 'European organic certification' },
    { name: 'Fair Trade', issuing_body: 'Fair Trade International', description: 'Fair trade certification' },
    { name: 'Global GAP', issuing_body: 'Global GAP', description: 'Good Agricultural Practice certification' },
    { name: 'Rainforest Alliance', issuing_body: 'Rainforest Alliance', description: 'Sustainable agriculture certification' },
    { name: 'BRC Food Safety', issuing_body: 'BRC', description: 'British Retail Consortium food safety standard' },
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

  console.log('Seed data insertion complete!')
}

seedPackagingData().catch(console.error)