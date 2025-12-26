#!/bin/bash

# Dictionary API Test Script
# Tests all dictionary endpoints to verify deployment

set -e

BASE_URL="http://localhost:8081/api"
FRONTEND_URL="http://localhost:3000"

echo "🧪 Dictionary Module - API Test Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_code=$4
    local body=$5
    local auth_token=$6

    echo -n "Testing $name... "

    local cmd="curl -s -w '\n%{http_code}' -X $method $BASE_URL$endpoint"
    
    if [ ! -z "$auth_token" ]; then
        cmd="$cmd -H 'Authorization: Bearer $auth_token'"
    fi
    
    if [ ! -z "$body" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$body'"
    fi

    response=$(eval $cmd)
    http_code=$(echo "$response" | tail -1)
    body_content=$(echo "$response" | head -n -1)

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
        echo "Response: $body_content"
        FAILED=$((FAILED + 1))
    fi
}

echo "📌 Prerequisites Check"
echo "--------------------"

# Check if backend is running
echo -n "Checking backend... "
if curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "Please start docker-compose: cd vsl-platform-backend && docker-compose up -d"
    exit 1
fi

# Check if frontend is running
echo -n "Checking frontend... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running${NC} (optional for API tests)"
fi

echo ""
echo "📚 Testing Dictionary Search Endpoints"
echo "-------------------------------------"

# Test 1: Search dictionary
test_endpoint "Search dictionary" "GET" "/dictionary/search?query=xin" "200"

# Test 2: Search with empty query
test_endpoint "Search empty query" "GET" "/dictionary/search?query=" "200"

# Test 3: Get specific word
test_endpoint "Get word by ID" "GET" "/dictionary/1" "200"

# Test 4: Get random word
test_endpoint "Get random word" "GET" "/dictionary/random" "200"

echo ""
echo "🔐 Authentication Test (Required for next tests)"
echo "----------------------------------------------"
echo -n "Getting test token... "

# Try to login (you may need to adjust credentials)
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"password"}')

TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠ Could not obtain token${NC}"
    echo "Skipping authenticated tests"
    echo "To test authenticated endpoints, run:"
    echo "TOKEN='your_jwt_token' bash test_dictionary.sh"
else
    echo -e "${GREEN}✓ Got token${NC}"
    echo ""
    echo "❤️ Testing Favorite Endpoints"
    echo "----------------------------"
    
    # Test 5: Check favorite status
    test_endpoint "Check favorite status" "GET" "/user/favorites/check/1" "200" "" "$TOKEN"
    
    # Test 6: Toggle favorite
    test_endpoint "Toggle favorite (add)" "POST" "/user/favorites/1" "200" "{}" "$TOKEN"
    
    # Test 7: List favorites
    test_endpoint "List user favorites" "GET" "/user/favorites" "200" "" "$TOKEN"
    
    echo ""
    echo "🚨 Testing Report Endpoints"
    echo "--------------------------"
    
    # Test 8: Submit report
    test_endpoint "Submit report" "POST" "/user/reports" "201" \
      '{"wordId":1,"reason":"Test report"}' "$TOKEN"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
