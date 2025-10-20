#!/bin/bash

# Constant & Co Backend API Test Suite
# This script tests all backend functionality

echo "🧪 Constant & Co Backend API Test Suite"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_command="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    # Run the curl command and capture response and status
    response=$(eval "$curl_command" 2>/dev/null)
    status_code=$(echo "$response" | grep -o "Status: [0-9]*" | cut -d' ' -f2)
    actual_response=$(echo "$response" | sed '/Status:/d')
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $status_code"
        echo -e "  Response: $actual_response"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo -e "  Response: $actual_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running on http://localhost:3001${NC}"
    echo ""
else
    echo -e "${RED}❌ Server is not running!${NC}"
    echo "Please start the server first:"
    echo "  cd api && node server.js"
    exit 1
fi

echo -e "${YELLOW}Starting Backend Tests...${NC}"
echo ""

# Test 1: Health Check
run_test "Health Check" "200" 'curl -s http://localhost:3001/api/health -w "\nStatus: %{http_code}\n"'

# Test 2: Newsletter Subscription
run_test "Newsletter - New Subscription" "200" 'curl -X POST http://localhost:3001/api/newsletter -H "Content-Type: application/json" -d "{\"email\":\"newuser@example.com\"}" -w "\nStatus: %{http_code}\n"'

run_test "Newsletter - Duplicate Subscription" "200" 'curl -X POST http://localhost:3001/api/newsletter -H "Content-Type: application/json" -d "{\"email\":\"newuser@example.com\"}" -w "\nStatus: %{http_code}\n"'

run_test "Newsletter - Invalid Email" "400" 'curl -X POST http://localhost:3001/api/newsletter -H "Content-Type: application/json" -d "{\"email\":\"invalid-email\"}" -w "\nStatus: %{http_code}\n"'

# Test 3: User Signup
run_test "Signup - New Individual User" "201" 'curl -X POST http://localhost:3001/api/signup -H "Content-Type: application/json" -d "{\"name\":\"Test Individual\",\"email\":\"individual@example.com\",\"phone\":\"0412345678\",\"client_type\":\"individual\",\"service\":\"tax\",\"note\":\"Need tax help\",\"password\":\"SecurePass123!\"}" -w "\nStatus: %{http_code}\n"'

run_test "Signup - New Business User" "201" 'curl -X POST http://localhost:3001/api/signup -H "Content-Type: application/json" -d "{\"name\":\"Test Business\",\"email\":\"business@example.com\",\"phone\":\"0423456789\",\"client_type\":\"business\",\"service\":\"advisory\",\"note\":\"Business consulting\",\"password\":\"BusinessPass456!\"}" -w "\nStatus: %{http_code}\n"'

run_test "Signup - Duplicate Email" "409" 'curl -X POST http://localhost:3001/api/signup -H "Content-Type: application/json" -d "{\"name\":\"Duplicate User\",\"email\":\"individual@example.com\",\"password\":\"AnotherPass789!\"}" -w "\nStatus: %{http_code}\n"'

run_test "Signup - Weak Password" "400" 'curl -X POST http://localhost:3001/api/signup -H "Content-Type: application/json" -d "{\"name\":\"Weak Password User\",\"email\":\"weak@example.com\",\"password\":\"123\"}" -w "\nStatus: %{http_code}\n"'

# Test 4: User Login
run_test "Login - Valid Individual User" "200" 'curl -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d "{\"email\":\"individual@example.com\",\"password\":\"SecurePass123!\"}" -w "\nStatus: %{http_code}\n"'

run_test "Login - Valid Business User" "200" 'curl -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d "{\"email\":\"business@example.com\",\"password\":\"BusinessPass456!\"}" -w "\nStatus: %{http_code}\n"'

run_test "Login - Wrong Password" "401" 'curl -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d "{\"email\":\"individual@example.com\",\"password\":\"WrongPassword\"}" -w "\nStatus: %{http_code}\n"'

run_test "Login - Non-existent User" "401" 'curl -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d "{\"email\":\"nonexistent@example.com\",\"password\":\"SomePassword\"}" -w "\nStatus: %{http_code}\n"'

# Test 5: Contact Form
run_test "Contact - Complete Form" "200" 'curl -X POST http://localhost:3001/api/contact -H "Content-Type: application/json" -d "{\"name\":\"Contact Test User\",\"email\":\"contact@example.com\",\"phone\":\"0434567890\",\"subject\":\"Test Inquiry\",\"message\":\"This is a test contact message for the backend API.\"}" -w "\nStatus: %{http_code}\n"'

run_test "Contact - Minimal Form" "200" 'curl -X POST http://localhost:3001/api/contact -H "Content-Type: application/json" -d "{\"name\":\"Minimal User\",\"email\":\"minimal@example.com\",\"subject\":\"Quick Question\",\"message\":\"Short message.\"}" -w "\nStatus: %{http_code}\n"'

run_test "Contact - Missing Required Fields" "400" 'curl -X POST http://localhost:3001/api/contact -H "Content-Type: application/json" -d "{\"name\":\"\",\"email\":\"invalid-email\",\"subject\":\"\",\"message\":\"\"}" -w "\nStatus: %{http_code}\n"'

# Test 6: Database Info
run_test "Database Info" "200" 'curl -s http://localhost:3001/api/dbinfo -w "\nStatus: %{http_code}\n"'

# Summary
echo "========================================"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo "========================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Backend is working perfectly!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
    exit 1
fi
