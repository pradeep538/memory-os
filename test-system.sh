#!/bin/bash

# Memory OS - Complete System Test
# Tests all major features end-to-end

echo "🧪 Memory OS - System Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0

# Helper function
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected="$5"
  
  echo -n "Testing: $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s "$BASE_URL$endpoint")
  else
    response=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
  fi
  
  if echo "$response" | grep -q "$expected"; then
    echo "✅ PASSED"
    ((PASSED++))
  else
    echo "❌ FAILED"
    echo "  Expected: $expected"
    echo "  Got: $response"
    ((FAILED++))
  fi
}

echo "📊 1. HEALTH CHECKS"
echo "────────────────────────────────────────"
test_api "Backend health" "GET" "/health" "" "healthy"
test_api "Modules loaded" "GET" "/api/v1/modules" "" "fitness"

echo ""
echo "📝 2. INPUT PROCESSING"
echo "────────────────────────────────────────"
test_api "Fitness input" "POST" "/api/v1/input/text" '{"text":"Did 100 pushups"}' "success"
test_api "Finance input" "POST" "/api/v1/input/text" '{"text":"Paid 500 for food"}' "success"
test_api "Routine input" "POST" "/api/v1/input/text" '{"text":"Took vitamin C"}' "success"

echo ""
echo "💾 3. MEMORY MANAGEMENT"
echo "────────────────────────────────────────"
test_api "List memories" "GET" "/api/v1/memory" "" "memories"
test_api "Category stats" "GET" "/api/v1/memory/stats/categories" "" "fitness"

echo ""
echo "🔍 4. QUERY ENGINE"
echo "────────────────────────────────────────"
test_api "Count query" "POST" "/api/v1/query" '{"question":"How many workouts?"}' "answer"
test_api "Spending query" "POST" "/api/v1/query" '{"question":"How much did I spend?"}' "answer"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
