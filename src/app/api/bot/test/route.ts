import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseWithAI, MessageContext } from '@/lib/bot/ai-parser';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Handle task creation
 */
async function createTask(assignee: string, taskText: string, createdBy: string) {
  const { error } = await supabase.from('bot_tasks').insert({
    title: taskText,
    assigned_to: assignee,
    created_by: createdBy,
    status: 'pending',
  });

  if (error) {
    console.error('Failed to create task:', error);
    return false;
  }
  return true;
}

/**
 * Get tasks for a user
 */
async function getTasksForUser(displayName: string) {
  const { data: tasks, error } = await supabase
    .from('bot_tasks')
    .select('*')
    .ilike('assigned_to', `%${displayName}%`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to get tasks:', error);
    return [];
  }

  return tasks || [];
}

/**
 * Log message
 */
async function logMessage(
  user: string,
  direction: 'inbound' | 'outbound',
  body: string,
  intent?: string,
  parsedData?: Record<string, unknown>
) {
  await supabase.from('bot_messages').insert({
    whatsapp_number: `test:${user}`,
    direction,
    message_body: body,
    parsed_intent: intent,
    parsed_data: parsedData,
  });
}

/**
 * Find suppliers for a product
 */
async function findSuppliersForProduct(productName: string, location?: string) {
  // Search for product by name (fuzzy match)
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', `%${productName}%`)
    .eq('is_active', true)
    .limit(5);

  if (!products || products.length === 0) {
    return { found: false, message: `No products found matching "${productName}"` };
  }

  // If multiple products found, use the first one
  const product = products[0];

  // First get product_packaging_specs for this product
  const { data: packagingSpecs, error: specsError } = await supabase
    .from('product_packaging_specs')
    .select('id')
    .eq('product_id', product.id);

  console.log('Product ID:', product.id);
  console.log('Packaging specs found:', packagingSpecs?.length, specsError);

  if (!packagingSpecs || packagingSpecs.length === 0) {
    return {
      found: false,
      message: `Found product "${product.name}" but no packaging specs defined`,
    };
  }

  const specIds = packagingSpecs.map((s) => s.id);
  console.log('Spec IDs:', specIds);

  // Get suppliers for these specs
  const { data: supplierData, error } = await supabase
    .from('supplier_product_packaging_spec')
    .select(`
      id,
      notes,
      suppliers:supplier_id (
        name,
        country,
        city,
        email,
        phone_number,
        delivery_modes
      ),
      product_packaging_specs:product_packaging_spec_id (
        packaging_options:packaging_id (
          label
        ),
        boxes_per_pallet,
        pieces_per_box,
        weight_per_box,
        weight_unit
      )
    `)
    .in('product_packaging_spec_id', specIds);

  console.log('Supplier data found:', supplierData?.length, 'Error:', error);
  console.log('First supplier:', JSON.stringify(supplierData?.[0], null, 2));

  if (error || !supplierData || supplierData.length === 0) {
    console.error('Supplier query error:', error);
    return {
      found: false,
      message: `Found product "${product.name}" but no active suppliers. Searched ${specIds.length} packaging specs.`,
    };
  }

  // Filter by location if specified
  let filteredSuppliers = supplierData;
  if (location) {
    const locationLower = location.toLowerCase();
    filteredSuppliers = supplierData.filter((s: any) => {
      const country = s.suppliers?.country?.toLowerCase() || '';
      // Handle common variations
      return (
        country.includes(locationLower) ||
        (locationLower === 'uk' && country.includes('united kingdom')) ||
        (locationLower === 'united kingdom' && country.includes('uk')) ||
        (locationLower === 'usa' && (country.includes('united states') || country.includes('america')))
      );
    });

    if (filteredSuppliers.length === 0) {
      return {
        found: false,
        message: `Found ${supplierData.length} suppliers for "${product.name}" but none in ${location}`,
      };
    }
  }

  return {
    found: true,
    product: product.name,
    suppliers: filteredSuppliers,
    location: location,
  };
}

/**
 * Geocode a location using Nominatim
 */
async function geocodeLocation(location: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'PSE-Trade-Bot/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

/**
 * Find nearest hub to coordinates
 */
async function findNearestHub(lat: number, lon: number) {
  const { data: hubs } = await supabase
    .from('hubs')
    .select('*');

  if (!hubs || hubs.length === 0) return null;

  // Simple distance calculation (haversine would be more accurate)
  let nearestHub = hubs[0];
  let minDistance = Infinity;

  for (const hub of hubs) {
    if (!hub.latitude || !hub.longitude) continue;

    const distance = Math.sqrt(
      Math.pow(hub.latitude - lat, 2) + Math.pow(hub.longitude - lon, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestHub = hub;
    }
  }

  return nearestHub;
}

/**
 * Find transport routes between two locations
 */
async function findTransportRoutes(origin: string, destination: string) {
  // Geocode both locations
  const originGeo = await geocodeLocation(origin);
  const destGeo = await geocodeLocation(destination);

  if (!originGeo || !destGeo) {
    return {
      found: false,
      message: `Could not find location for ${!originGeo ? origin : destination}. Try using a major city name.`
    };
  }

  // Find nearest hubs
  const originHub = await findNearestHub(originGeo.lat, originGeo.lon);
  const destHub = await findNearestHub(destGeo.lat, destGeo.lon);

  if (!originHub || !destHub) {
    return { found: false, message: 'Could not find nearby transport hubs' };
  }

  // Query routes between these hubs
  const { data: routes, error } = await supabase
    .from('transporter_routes')
    .select(`
      *,
      transporters:transporter_id(
        id,
        name,
        diesel_surcharge_percentage
      )
    `)
    .eq('origin_hub_id', originHub.id)
    .eq('destination_hub_id', destHub.id)
    .eq('is_active', true);

  if (error) {
    console.error('Transport query error:', error);
    return { found: false, message: 'Error searching for transport options' };
  }

  if (!routes || routes.length === 0) {
    return {
      found: false,
      message: `No direct routes found from ${originHub.city_name || origin} to ${destHub.city_name || destination}`
    };
  }

  // Get price bands for these routes
  const routeIds = routes.map(r => r.id);
  const { data: priceBands } = await supabase
    .from('transporter_route_price_bands')
    .select('*')
    .in('transporter_route_id', routeIds);

  // Attach price bands to routes
  const routesWithPrices = routes.map(route => ({
    ...route,
    price_bands: priceBands?.filter(pb => pb.transporter_route_id === route.id) || []
  }));

  return {
    found: true,
    origin: originHub.city_name || origin,
    destination: destHub.city_name || destination,
    originHub,
    destHub,
    routes: routesWithPrices,
  };
}

/**
 * Get last N messages for context
 */
async function getRecentMessages(user: string, limit = 6): Promise<MessageContext[]> {
  const { data: messages } = await supabase
    .from('bot_messages')
    .select('direction, message_body')
    .eq('whatsapp_number', `test:${user}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];

  // Reverse to get chronological order and map to context format
  return messages.reverse().map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'bot',
    content: m.message_body,
  })) as MessageContext[];
}

export async function POST(request: NextRequest) {
  try {
    const { message, user = 'TestUser' } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get recent messages for context
    const context = await getRecentMessages(user);

    // Parse the message with AI (with context)
    const parsed = await parseWithAI(message, context);

    // Log the incoming message
    await logMessage(user, 'inbound', message, parsed.intent, parsed.entities);

    // Handle based on intent
    let responseText = '';

    switch (parsed.intent) {
      case 'help':
        responseText = `Hi! I'm the PSE Trade Buddy. Here's what I can do:

*Tasks*
- "remind [name] to [task]"
- "what are my tasks"

*Suppliers*
- "show me rocket growers"
- "who has tomatoes in Spain"
- "find suppliers for iceberg"

*Transport*
- "transport from Naples to Thessaloniki"
- "find transport Venlo to Milan"
- "shipping from Spain to UK"

More features coming soon!`;
        break;

      case 'create_task':
        const { assignee, taskText } = parsed.entities;
        if (assignee && taskText) {
          const success = await createTask(assignee, taskText, user);
          if (success) {
            responseText = `Got it! Task created for ${assignee}:\n"${taskText}"`;
          } else {
            responseText = "Sorry, I couldn't create that task. Please try again.";
          }
        } else {
          responseText = "I couldn't understand the task. Try: \"remind [name] to [task]\"";
        }
        break;

      case 'list_tasks':
        const tasks = await getTasksForUser(user);
        if (tasks.length === 0) {
          responseText = "You have no pending tasks.";
        } else {
          const taskLines = tasks.map((t) => `- ${t.title}`);
          responseText = `Your tasks:\n${taskLines.join('\n')}`;
        }
        break;

      case 'query_transport':
        const { origin, destination } = parsed.entities;
        if (origin && destination) {
          const result = await findTransportRoutes(origin, destination);

          if (!result.found || !result.routes) {
            responseText = result.message || `No transport routes found from ${origin} to ${destination}`;
          } else {
            const routeLines = result.routes.map((route: any, i: number) => {
              const transporter = route.transporters;
              const originHub = result.originHub;
              const destHub = result.destHub;
              const days = route.transport_duration_days || 'N/A';

              // Get price range from price bands
              const priceBands = route.price_bands || [];
              const prices = priceBands
                .filter((pb: any) => pb.pallet_dimensions === '120x80')
                .map((pb: any) => pb.price_per_pallet);

              let priceText = 'Price on request';
              if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const dieselSurcharge = transporter?.diesel_surcharge_percentage || 0;
                const minWithSurcharge = (minPrice * (1 + dieselSurcharge / 100)).toFixed(2);
                const maxWithSurcharge = (maxPrice * (1 + dieselSurcharge / 100)).toFixed(2);
                priceText = `€${minWithSurcharge}-${maxWithSurcharge}/pallet`;
                if (dieselSurcharge > 0) {
                  priceText += ` (incl. ${dieselSurcharge}% diesel)`;
                }
              }

              const frequency = route.fixed_departure_days && route.fixed_departure_days.length > 0
                ? `${route.fixed_departure_days.join(', ')}`
                : 'On demand';

              return `${i + 1}. *${transporter?.name || 'Unknown'}*
   🚚 ${originHub?.city_name || originHub?.name} → ${destHub?.city_name || destHub?.name}
   ⏱️ ${days} days
   💰 ${priceText}
   📅 ${frequency}`;
            });

            responseText = `Transport options from *${result.origin}* to *${result.destination}*:\n\n${routeLines.join('\n\n')}`;
          }
        } else {
          responseText = "Please specify both origin and destination. Try: 'transport from Naples to Thessaloniki'";
        }
        break;

      case 'query_supplier':
        const { productName, location } = parsed.entities;
        if (productName) {
          const result = await findSuppliersForProduct(productName, location);

          if (!result.found || !result.suppliers) {
            responseText = result.message || `No suppliers found for "${productName}"`;
          } else {
            // Group by supplier to avoid duplicates
            const supplierMap = new Map<string, {
              supplier: any;
              packagingOptions: Set<string>;
            }>();

            result.suppliers.forEach((s: any) => {
              const supplier = s.suppliers;
              const supplierId = supplier.name; // Use name as key since we don't have ID
              const packaging = s.product_packaging_specs?.packaging_options?.label || 'Standard packaging';

              if (!supplierMap.has(supplierId)) {
                supplierMap.set(supplierId, {
                  supplier: supplier,
                  packagingOptions: new Set(),
                });
              }

              supplierMap.get(supplierId)!.packagingOptions.add(packaging);
            });

            // Format output
            const supplierLines = Array.from(supplierMap.entries()).map(([_, data], i) => {
              const supplier = data.supplier;
              const packagingList = Array.from(data.packagingOptions).join(', ');
              const supplierLocation = supplier.city && supplier.country
                ? `${supplier.city}, ${supplier.country}`
                : supplier.country || 'Location not specified';

              // Get availability months from supplier_offering_actual_sizes if available
              // For now, show "Year-round" as we need to check if there's seasonal data
              const availability = 'Year-round'; // TODO: Add actual availability from database

              return `${i + 1}. *${supplier.name}*
   📍 ${supplierLocation}
   📦 ${packagingList}
   📅 ${availability}
   ${supplier.phone_number ? `📞 ${supplier.phone_number}` : ''}
   ${supplier.email ? `✉️ ${supplier.email}` : ''}`;
            });

            const locationText = result.location ? ` in ${result.location}` : '';
            responseText = `Suppliers for *${result.product}*${locationText}:\n\n${supplierLines.join('\n\n')}`;
          }
        } else {
          responseText = "Which product are you looking for?";
        }
        break;

      default:
        responseText = `I didn't understand that. Try "help" to see what I can do.`;
    }

    // Log outgoing message
    await logMessage(user, 'outbound', responseText);

    return NextResponse.json({
      success: true,
      input: message,
      parsed: {
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities,
      },
      response: responseText,
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Bot test endpoint ready',
    usage: 'POST with { "message": "your message", "user": "YourName" }',
    examples: [
      { message: 'help', description: 'Show help' },
      { message: 'remind Oliver to call the supplier', description: 'Create a task' },
      { message: 'what are my tasks', description: 'List your tasks' },
    ],
  });
}
