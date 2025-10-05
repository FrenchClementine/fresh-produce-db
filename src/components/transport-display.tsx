import { Badge } from '@/components/ui/badge'
import { Truck, MapPin, Package, Clock, Building, ArrowRight } from 'lucide-react'
import { Opportunity } from '@/types/opportunities'

interface TransportDisplayProps {
  opportunity: Opportunity
}

export function TransportDisplay({ opportunity }: TransportDisplayProps) {
  const hasTransporter = opportunity.selected_transporter?.name
  const deliveryMode = opportunity.supplier_price?.delivery_mode

  // Get hub information from supplier price
  const hubName = opportunity.supplier_price?.hub_name
  const hubCode = opportunity.supplier_price?.hub_code

  // Determine origin and destination
  const origin = opportunity.supplier?.city || opportunity.selected_supplier?.city
  const destination = opportunity.customer?.city

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('TransportDisplay:', {
      deliveryMode,
      hubName,
      hasTransporter,
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

  // If there's a transporter with route info
  if (hasTransporter) {
    return (
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <Truck className="h-3 w-3 text-blue-600" />
          <span className="font-medium">{hasTransporter}</span>
        </div>

        {/* Route: Origin -> Destination */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>{origin}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{destination}</span>
        </div>

        {/* Transport Band - show pallet quantity only */}
        {opportunity.selected_transport_band ? (
          <div className="flex items-center gap-1 text-muted-foreground">
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
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Transport Band {opportunity.selected_transport_band_id.replace('band-', '')}</span>
          </div>
        ) : hasTransporter ? (
          // Show that transport band needs to be configured for third-party transport
          <div className="flex items-center gap-1 text-orange-600">
            <Package className="h-3 w-3" />
            <span className="text-xs">Band not selected</span>
          </div>
        ) : null}

        {/* Show Third Party Transport for transporter deliveries */}
        <Badge variant="outline" className="text-xs">
          Third Party Transport
        </Badge>
      </div>
    )
  }

  // No transporter - show delivery mode
  return (
    <div className="space-y-1 text-xs">
      {isSupplierDelivery && (
        <>
          <div className="flex items-center gap-1 text-blue-600">
            <Truck className="h-3 w-3" />
            <span className="font-medium">Supplier Transport</span>
          </div>
          {hubName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>{hubName}</span>
            </div>
          )}
          {origin && destination && (
            <div className="text-xs text-muted-foreground">
              {origin} → {destination}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            1 days
          </div>
        </>
      )}

      {isCustomerPickup && (
        <>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building className="h-3 w-3" />
            <span>Pickup from {origin}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Customer Pickup
          </Badge>
          {hubName && (
            <div className="text-xs text-muted-foreground">
              Pickup at: {hubName}
            </div>
          )}
        </>
      )}

      {isExWorks && (
        <>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building className="h-3 w-3" />
            <span>Ex Works {origin}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Ex Works
          </Badge>
        </>
      )}

      {!isSupplierDelivery && !isCustomerPickup && !isExWorks && deliveryMode && (
        <>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building className="h-3 w-3" />
            <span>From {origin}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {deliveryMode.replace(/_/g, ' ')}
          </Badge>
        </>
      )}

      {!deliveryMode && (
        <div className="text-xs text-muted-foreground italic">
          No transport set
        </div>
      )}

      {/* Expiry info if present */}
      {opportunity.supplier_price?.valid_until && (
        <div className="text-xs text-muted-foreground">
          Expires in {Math.ceil((new Date(opportunity.supplier_price.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
        </div>
      )}
    </div>
  )
}