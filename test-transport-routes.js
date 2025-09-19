// Test script to explore find_direct_routes RPC function
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yzvphhqngqhbksxxcbyy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dnBoaHFuZ3FoYmtzeHhjYnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxODE3NjUsImV4cCI6MjA0Mjc1Nzc2NX0.5lT3zWQJ5KZVOFxN9p4VkOXEi2JsWV8qH3vNGRVMOAM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTransportSystem() {
  console.log('🔍 Testing Transport Route System...\n')

  // 1. Check if transporters exist
  console.log('1. Checking transporters...')
  const { data: transporters, error: transportersError } = await supabase
    .from('transporters')
    .select('id, name, is_active')
    .eq('is_active', true)

  if (transportersError) {
    console.error('❌ Error fetching transporters:', transportersError)
    return
  }

  console.log(`✅ Found ${transporters.length} active transporters:`)
  transporters.forEach(t => console.log(`   - ${t.name} (${t.id})`))

  // 2. Check if routes exist
  console.log('\n2. Checking transporter routes...')
  const { data: routes, error: routesError } = await supabase
    .from('transporter_routes')
    .select(`
      id,
      transport_duration_days,
      is_active,
      transporters(name),
      origin_hub:hubs!origin_hub_id(id, name, hub_code),
      destination_hub:hubs!destination_hub_id(id, name, hub_code)
    `)
    .eq('is_active', true)
    .limit(10)

  if (routesError) {
    console.error('❌ Error fetching routes:', routesError)
    return
  }

  console.log(`✅ Found ${routes.length} active routes:`)
  routes.forEach(r => {
    console.log(`   - ${r.transporters.name}: ${r.origin_hub.name} → ${r.destination_hub.name} (${r.transport_duration_days} days)`)
  })

  // 3. Check price bands
  console.log('\n3. Checking price bands...')
  const { data: priceBands, error: bandsError } = await supabase
    .from('transporter_route_price_bands')
    .select(`
      id,
      pallet_dimensions,
      min_pallets,
      max_pallets,
      price_per_pallet,
      transporter_routes(
        transporters(name),
        origin_hub:hubs!origin_hub_id(name),
        destination_hub:hubs!destination_hub_id(name)
      )
    `)
    .limit(10)

  if (bandsError) {
    console.error('❌ Error fetching price bands:', bandsError)
    return
  }

  console.log(`✅ Found ${priceBands.length} price bands:`)
  priceBands.forEach(pb => {
    const route = pb.transporter_routes
    console.log(`   - ${route.transporters.name}: ${route.origin_hub.name} → ${route.destination_hub.name}`)
    console.log(`     ${pb.min_pallets}-${pb.max_pallets || '∞'} pallets (${pb.pallet_dimensions}): €${pb.price_per_pallet}/pallet`)
  })

  // 4. Test find_direct_routes RPC function
  if (routes.length >= 1) {
    const testRoute = routes[0]
    console.log(`\n4. Testing find_direct_routes RPC function...`)
    console.log(`   Testing route: ${testRoute.origin_hub.name} → ${testRoute.destination_hub.name}`)

    const { data: directRoutes, error: rpcError } = await supabase.rpc('find_direct_routes', {
      p_origin_hub_id: testRoute.origin_hub.id,
      p_destination_hub_id: testRoute.destination_hub.id,
      p_pallet_count: 5,
      p_pallet_dimensions: '120x100'
    })

    if (rpcError) {
      console.error('❌ Error calling find_direct_routes:', rpcError)
      return
    }

    console.log(`✅ find_direct_routes returned ${directRoutes.length} results:`)
    directRoutes.forEach(route => {
      console.log(`   - ${route.transporter_name}:`)
      console.log(`     Route ID: ${route.route_id}`)
      console.log(`     Duration: ${route.transport_days} days`)
      console.log(`     Base cost: €${route.base_cost}`)
      console.log(`     Diesel surcharge: €${route.diesel_surcharge}`)
      console.log(`     Customs cost: €${route.customs_cost}`)
      console.log(`     Total cost: €${route.total_cost}`)
      console.log(`     Price age: ${route.price_age_days} days`)
    })
  }

  // 5. Check for common routes (like VENLO to UK hubs)
  console.log('\n5. Looking for common EU routes...')
  const { data: hubs, error: hubsError } = await supabase
    .from('hubs')
    .select('id, name, hub_code, country_code')
    .in('country_code', ['NL', 'UK', 'ES', 'IT'])
    .limit(20)

  if (hubsError) {
    console.error('❌ Error fetching hubs:', hubsError)
    return
  }

  console.log(`✅ Found ${hubs.length} EU hubs:`)
  hubs.forEach(h => console.log(`   - ${h.name} (${h.hub_code}) - ${h.country_code}`))

  // Test a few specific routes
  const venloHub = hubs.find(h => h.hub_code?.includes('VENL'))
  const ukHub = hubs.find(h => h.country_code === 'UK')

  if (venloHub && ukHub) {
    console.log(`\n6. Testing specific route: ${venloHub.name} → ${ukHub.name}`)

    const { data: specificRoute, error: specificError } = await supabase.rpc('find_direct_routes', {
      p_origin_hub_id: venloHub.id,
      p_destination_hub_id: ukHub.id,
      p_pallet_count: 10,
      p_pallet_dimensions: '120x100'
    })

    if (specificError) {
      console.error('❌ Error:', specificError)
    } else {
      console.log(`✅ Found ${specificRoute.length} routes from ${venloHub.name} to ${ukHub.name}`)
      specificRoute.forEach(route => {
        console.log(`   - ${route.transporter_name}: €${route.total_cost} for 10 pallets`)
      })
    }
  }
}

testTransportSystem().catch(console.error)