#!/bin/bash

# Environment Configuration Validation Script
# This script checks all required environment variables for production deployment

echo "=== Environment Configuration Validation ==="
echo ""

# Initialize variables
GEOIP_PROVIDER=""
MAXMIND_DB_PATH=""
IPINFO_TOKEN=""
ADMIN_MASTER_KEY=""
NODE_ENV=""
ISSUES=""

# Check GEOIP_PROVIDER
if grep -q "^GEOIP_PROVIDER=" .env.local 2>/dev/null; then
    GEOIP_PROVIDER=$(grep "^GEOIP_PROVIDER=" .env.local | cut -d'=' -f2- | tr -d ' ')
    echo "✓ GEOIP_PROVIDER: $GEOIP_PROVIDER"
else
    GEOIP_PROVIDER="Not set"
    echo "✗ GEOIP_PROVIDER: Missing in .env.local"
    ISSUES="$ISSUES\n  - GEOIP_PROVIDER is required"
fi

# Check MAXMIND_DB_PATH or IPINFO_TOKEN based on provider
if [ "$GEOIP_PROVIDER" = "maxmind" ] || [ "$GEOIP_PROVIDER" = "auto" ]; then
    if grep -q "^MAXMIND_DB_PATH=" .env.local 2>/dev/null; then
        MAXMIND_DB_PATH=$(grep "^MAXMIND_DB_PATH=" .env.local | cut -d'=' -f2- | tr -d ' ')
        echo "✓ MAXMIND_DB_PATH: $MAXMIND_DB_PATH"
    else
        MAXMIND_DB_PATH="Not set"
        echo "⚠ MAXMIND_DB_PATH: Not set (required if using maxmind)"
        ISSUES="$ISSUES\n  - MAXMIND_DB_PATH required for maxmind provider"
    fi
else
    MAXMIND_DB_PATH="Not needed (using ipinfo)"
fi

if [ "$GEOIP_PROVIDER" = "ipinfo" ] || [ "$GEOIP_PROVIDER" = "auto" ]; then
    if grep -q "^IPINFO_TOKEN=" .env.local 2>/dev/null; then
        IPINFO_TOKEN=$(grep "^IPINFO_TOKEN=" .env.local | cut -d'=' -f2- | tr -d ' ')
        echo "✓ IPINFO_TOKEN: $IPINFO_TOKEN"
    else
        IPINFO_TOKEN="Not set"
        echo "⚠ IPINFO_TOKEN: Not set (required if using ipinfo)"
        ISSUES="$ISSUES\n  - IPINFO_TOKEN required for ipinfo provider"
    fi
else
    IPINFO_TOKEN="Not needed (using maxmind)"
fi

# Check ADMIN_MASTER_KEY
if grep -q "^ADMIN_MASTER_KEY=" .env.local 2>/dev/null; then
    ADMIN_MASTER_KEY=$(grep "^ADMIN_MASTER_KEY=" .env.local | cut -d'=' -f2- | tr -d ' ')
    KEY_LENGTH=${#ADMIN_MASTER_KEY}
    if [ "$KEY_LENGTH" -ge 32 ]; then
        echo "✓ ADMIN_MASTER_KEY: Set (length: $KEY_LENGTH)"
    else
        echo "✗ ADMIN_MASTER_KEY: Too short (length: $KEY_LENGTH, need 32+)"
        ISSUES="$ISSUES\n  - ADMIN_MASTER_KEY must be at least 32 characters"
    fi
else
    ADMIN_MASTER_KEY="Missing"
    echo "✗ ADMIN_MASTER_KEY: Missing in .env.local"
    ISSUES="$ISSUES\n  - ADMIN_MASTER_KEY is required (32+ byte random string)"
fi

# Check NODE_ENV
if grep -q "^NODE_ENV=" .env.local 2>/dev/null; then
    NODE_ENV=$(grep "^NODE_ENV=" .env.local | cut -d'=' -f2- | tr -d ' ')
    if [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "production" ]; then
        echo "✓ NODE_ENV: $NODE_ENV"
    else
        echo "✗ NODE_ENV: Invalid value '$NODE_ENV' (must be 'development' or 'production')"
        ISSUES="$ISSUES\n  - NODE_ENV must be 'development' or 'production'"
    fi
else
    NODE_ENV="Missing"
    echo "✗ NODE_ENV: Missing in .env.local"
    ISSUES="$ISSUES\n  - NODE_ENV is required"
fi

echo ""
echo "=== Summary ==="
if [ -z "$ISSUES" ]; then
    echo "✓ All required environment variables are configured correctly."
else
    echo "✗ Issues found:"
    echo -e "$ISSUES"
fi
