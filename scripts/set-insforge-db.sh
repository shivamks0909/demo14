#!/bin/bash

# ===================================================================
# INSFORGE DATABASE SETUP SCRIPT
# ===================================================================
# This script runs the full database migration and seeding on InsForge
#
# Usage:
#   ./scripts/set-insforge-db.sh [DATABASE_URL]
#
# Example:
#   ./scripts/set-insforge-db.sh postgresql://user:pass@host:5432/dbname
#
# Or set DATABASE_URL environment variable:
#   export DATABASE_URL=postgresql://user:pass@host:5432/dbname
#   ./scripts/set-insforge-db.sh
# ===================================================================

set -e  # Exit on error

# Get database URL
DATABASE_URL="${1:-${DATABASE_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: No database URL provided."
    echo "Usage: $0 [DATABASE_URL]"
    echo "Or set DATABASE_URL environment variable."
    exit 1
fi

echo "========================================"
echo "INFORGE DATABASE SETUP"
echo "========================================"
echo ""
echo "Target Database: $DATABASE_URL"
echo ""

# Confirm with user
read -p "This will DROP and RECREATE all tables. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1/3: Running full schema migration..."

# Parse URL components for psql
# Extract connection parts without password in logs
if command -v psql &> /dev/null; then
    # Run schema migration
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/.*:\([^@]*\)@.*/\1/p') psql "$DATABASE_URL" -f scripts/migrate-full-schema.sql

    echo ""
    echo "Step 2/3: Seeding sample data..."

    # Run seed script
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/.*:\([^@]*\)@.*/\1/p') psql "$DATABASE_URL" -f scripts/seed-insforge.sql

    echo ""
    echo "Step 3/3: Verifying installation..."

    # Quick verification
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/.*:\([^@]*\)@.*/\1/p') psql "$DATABASE_URL" -c "
        SELECT 'Tables created:' as status
        UNION ALL
        SELECT '  ✓ ' || table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
    "

    echo ""
    echo "========================================"
    echo "✓ DATABASE SETUP COMPLETE"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env with:"
    echo "   NEXT_PUBLIC_INSFORGE_URL=$DATABASE_URL"
    echo ""
    echo "2. Test routing:"
    echo "   curl -v http://localhost:3000/r/TEST_SINGLE/DYN01/UID123"
    echo ""
    echo "3. Check audit logs:"
    echo "   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
    echo ""

else
    echo "ERROR: psql command not found. Install PostgreSQL client tools."
    exit 1
fi
