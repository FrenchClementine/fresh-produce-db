const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://yozvhqqzrnnnahszgiow.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenZocXF6cm5ubmFoc3pnaW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3OTQsImV4cCI6MjA3MzAyNTc5NH0.qa3XfmUmuPbQdsH8XqU0UAKXX1HGms15DhnSU7ZZ6f8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function generateFullSchemaMarkdown() {
  const markdown = []
  
  markdown.push('# Fresh Produce Database Schema')
  markdown.push('')
  markdown.push(`Generated on: ${new Date().toISOString()}`)
  markdown.push(`Database: ${supabaseUrl}`)
  markdown.push('')
  
  const tableNames = [
    'products', 'customers', 'suppliers', 'hubs', 'certifications',
    'packaging_options', 'pallets', 'product_packaging_specs',
    'supplier_certifications'
  ]
  
  for (const tableName of tableNames) {
    try {
      console.log(`Processing table: ${tableName}`)
      markdown.push(`## Table: \`${tableName}\``)
      markdown.push('')
      
      // Get all data from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (error) {
        markdown.push(`❌ **Error accessing table**: ${error.message}`)
        markdown.push('')
        continue
      }
      
      if (!data || data.length === 0) {
        markdown.push('**No data found**')
        markdown.push('')
        continue
      }
      
      // Add table info
      markdown.push(`**Records found**: ${data.length}`)
      markdown.push('')
      
      // Generate CREATE TABLE statement based on data structure
      const sampleRow = data[0]
      const columns = Object.keys(sampleRow)
      
      markdown.push('### Schema Definition')
      markdown.push('')
      markdown.push('```sql')
      markdown.push(`CREATE TABLE public.${tableName} (`)
      
      const columnDefinitions = columns.map(col => {
        const value = sampleRow[col]
        let type = 'TEXT'
        
        if (col === 'id') type = 'UUID PRIMARY KEY'
        else if (col === 'created_at' || col === 'updated_at') type = 'TIMESTAMP WITH TIME ZONE'
        else if (typeof value === 'boolean') type = 'BOOLEAN'
        else if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'DECIMAL(10,3)'
        }
        else if (Array.isArray(value)) type = 'TEXT[]'
        else if (col.endsWith('_id')) type = 'UUID'
        
        return `    ${col} ${type}`
      })
      
      markdown.push(columnDefinitions.join(',\n'))
      markdown.push(');')
      markdown.push('```')
      markdown.push('')
      
      // Add foreign key relationships if apparent
      const foreignKeys = columns.filter(col => col.endsWith('_id') && col !== 'id')
      if (foreignKeys.length > 0) {
        markdown.push('### Foreign Key Relationships')
        markdown.push('')
        foreignKeys.forEach(fk => {
          const referencedTable = fk.replace('_id', 's') // Simple pluralization
          if (referencedTable !== tableName + 's') {
            markdown.push(`- \`${fk}\` → \`${referencedTable}.id\``)
          }
        })
        markdown.push('')
      }
      
      // Add sample data (first 5 rows)
      markdown.push('### Sample Data')
      markdown.push('')
      const sampleData = data.slice(0, 5)
      
      if (sampleData.length > 0) {
        // Create markdown table
        const headers = columns.join(' | ')
        const separator = columns.map(() => '---').join(' | ')
        markdown.push(`| ${headers} |`)
        markdown.push(`| ${separator} |`)
        
        sampleData.forEach(row => {
          const values = columns.map(col => {
            const value = row[col]
            if (value === null) return 'NULL'
            if (typeof value === 'string' && value.length > 50) return value.substring(0, 47) + '...'
            if (Array.isArray(value)) return JSON.stringify(value)
            return String(value)
          })
          markdown.push(`| ${values.join(' | ')} |`)
        })
      }
      
      markdown.push('')
      
      // Add full data dump as JSON
      markdown.push('### Complete Data (JSON)')
      markdown.push('')
      markdown.push('```json')
      markdown.push(JSON.stringify(data, null, 2))
      markdown.push('```')
      markdown.push('')
      
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error)
      markdown.push(`❌ **Error processing table**: ${error.message}`)
      markdown.push('')
    }
  }
  
  // Add database statistics
  markdown.push('## Database Statistics')
  markdown.push('')
  
  for (const tableName of tableNames) {
    try {
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      markdown.push(`- **${tableName}**: ${count || 0} records`)
    } catch (error) {
      markdown.push(`- **${tableName}**: Error getting count`)
    }
  }
  
  markdown.push('')
  markdown.push('---')
  markdown.push(`*Generated by Fresh Produce Database Schema Exporter on ${new Date().toLocaleString()}*`)
  
  return markdown.join('\n')
}

async function main() {
  try {
    console.log('Generating full database schema...')
    const markdownContent = await generateFullSchemaMarkdown()
    
    const fileName = 'database-schema-complete.md'
    fs.writeFileSync(fileName, markdownContent, 'utf8')
    
    console.log(`✅ Complete database schema saved to: ${fileName}`)
    console.log(`📊 File size: ${(markdownContent.length / 1024).toFixed(2)} KB`)
    
  } catch (error) {
    console.error('❌ Error generating schema:', error)
  }
}

main().catch(console.error)