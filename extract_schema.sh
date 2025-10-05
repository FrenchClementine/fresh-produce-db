#!/bin/bash
export PGPASSWORD="qQaOhOQqtrDaxODpvbAAVLMGCxZYnJMb"
HOST="aws-1-eu-north-1.pooler.supabase.com"
PORT="5432"
USER="cli_login_postgres.yozvhqqzrnnnahszgiow"
DB="postgres"

echo "-- Database Schema Dump for Supabase Project: yozvhqqzrnnnahszgiow"
echo "-- Generated on: $(date)"
echo ""

# Get all table names
TABLES=$(psql -h $HOST -p $PORT -U $USER -d $DB -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")

# For each table, get its CREATE TABLE statement
for TABLE in $TABLES; do
    echo "-- Table: $TABLE"
    psql -h $HOST -p $PORT -U $USER -d $DB -c "
        SELECT 'CREATE TABLE public.$TABLE (' || E'\\n' ||
        string_agg(
            '    ' || column_name || ' ' || 
            data_type || 
            CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                WHEN numeric_precision IS NOT NULL 
                THEN '(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                ELSE ''
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            E',\\n' ORDER BY ordinal_position
        ) || E'\\n);'
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '$TABLE'
        GROUP BY table_name;" -t -A
    echo ""
done
