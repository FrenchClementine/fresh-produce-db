const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCoordinates() {
  console.log('🔍 Checking coordinate status in database...\n');

  // Check hubs
  const { data: hubs, error: hubsError } = await supabase
    .from('hubs')
    .select('id, name, city_name, country_code, latitude, longitude, coordinates_last_updated, geocoding_failed, geocoding_attempts')
    .order('name');

  if (hubsError) {
    console.error('❌ Error fetching hubs:', hubsError);
    return;
  }

  console.log('🏢 HUBS COORDINATE STATUS:');
  console.log('==========================================');

  let hubsWithCoords = 0;
  let hubsWithoutCoords = 0;
  let hubsWithFailures = 0;

  hubs.forEach(hub => {
    const hasCoords = hub.latitude && hub.longitude;
    const status = hasCoords ? '✅' : (hub.geocoding_failed ? '❌' : '⏳');

    console.log(`${status} ${hub.name} (${hub.city_name}, ${hub.country_code})`);
    if (hasCoords) {
      console.log(`   📍 ${hub.latitude}, ${hub.longitude} (updated: ${hub.coordinates_last_updated})`);
      hubsWithCoords++;
    } else {
      console.log(`   🚫 No coordinates (attempts: ${hub.geocoding_attempts}, failed: ${hub.geocoding_failed})`);
      if (hub.geocoding_failed) hubsWithFailures++;
      else hubsWithoutCoords++;
    }
    console.log('');
  });

  console.log(`\n📊 HUBS SUMMARY:`);
  console.log(`   ✅ With coordinates: ${hubsWithCoords}/${hubs.length}`);
  console.log(`   ⏳ Without coordinates: ${hubsWithoutCoords}/${hubs.length}`);
  console.log(`   ❌ Failed geocoding: ${hubsWithFailures}/${hubs.length}`);

  // Check suppliers
  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, name, city, country, latitude, longitude, coordinates_last_updated, geocoding_failed, geocoding_attempts')
    .limit(5)
    .order('name');

  if (suppliersError) {
    console.error('❌ Error fetching suppliers:', suppliersError);
    return;
  }

  console.log('\n\n👥 SUPPLIERS COORDINATE STATUS (first 5):');
  console.log('==========================================');

  let suppliersWithCoords = 0;
  let suppliersWithoutCoords = 0;
  let suppliersWithFailures = 0;

  suppliers.forEach(supplier => {
    const hasCoords = supplier.latitude && supplier.longitude;
    const status = hasCoords ? '✅' : (supplier.geocoding_failed ? '❌' : '⏳');

    console.log(`${status} ${supplier.name} (${supplier.city}, ${supplier.country})`);
    if (hasCoords) {
      console.log(`   📍 ${supplier.latitude}, ${supplier.longitude} (updated: ${supplier.coordinates_last_updated})`);
      suppliersWithCoords++;
    } else {
      console.log(`   🚫 No coordinates (attempts: ${supplier.geocoding_attempts}, failed: ${supplier.geocoding_failed})`);
      if (supplier.geocoding_failed) suppliersWithFailures++;
      else suppliersWithoutCoords++;
    }
    console.log('');
  });

  console.log(`\n📊 SUPPLIERS SUMMARY (sample):`);
  console.log(`   ✅ With coordinates: ${suppliersWithCoords}/${suppliers.length}`);
  console.log(`   ⏳ Without coordinates: ${suppliersWithoutCoords}/${suppliers.length}`);
  console.log(`   ❌ Failed geocoding: ${suppliersWithFailures}/${suppliers.length}`);

  // Check if we need to run batch geocoding
  const totalWithoutCoords = hubsWithoutCoords + suppliersWithoutCoords;
  if (totalWithoutCoords > 0) {
    console.log('\n🚀 RECOMMENDATION:');
    console.log('   Run batch geocoding to populate missing coordinates.');
    console.log('   You can use the useCoordinateResolution hook in the admin panel.');
  } else {
    console.log('\n🎉 SUCCESS:');
    console.log('   All entities have coordinates! The fast hub suggestion should work perfectly.');
  }
}

checkCoordinates().catch(console.error);