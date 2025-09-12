'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [data, setData] = useState({
    products: [],
    packagingOptions: [],
    pallets: [],
    productSpecs: [],
    error: null
  })

  useEffect(() => {
    async function fetchDebugData() {
      try {
        // Fetch all relevant data
        const [
          { data: products, error: productsError },
          { data: packagingOptions, error: packagingError },
          { data: pallets, error: palletsError },
          { data: productSpecs, error: specsError }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('packaging_options').select('*'),
          supabase.from('pallets').select('*'),
          supabase.from('product_packaging_specs').select('*')
        ])

        setData({
          products: products || [],
          packagingOptions: packagingOptions || [],
          pallets: pallets || [],
          productSpecs: productSpecs || [],
          error: productsError || packagingError || palletsError || specsError
        })
      } catch (error) {
        setData(prev => ({ ...prev, error }))
      }
    }

    fetchDebugData()
  }, [])

  if (data.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Debug Page - Error</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {data.error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Database Debug Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Products ({data.products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.products.map((product, idx) => (
                <div key={idx} className="text-sm border-b pb-1">
                  <strong>{product.name}</strong> - {product.category} - ID: {product.id}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Packaging Options ({data.packagingOptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.packagingOptions.map((option, idx) => (
                <div key={idx} className="text-sm border-b pb-1">
                  <strong>{option.label}</strong> - {option.unit_type} - ID: {option.id}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pallets ({data.pallets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.pallets.map((pallet, idx) => (
                <div key={idx} className="text-sm border-b pb-1">
                  <strong>{pallet.label}</strong> - {pallet.dimensions_cm} - ID: {pallet.id}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Packaging Specs ({data.productSpecs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.productSpecs.length === 0 ? (
                <p className="text-gray-500 italic">No packaging specs found</p>
              ) : (
                data.productSpecs.map((spec, idx) => (
                  <div key={idx} className="text-sm border-b pb-1">
                    Product: {spec.product_id} | Packaging: {spec.packaging_id} | Weight: {spec.weight_per_box} {spec.weight_unit}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}