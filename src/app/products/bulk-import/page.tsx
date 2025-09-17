'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useBulkImport } from '@/hooks/use-bulk-import'

interface ImportRow {
  product_name: string
  intended_use: string
  category: string
  packaging_label: string
  packaging_unit_type: string
  size_name: string
  boxes_per_pallet: number
  weight_per_box: number
  weight_per_pallet: number
  pieces_per_box: number
  pallet_dimensions: string
  errors?: string[]
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    success: number
    errors: { row: number; message: string }[]
  } | null>(null)

  const { importBulkData } = useBulkImport()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseCSV(selectedFile)
    }
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      const data: ImportRow[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        
        headers.forEach((header, index) => {
          const value = values[index] || ''
          
          // Convert numeric fields
          if (['boxes_per_pallet', 'weight_per_box', 'weight_per_pallet', 'pieces_per_box'].includes(header)) {
            row[header] = parseFloat(value) || 0
          } else {
            row[header] = value
          }
        })
        
        // Validate row
        const errors = validateRow(row, i + 1)
        if (errors.length > 0) {
          row.errors = errors
        }
        
        data.push(row)
      }
      
      setImportData(data)
    }
    reader.readAsText(file)
  }

  const validateRow = (row: ImportRow, lineNumber: number): string[] => {
    const errors: string[] = []
    
    if (!row.product_name) errors.push('Product name is required')
    if (!row.category) errors.push('Category is required')
    if (!row.packaging_label) errors.push('Packaging label is required')
    if (!row.size_name) errors.push('Size name is required')
    if (row.boxes_per_pallet <= 0) errors.push('Boxes per pallet must be greater than 0')
    if (row.weight_per_box <= 0) errors.push('Weight per box must be greater than 0')
    if (row.weight_per_pallet <= 0) errors.push('Weight per pallet must be greater than 0')
    if (!row.pallet_dimensions) errors.push('Pallet dimensions are required')
    
    // Validate enum values
    const validCategories = ['tomatoes', 'lettuce', 'babyleaf', 'citrus', 'greenhouse_crop', 'mushroom', 'grapes', 'carrots', 'potatoes', 'onions', 'fruit', 'vegetables']
    if (row.category && !validCategories.includes(row.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`)
    }
    
    const validIntendedUse = ['Wholesale', 'Retail', 'Industry', 'Process']
    if (row.intended_use && !validIntendedUse.includes(row.intended_use)) {
      errors.push(`Intended use must be one of: ${validIntendedUse.join(', ')}`)
    }
    
    return errors
  }

  const handleImport = async () => {
    if (!importData.length) return
    
    const validRows = importData.filter(row => !row.errors?.length)
    if (validRows.length === 0) {
      alert('No valid rows to import')
      return
    }
    
    setIsProcessing(true)
    setProgress(0)
    
    try {
      const result = await importBulkData(validRows, (progress) => {
        setProgress(progress)
      })
      
      setResults(result)
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/bulk-import-template.csv'
    link.download = 'bulk-import-template.csv'
    link.click()
  }

  const hasErrors = importData.some(row => row.errors?.length)
  const validRowCount = importData.filter(row => !row.errors?.length).length

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Products</h1>
          <p className="text-muted-foreground">
            Import products, packaging, sizes, and specifications in bulk
          </p>
        </div>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download the CSV template with sample data and required columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Template includes columns for:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>• Product name & intended use</div>
              <div>• Product category</div>
              <div>• Packaging label & unit type</div>
              <div>• Size name</div>
              <div>• Boxes per pallet</div>
              <div>• Weight specifications</div>
              <div>• Pieces per box</div>
              <div>• Pallet dimensions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Select your completed CSV file to import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>
            
            {file && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Loaded file: <strong>{file.name}</strong> ({importData.length} rows)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      {importData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Preview
              </span>
              <div className="flex gap-2">
                <Badge variant="secondary">{importData.length} total rows</Badge>
                <Badge variant="default">{validRowCount} valid</Badge>
                {hasErrors && <Badge variant="destructive">{importData.length - validRowCount} errors</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasErrors && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  Some rows have errors. Only valid rows will be imported.
                </span>
              </div>
            )}
            
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Intended Use</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Packaging</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Boxes/Pallet</TableHead>
                    <TableHead>Weight/Box</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {row.errors?.length ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="default">Valid</Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.product_name}</TableCell>
                      <TableCell>{row.intended_use}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.packaging_label}</TableCell>
                      <TableCell>{row.size_name}</TableCell>
                      <TableCell>{row.boxes_per_pallet}</TableCell>
                      <TableCell>{row.weight_per_box}kg</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {importData.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... and {importData.length - 10} more rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Actions */}
      {importData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to import {validRowCount} valid rows</p>
                <p className="text-sm text-muted-foreground">
                  This will create new products, packaging options, sizes, and specifications
                </p>
              </div>
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || validRowCount === 0}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validRowCount} Records
                  </>
                )}
              </Button>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Processing... {progress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="bg-green-500">
                  {results.success} records imported
                </Badge>
                {results.errors.length > 0 && (
                  <Badge variant="destructive">
                    {results.errors.length} errors
                  </Badge>
                )}
              </div>
              
              {results.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Errors:</h4>
                  <div className="space-y-1">
                    {results.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-600">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                    {results.errors.length > 5 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {results.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <Link href="/products">
                <Button>
                  View Products
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}