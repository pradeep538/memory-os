#!/bin/bash

# Memory OS - Test Suite
# Runs comprehensive integration tests

set -e

echo "🧪 Memory OS - Integration Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="http://localhost:3000"
ANALYTICS_URL="http://localhost:8001"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected="$5"
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s "$endpoint")
    else
        response=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "$endpoint")
    fi
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected"
        echo "  Got: $response"
        ((FAILED++))
    fi
}

echo "📡 Health Checks"
echo "────────────────────────────────────────"

# 1. Backend Health
test_endpoint "Backend health" "GET" "$BASE_URL/health" "" "healthy"

# 2. Analytics Health
test_endpoint "Analytics health" "GET" "$ANALYTICS_URL/health" "" "healthy"

# 3. Modules Loaded
test_endpoint "Modules loaded" "GET" "$BASE_URL/api/v1/modules" "" "fitness"

echo ""
echo "📝 Input Processing"
echo "────────────────────────────────────────"

# 4. Text Input - Fitness
test_endpoint "Text input (fitness)" "POST" "$BASE_URL/api/v1/input/text" \
    '{"text":"Did chest workout for 45 minutes"}' \
    "confidence"

# 5. Text Input - Finance
test_endpoint "Text input (finance)" "POST" "$BASE_URL/api/v1/input/text" \
    '{"text":"Paid 500 rupees for groceries"}' \
    "confidence"

# 6. Text Input - Routine
test_endpoint "Text input (routine)" "POST" "$BASE_URL/api/v1/input/text" \
    '{"text":"Took vitamin C"}' \
    "confidence"

echo ""
echo "🧠 Memory Management"
echo "────────────────────────────────────────"

# 7. List Memories
test_endpoint "List memories" "GET" "$BASE_URL/api/v1/memory" "" "memories"

# 8. Category Stats
test_endpoint "Category stats" "GET" "$BASE_URL/api/v1/memory/stats/categories" "" "stats"

echo ""
echo "📊 Analytics & Insights"
echo "────────────────────────────────────────"

# 9. Get Insights
test_endpoint "Get insights" "GET" "$BASE_URL/api/v1/insights" "" "insights"

echo ""
echo "🔍 Query Engine"
echo "────────────────────────────────────────"

# 10. Query - Count workouts
test_endpoint "Query: workout count" "POST" "$BASE_URL/api/v1/query" \
    '{"question":"How many workouts this week?"}' \
    "answer"

# 11. Query - Finance
test_endpoint "Query: spending" "POST" "$BASE_URL/api/v1/query" \
    '{"question":"How much did I spend on food?"}' \
    "answer"

echo ""
echo "🔔 Notifications"
echo "────────────────────────────────────────"

# 12. List Notifications
test_endpoint "List notifications" "GET" "$BASE_URL/api/v1/notifications" "" "notifications"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
