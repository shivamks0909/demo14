#!/bin/bash
# Manual HMAC S2S Verification Test
# Run this script after starting the dev server: npm run dev
#
# Prerequisites:
#  - Project TEST_SINGLE exists and is active
#  - Supplier DYN01 exists and is linked to project
#  - S2S config has secret key set for project
#  - A response record exists with status 'in_progress'

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Manual HMAC S2S Verification Test                  ║"
echo "╚════════════════════════════════════════════════════════╝"

# Configuration (adjust these as needed)
PROJECT_CODE="TEST_SINGLE"
CLICKID=""  # Fill in an actual clickid from your database
SECRET=""   # Fill in the s2s_config.secret_key for the project

if [ -z "$CLICKID" ] || [ -z "$SECRET" ]; then
    echo "❌ Please set CLICKID and SECRET variables in this script"
    echo ""
    echo "To get these values:"
    echo "  1. Query your database for a response record:"
    echo "     SELECT clickid FROM responses WHERE project_code='$PROJECT_CODE' AND status='in_progress' LIMIT 1;"
    echo "  2. Query s2s_config for the secret:"
    echo "     SELECT secret_key FROM s2s_config WHERE project_id=(SELECT id FROM projects WHERE project_code='$PROJECT_CODE');"
    exit 1
fi

# Generate signature using Node.js (inline)
SIGNATURE=$(node -e "
const crypto = require('crypto');
const params = { pid: '$PROJECT_CODE', cid: '$CLICKID', type: 'complete' };
const canonical = Object.keys(params).sort().map(k => \`\${k}=\${params[k]}\`).join('&');
console.log(crypto.createHmac('sha256', '$SECRET').update(canonical).digest('hex'));
")

echo "Test Parameters:"
echo "  Project Code: $PROJECT_CODE"
echo "  Click ID: $CLICKID"
echo "  Callback Type: complete"
echo "  Secret: ${SECRET:0:8}... (truncated)"
echo "  Generated Signature: $SIGNATURE"
echo ""

# Build the full callback URL
CALLBACK_URL="http://localhost:3000/api/callback?pid=$PROJECT_CODE&cid=$CLICKID&type=complete&sig=$SIGNATURE"

echo "Test URL:"
echo "  $CALLBACK_URL"
echo ""

# Ask for confirmation before proceeding
read -p "Press Enter to execute the callback test (or Ctrl+C to cancel)... "

echo ""
echo "Executing request..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTOTAL_TIME:%{time_total}\n" "$CALLBACK_URL")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TOTAL_TIME:/d')
TOTAL_TIME=$(echo "$RESPONSE" | grep "TOTAL_TIME:" | cut -d: -f2)

echo "Response Body:"
echo "  $BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo "Total Time: ${TOTAL_TIME}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Evaluate result
if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q '"success":true'; then
        echo "✅ PASS: Callback accepted with valid signature"
        echo ""
        echo "Verification steps:"
        echo "  1. Check DB: response status should be 'complete'"
        echo "     SELECT status, s2s_verified FROM responses WHERE clickid='$CLICKID';"
        echo "  2. Check logs: callback_logs should have an entry"
        echo "     SELECT * FROM callback_logs WHERE clickid='$CLICKID' ORDER BY created_at DESC LIMIT 1;"
        echo "  3. Check S2S log: s2s_logs should show hash_match=true"
        echo "     SELECT * FROM s2s_logs WHERE response_id=(SELECT id FROM responses WHERE clickid='$CLICKID') ORDER BY created_at DESC LIMIT 1;"
        exit 0
    else
        echo "⚠️  WARNING: HTTP 200 but success=false in body"
        echo "Check logs for reason"
        exit 1
    fi
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ FAIL: Signature rejected (expected if using wrong secret)"
    exit 1
else
    echo "❌ FAIL: Unexpected HTTP status $HTTP_CODE"
    exit 1
fi
