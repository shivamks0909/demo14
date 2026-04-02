#!/bin/bash

# Environment Configuration Validation Script
# Validates all required environment variables for production deployment

set -e

ENV_LOCAL="/d/new12-main/.env.local"
ENV_EXAMPLE="/d/new12-main/.env.example"
REPORT_DIR="/d/new12-main/data"
REPORT_FILE="$REPORT_DIR/env-config-report.txt"

# Ensure data directory exists
mkdir -p "$REPORT_DIR"

echo "=== ENVIRONMENT CONFIGURATION VALIDATION ==="
echo ""

# Function to check if variable exists and get its value
get_var() {
    local file=$1
    local var_name=$2
    if [ -f "$file" ]; then
        grep "^${var_name}=" "$file" | tail -n1 | cut -d= -f2- | tr -d '\r\n' || echo "Not set"
    else
        echo "File not found: $file"
    fi
}

# 1. Check GEOIP_PROVIDER
echo "1. Checking GEOIP_PROVIDER..."
GEOIP_PROVIDER=$(get_var "$ENV_LOCAL" "GEOIP_PROVIDER")
if [ -z "$GEOIP_PROVIDER" ] || [ "$GEOIP_PROVIDER" = "Not set" ]; then
    GEOIP_PROVIDER=$(get_var "$ENV_EXAMPLE" "GEOIP_PROVIDER")
fi
echo "   GEOIP_PROVIDER = $GEOIP_PROVIDER"
if [[ ! "$GEOIP_PROVIDER" =~ ^(maxmind|ipinfo|auto)$ ]] && [ "$GEOIP_PROVIDER" != "Not set" ]; then
    echo "   WARNING: Invalid value. Expected 'maxmind', 'ipinfo', or 'auto'"
fi
echo ""

# 2. Check MAXMIND_DB_PATH (if GEOIP_PROVIDER=maxmind or auto)
echo "2. Checking MAXMIND_DB_PATH..."
MAXMIND_DB_PATH=$(get_var "$ENV_LOCAL" "MAXMIND_DB_PATH")
if [ -z "$MAXMIND_DB_PATH" ] || [ "$MAXMIND_DB_PATH" = "Not set" ]; then
    MAXMIND_DB_PATH=$(get_var "$ENV_EXAMPLE" "MAXMIND_DB_PATH")
fi
echo "   MAXMIND_DB_PATH = $MAXMIND_DB_PATH"
if [[ "$GEOIP_PROVIDER" =~ ^(maxmind|auto)$ ]] && [ "$MAXMIND_DB_PATH" = "Not set" ]; then
    echo "   WARNING: Required when GEOIP_PROVIDER=maxmind or auto"
fi
echo ""

# 3. Check IPINFO_TOKEN (if GEOIP_PROVIDER=ipinfo)
echo "3. Checking IPINFO_TOKEN..."
IPINFO_TOKEN=$(get_var "$ENV_LOCAL" "IPINFO_TOKEN")
if [ -z "$IPINFO_TOKEN" ] || [ "$IPINFO_TOKEN" = "Not set" ]; then
    IPINFO_TOKEN=$(get_var "$ENV_EXAMPLE" "IPINFO_TOKEN")
fi
echo "   IPINFO_TOKEN = $IPINFO_TOKEN"
if [ "$GEOIP_PROVIDER" = "ipinfo" ] && [ "$IPINFO_TOKEN" = "Not set" ]; then
    echo "   WARNING: Required when GEOIP_PROVIDER=ipinfo"
fi
if [ "$IPINFO_TOKEN" = "your-ipinfo-token-here" ] || [ "$IPINFO_TOKEN" = "your-ipinfo-token-here" ]; then
    echo "   WARNING: Placeholder token value - replace with real token"
fi
echo ""

# 4. Check ADMIN_MASTER_KEY
echo "4. Checking ADMIN_MASTER_KEY..."
ADMIN_MASTER_KEY=$(get_var "$ENV_LOCAL" "ADMIN_MASTER_KEY")
echo "   ADMIN_MASTER_KEY length: ${#ADMIN_MASTER_KEY} characters"
if [ -z "$ADMIN_MASTER_KEY" ] || [ "$ADMIN_MASTER_KEY" = "Not set" ]; then
    echo "   CRITICAL: ADMIN_MASTER_KEY is missing!"
else
    if [ ${#ADMIN_MASTER_KEY} -lt 32 ]; then
        echo "   WARNING: Key should be at least 32 characters (currently ${#ADMIN_MASTER_KEY})"
    fi
    if [ "$ADMIN_MASTER_KEY" = "your-admin-master-key-here" ] || [[ "$ADMIN_MASTER_KEY" =~ ^Pw0U\+EAAlgdr ]]; then
        echo "   WARNING: This appears to be a placeholder or default value - replace with secure random key"
    fi
fi
echo ""

# 5. Check NODE_ENV
echo "5. Checking NODE_ENV..."
NODE_ENV=$(get_var "$ENV_LOCAL" "NODE_ENV")
echo "   NODE_ENV = $NODE_ENV"
if [[ ! "$NODE_ENV" =~ ^(development|production)$ ]] && [ "$NODE_ENV" != "Not set" ]; then
    echo "   WARNING: Should be 'development' or 'production'"
fi
echo ""

# Generate Report
echo "Generating report at: $REPORT_FILE"
{
    echo "Environment Configuration Report"
    echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    echo "GEOIP_PROVIDER: $GEOIP_PROVIDER"
    echo "MAXMIND_DB_PATH: $MAXMIND_DB_PATH"
    echo "IPINFO_TOKEN: $IPINFO_TOKEN"
    echo "ADMIN_MASTER_KEY: ${ADMIN_MASTER_KEY:0:8}... (${#ADMIN_MASTER_KEY} chars total)"
    echo "NODE_ENV: $NODE_ENV"
    echo ""
    echo "Issues Found:"
    ISSUES=0
    if [[ ! "$GEOIP_PROVIDER" =~ ^(maxmind|ipinfo|auto)$ ]] && [ "$GEOIP_PROVIDER" != "Not set" ]; then
        echo "  - GEOIP_PROVIDER has invalid value"
        ISSUES=$((ISSUES+1))
    fi
    if [[ "$GEOIP_PROVIDER" =~ ^(maxmind|auto)$ ]] && [ "$MAXMIND_DB_PATH" = "Not set" ]; then
        echo "  - MAXMIND_DB_PATH is required but not set"
        ISSUES=$((ISSUES+1))
    fi
    if [ "$GEOIP_PROVIDER" = "ipinfo" ] && [ "$IPINFO_TOKEN" = "Not set" ]; then
        echo "  - IPINFO_TOKEN is required but not set"
        ISSUES=$((ISSUES+1))
    fi
    if [ "$IPINFO_TOKEN" = "your-ipinfo-token-here" ]; then
        echo "  - IPINFO_TOKEN is using placeholder value"
        ISSUES=$((ISSUES+1))
    fi
    if [ -z "$ADMIN_MASTER_KEY" ] || [ "$ADMIN_MASTER_KEY" = "Not set" ]; then
        echo "  - ADMIN_MASTER_KEY is missing"
        ISSUES=$((ISSUES+1))
    else
        if [ ${#ADMIN_MASTER_KEY} -lt 32 ]; then
            echo "  - ADMIN_MASTER_KEY is too short (needs 32+ chars)"
            ISSUES=$((ISSUES+1))
        fi
        if [ "$ADMIN_MASTER_KEY" = "your-admin-master-key-here" ] || [[ "$ADMIN_MASTER_KEY" =~ ^Pw0U\+EAAlgdr ]]; then
            echo "  - ADMIN_MASTER_KEY appears to be placeholder or default"
            ISSUES=$((ISSUES+1))
        fi
    fi
    if [ "$NODE_ENV" = "Not set" ]; then
        echo "  - NODE_ENV is missing"
        ISSUES=$((ISSUES+1))
    elif [[ ! "$NODE_ENV" =~ ^(development|production)$ ]]; then
        echo "  - NODE_ENV has invalid value"
        ISSUES=$((ISSUES+1))
    fi
    if [ $ISSUES -eq 0 ]; then
        echo "  - None"
    fi
    echo ""
    echo "Summary: $ISSUES issue(s) found"
} > "$REPORT_FILE"

echo ""
echo "Validation complete!"
echo "Report saved to: $REPORT_FILE"
