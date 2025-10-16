import { Badge } from '@/components/ui/badge'
import { Truck, MapPin, Package, Clock, Building, ArrowRight } from 'lucide-react'
import { Opportunity } from '@/types/opportunities'

interface TransportDisplayProps {
  opportunity: Opportunity
}

export function TransportDisplay({ opportunity }: TransportDisplayProps) {
  // Check for multi-leg transport first
  const hasMultiLegTransport = opportunity.transport_route_legs?.legs && opportunity.transport_route_legs.legs.length > 1

  // If multi-leg transport exists, display it
  if (hasMultiLegTransport) {
    const legs = opportunity.transport_route_legs!.legs
    return (
      <div className="space-y-2 text-xs font-mono">
        {/* Multi-leg route header */}
        <div className="flex items-center gap-2">
          <Truck className="h-3 w-3 text-terminal-accent" />
          <span className="font-medium text-terminal-text">Multi-leg Transport</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {opportunity.transport_route_legs!.total_legs} legs
          </Badge>
        </div>

        {/* Route overview */}
        <div className="text-terminal-text font-medium text-[10px]">
          {legs[0].origin_hub_name} → {legs.slice(1, -1).map(leg => leg.origin_hub_name).join(' → ')}
          {legs.length > 1 && ' → '}
          {legs[legs.length - 1].destination_hub_name}
        </div>

        {/* Leg breakdown */}
        <div className="space-y-1.5 bg-muted/30 p-2 rounded">
          {legs.map((leg: any, idx: number) => (
            <div key={idx} className="text-[10px] space-y-0.5">
              <div className="font-medium text-terminal-text">
                Leg {leg.leg}: {leg.origin_hub_name} → {leg.destination_hub_name}
              </div>
              <div className="grid grid-cols-2 gap-1 text-terminal-muted pl-2">
                <span>{leg.transporter_name}</span>
                <span>{leg.duration_days}d</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total duration */}
        <div className="flex items-center gap-1 text-terminal-muted">
          <Clock className="h-3 w-3" />
          <span>Total: {opportunity.transport_route_legs!.total_duration_days} days</span>
        </div>

        {/* DDP badge */}
        <Badge variant="outline" className="text-xs border-terminal-success text-terminal-success font-mono">
          DDP
        </Badge>
      </div>
    )
  }

  // Original logic for single-leg transport
  const hasTransporter = opportunity.selected_transporter?.name
  const hasTransportBand = opportunity.selected_transport_band || opportunity.selected_transport_band_id
  const deliveryMode = opportunity.supplier_price?.delivery_mode

  // Get hub information from supplier price (origin hub)
  const hubName = opportunity.supplier_price?.hub_name
  const hubCode = opportunity.supplier_price?.hub_code

  // Get delivery hub information (destination hub for third-party transport)
  const deliveryHubName = opportunity.delivery_hub?.name

  // Determine origin and destination
  const origin = opportunity.supplier?.city || opportunity.selected_supplier?.city
  // For third-party transport, use delivery_hub if available, otherwise customer city
  // For supplier delivery to a hub, use the hub as destination
  const destination = deliveryHubName || hubName || opportunity.customer?.city

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('TransportDisplay:', {
      deliveryMode,
      hubName,
      hasTransporter,
      hasTransportBand,
      origin,
      destination
    })
  }

  // Check delivery mode (case-insensitive and handle variations)
  const deliveryModeLower = deliveryMode?.toLowerCase()
  const isSupplierDelivery = deliveryModeLower?.includes('supplier') ||
                             deliveryModeLower === 'delivery' ||
                             deliveryModeLower?.includes('delivery')
  const isCustomerPickup = deliveryModeLower?.includes('customer') || deliveryModeLower?.includes('pickup')
  const isExWorks = deliveryModeLower?.includes('ex_works') ||
                    deliveryModeLower?.includes('ex works') ||
                    deliveryModeLower === 'ex works'

  // Check if we have supplier transport info from delivery mode even without a transporter
  const hasSupplierTransport = isSupplierDelivery && hubName

  // Check if this is actually a supplier delivery or same location scenario
  const isActuallySupplierDelivery = isSupplierDelivery || isExWorks ||
    (hubName && !hasTransporter && hasTransportBand)

  // If there's a transporter with route info OR transport band is selected (meaning DDP/Delivery)
  // BUT not if it's actually supplier delivery to a hub
  if ((hasTransporter || hasTransportBand) && !isActuallySupplierDelivery) {
    // Determine if destination is a delivery hub (indicating pickup) vs city (indicating direct delivery)
    const isDeliveryHubDestination = deliveryHubName && destination === deliveryHubName

    return (
      <div className="space-y-1 text-xs font-mono">
        <div className="flex items-center gap-1">
          <Truck className="h-3 w-3 text-terminal-accent" />
          <span className="font-medium text-terminal-text">{hasTransporter}</span>
        </div>

        {/* Route: Origin -> Destination */}
        <div className="flex items-center gap-1 text-terminal-muted">
          <span>{origin}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{destination}</span>
          {isDeliveryHubDestination && <span className="text-terminal-accent">(Pickup)</span>}
        </div>

        {/* Transport Band - show pallet quantity only */}
        {opportunity.selected_transport_band ? (
          <div className="flex items-center gap-1 text-terminal-muted">
            <Package className="h-3 w-3" />
            <span>
              {opportunity.selected_transport_band.min_pallets === opportunity.selected_transport_band.max_pallets
                ? `${opportunity.selected_transport_band.min_pallets} pallets`
                : `${opportunity.selected_transport_band.min_pallets}-${opportunity.selected_transport_band.max_pallets} pallets`
              }
            </span>
          </div>
        ) : opportunity.selected_transport_band_id && opportunity.selected_transport_band_id.startsWith('band-') ? (
          // Fallback for placeholder transport band IDs like "band-0"
          <div className="flex items-center gap-1 text-terminal-muted">
            <Package className="h-3 w-3" />
            <span>Transport Band {opportunity.selected_transport_band_id.replace('band-', '')}</span>
          </div>
        ) : hasTransporter ? (
          // Show that transport band needs to be configured for third-party transport
          <div className="flex items-center gap-1 text-terminal-warning">
            <Package className="h-3 w-3" />
            <span className="text-xs">Band not selected</span>
          </div>
        ) : null}

        {/* Show DDP badge for transporter/transport band deliveries */}
        <Badge variant="outline" className="text-xs border-terminal-success text-terminal-success font-mono">
          DDP
        </Badge>
      </div>
    )
  }

  // No transporter - show delivery mode
  return (
    <div className="space-y-1 text-xs font-mono">
      {isSupplierDelivery && (
        <>
          <div className="flex items-center gap-1 text-terminal-accent">
            <Truck className="h-3 w-3" />
            <span className="font-medium">Supplier Delivery</span>
          </div>
          {hubName ? (
            <div className="flex items-center gap-1 text-terminal-muted">
              <ArrowRight className="h-3 w-3" />
              <span>Delivered to {hubName}</span>
            </div>
          ) : origin && destination && (
            <div className="text-xs text-terminal-muted">
              {origin} → {destination}
            </div>
          )}
          <div className="text-xs text-terminal-muted">
            1 days
          </div>
          <Badge variant="outline" className="text-xs border-terminal-border text-terminal-text font-mono">
            Supplier Transport
          </Badge>
        </>
      )}

      {isCustomerPickup && (
        <>
          <div className="flex items-center gap-1 text-terminal-text">
            <Building className="h-3 w-3" />
            <span>Pickup from {origin}</span>
          </div>
          <Badge variant="outline" className="text-xs border-terminal-border text-terminal-text font-mono">
            Customer Pickup
          </Badge>
          {hubName && (
            <div className="text-xs text-terminal-muted">
              Pickup at: {hubName}
            </div>
          )}
        </>
      )}

      {isExWorks && (
        <>
          <div className="flex items-center gap-1 text-terminal-text">
            <Building className="h-3 w-3" />
            <span>Ex Works {hubName || origin}</span>
          </div>
          <Badge variant="outline" className="text-xs border-terminal-border text-terminal-text font-mono">
            Ex Works
          </Badge>
          {hubCode && (
            <div className="text-xs text-terminal-muted">
              Hub: {hubCode}
            </div>
          )}
        </>
      )}

      {!isSupplierDelivery && !isCustomerPickup && !isExWorks && deliveryMode && (
        <>
          <div className="flex items-center gap-1 text-terminal-text">
            <Building className="h-3 w-3" />
            <span>From {origin}</span>
          </div>
          <Badge variant="outline" className="text-xs border-terminal-border text-terminal-text font-mono">
            {deliveryMode.replace(/_/g, ' ')}
          </Badge>
        </>
      )}

      {!deliveryMode && (
        <div className="text-xs text-terminal-muted italic">
          No transport set
        </div>
      )}

      {/* Expiry info if present */}
      {opportunity.supplier_price?.valid_until && (
        <div className="text-xs text-terminal-muted">
          Expires in {Math.ceil((new Date(opportunity.supplier_price.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
        </div>
      )}
    </div>
  )
}