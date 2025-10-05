'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save, Eye } from 'lucide-react'
import { BatchConfigPanel } from './batch-config-panel'
import { BulkEntryTable, BulkPriceEntry } from './bulk-entry-table'
import { useSuppliers, useSupplierProducts, useSupplierHubs } from '@/hooks/use-suppliers'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { supabase } from '@/lib/supabase'

// Generate unique ID for rows
const generateId = () => `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function BulkEntryMode() {
  const { data: suppliers = [] } = useSuppliers()
  const { data: currentStaff } = useCurrentStaffMember()

  const [batchConfig, setBatchConfig] = useState({
    supplier_id: '',
    default_hub_id: '',
    default_delivery_mode: '',
    default_valid_from: new Date().toISOString().split('T')[0],
    default_valid_until: '',
    currency: 'EUR'
  })

  const [entries, setEntries] = useState<BulkPriceEntry[]>([
    createEmptyEntry()
  ])

  const [isSaving, setIsSaving] = useState(false)

  // Fetch data based on selected supplier
  const { data: supplierProducts = [] } = useSupplierProducts(batchConfig.supplier_id)
  const { data: supplierHubs = [] } = useSupplierHubs(batchConfig.supplier_id)

  // Get available delivery modes
  const availableDeliveryModes = supplierHubs.length > 0
    ? [...new Set(supplierHubs.flatMap(hub => hub.delivery_modes))]
    : []

  // Create empty entry
  function createEmptyEntry(): BulkPriceEntry {
    return {
      id: generateId(),
      product_packaging_spec_id: '',
      price_per_unit: '',
      units_per_pallet: '',
      hub_id: '',
      delivery_mode: '',
      valid_until: '',
      isValid: false,
      errors: {}
    }
  }

  // Update batch config
  const handleConfigChange = (field: string, value: string) => {
    setBatchConfig(prev => ({ ...prev, [field]: value }))
  }

  // Set quick validity period
  const handleQuickValidity = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setBatchConfig(prev => ({
      ...prev,
      default_valid_until: date.toISOString().split('T')[0]
    }))
  }

  // Update entry
  const handleUpdateEntry = (id: string, field: string, value: string) => {
    setEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.id !== id) return entry

        const updatedEntry = { ...entry, [field]: value }

        // Auto-fill units_per_pallet when product selected
        if (field === 'product_packaging_spec_id' && value) {
          const product = supplierProducts.find(p => p.id === value)
          if (product) {
            const spec = Array.isArray(product.product_packaging_specs)
              ? product.product_packaging_specs[0]
              : product.product_packaging_specs

            updatedEntry.units_per_pallet = (spec as any)?.weight_per_pallet?.toString() || ''
          }
        }

        // Validate entry
        return validateEntry(updatedEntry)
      })

      return updated
    })
  }

  // Validate single entry
  const validateEntry = (entry: BulkPriceEntry): BulkPriceEntry => {
    const errors: BulkPriceEntry['errors'] = {}

    // Only validate if product is selected
    if (entry.product_packaging_spec_id) {
      if (!entry.price_per_unit || parseFloat(entry.price_per_unit) <= 0) {
        errors.price = 'Price required'
      }
      if (!batchConfig.default_valid_until && !entry.valid_until) {
        errors.validity = 'Set validity'
      }

      entry.errors = errors
      entry.isValid = Object.keys(errors).length === 0
    } else {
      entry.isValid = false
      entry.errors = {}
    }

    return entry
  }

  // Add row
  const handleAddRow = () => {
    setEntries(prev => [...prev, createEmptyEntry()])
  }

  // Add multiple rows
  const handleAddMultipleRows = (count: number) => {
    setEntries(prev => [
      ...prev,
      ...Array(count).fill(null).map(() => createEmptyEntry())
    ])
  }

  // Delete entry
  const handleDeleteEntry = (id: string) => {
    setEntries(prev => {
      const filtered = prev.filter(e => e.id !== id)
      // Always keep at least one empty row
      return filtered.length === 0 ? [createEmptyEntry()] : filtered
    })
  }

  // Duplicate entry
  const handleDuplicateEntry = (id: string) => {
    const entry = entries.find(e => e.id === id)
    if (!entry) return

    const duplicated: BulkPriceEntry = {
      ...entry,
      id: generateId()
    }

    setEntries(prev => {
      const index = prev.findIndex(e => e.id === id)
      const updated = [...prev]
      updated.splice(index + 1, 0, duplicated)
      return updated
    })
  }

  // Clear all entries
  const handleClearAll = () => {
    if (window.confirm('Clear all entries? This cannot be undone.')) {
      setEntries([createEmptyEntry()])
    }
  }

  // Save all valid entries
  const handleSaveAll = async () => {
    // Validation
    if (!batchConfig.supplier_id) {
      toast.error('Please select a supplier in batch configuration')
      return
    }

    const validEntries = entries.filter(e => e.isValid && e.product_packaging_spec_id)

    if (validEntries.length === 0) {
      toast.error('No valid entries to save')
      return
    }

    if (!batchConfig.default_valid_until) {
      toast.error('Please set a default validity period')
      return
    }

    setIsSaving(true)

    try {
      // Prepare price data
      const pricesData = validEntries.map(entry => {
        const hubId = entry.hub_id || batchConfig.default_hub_id
        const deliveryMode = entry.delivery_mode || batchConfig.default_delivery_mode
        const validUntil = entry.valid_until || batchConfig.default_valid_until

        if (!hubId) {
          throw new Error('Hub is required. Set a default hub or specify one for each entry.')
        }

        if (!deliveryMode) {
          throw new Error('Delivery mode is required. Set a default delivery mode.')
        }

        return {
          supplier_id: batchConfig.supplier_id,
          supplier_product_packaging_spec_id: entry.product_packaging_spec_id,
          hub_id: hubId,
          price_per_unit: parseFloat(entry.price_per_unit),
          currency: batchConfig.currency,
          delivery_mode: deliveryMode as any,
          valid_from: new Date(batchConfig.default_valid_from).toISOString(),
          valid_until: new Date(validUntil).toISOString(),
          is_active: true,
          created_by_staff_id: currentStaff?.id || null,
          notes: `Bulk entry: ${validEntries.length} prices`
        }
      })

      // Batch insert
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert(pricesData)
        .select()

      if (error) throw error

      toast.success(`Successfully saved ${data.length} price${data.length !== 1 ? 's' : ''}!`)

      // Reset form
      setEntries([createEmptyEntry()])
      setBatchConfig(prev => ({
        ...prev,
        default_valid_until: ''
      }))

    } catch (error: any) {
      console.error('Error saving bulk prices:', error)
      toast.error(error.message || 'Failed to save prices')
    } finally {
      setIsSaving(false)
    }
  }

  // Preview what will be saved
  const handlePreview = () => {
    const validEntries = entries.filter(e => e.isValid && e.product_packaging_spec_id)

    if (validEntries.length === 0) {
      toast.info('No valid entries to preview')
      return
    }

    const message = `Will save ${validEntries.length} price${validEntries.length !== 1 ? 's' : ''} for ${suppliers.find(s => s.id === batchConfig.supplier_id)?.name || 'Unknown Supplier'}`
    toast.info(message)
  }

  // Re-validate all entries when batch config changes
  useEffect(() => {
    setEntries(prev => prev.map(validateEntry))
  }, [batchConfig.default_valid_until])

  const validEntriesCount = entries.filter(e => e.isValid && e.product_packaging_spec_id).length

  return (
    <div className="space-y-6">
      {/* Batch Configuration */}
      <BatchConfigPanel
        config={batchConfig}
        suppliers={suppliers}
        hubs={supplierHubs}
        deliveryModes={availableDeliveryModes}
        onChange={handleConfigChange}
        onQuickValidity={handleQuickValidity}
      />

      {/* Bulk Entry Table */}
      {batchConfig.supplier_id && (
        <>
          <BulkEntryTable
            entries={entries}
            products={supplierProducts}
            hubs={supplierHubs}
            deliveryModes={availableDeliveryModes}
            batchConfig={batchConfig}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onDuplicateEntry={handleDuplicateEntry}
            onAddRow={handleAddRow}
            onAddMultipleRows={handleAddMultipleRows}
            onClearAll={handleClearAll}
          />

          {/* Save Actions */}
          <div className="flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {validEntriesCount > 0 ? (
                <span>Ready to save {validEntriesCount} price{validEntriesCount !== 1 ? 's' : ''}</span>
              ) : (
                <span>Add products and prices to save</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={validEntriesCount === 0}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={validEntriesCount === 0 || isSaving}
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All ({validEntriesCount} price{validEntriesCount !== 1 ? 's' : ''})
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Prompt to select supplier */}
      {!batchConfig.supplier_id && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            Select a supplier in the batch configuration above to start adding prices
          </p>
        </div>
      )}
    </div>
  )
}
