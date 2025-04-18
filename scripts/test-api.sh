#!/bin/bash

# API Test Script for GuruChat MERN Backend (Improved Robustness + Reporting)
# ---------------------------------------------------------------------------
# Usage:
# 1. Make sure the Vercel development server is running: `vercel dev`
# 2. Ensure 'jq' is installed (https://stedolan.github.io/jq/download/).
# 3. Make the script executable: `chmod +x scripts/test-api.sh`
# 4. Run the script: `./scripts/test-api.sh`
#
# Note: Uses fixed credentials. Runs all tests and provides a summary.

# --- Configuration ---
BASE_URL="http://localhost:3000/api"
TEST_EMAIL="test-script-user-$(date +%s)@example.com" # Use timestamp for uniqueness
TEST_PASSWORD="password123"
TEST_NAME="API Test User"
COOKIE_JAR=$(mktemp) # Create a temporary file for cookies
GURU_ID="" # Will be populated later

# --- Counters and Colors ---
PASS_COUNT=0
FAIL_COUNT=0
TEST_INDEX=0
TOTAL_TESTS=11 # Adjusted to reflect 11 distinct test blocks

COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'

# --- Helper Functions ---

# Cleanup function to remove cookie jar on exit
trap 'echo -e "\nCleaning up..."; rm -f "$COOKIE_JAR"; echo "Done."; exit $FAIL_COUNT' EXIT SIGHUP SIGINT SIGTERM

# Function to print test headers
print_test_header() {
  TEST_INDEX=$((TEST_INDEX + 1))
  echo -e "\n${COLOR_BLUE}[Test ${TEST_INDEX}/${TOTAL_TESTS}] $1${COLOR_RESET}"
}

# Function to check command success (checks HTTP status code)
# Updates PASS_COUNT/FAIL_COUNT, returns 0 on pass, 1 on fail
# Usage: check_success $HTTP_STATUS $EXPECTED_STATUS "$ERROR_MESSAGE" "$RESPONSE_BODY"
check_success() {
  local http_status=$1
  local expected_status=$2
  local error_message=$3
  local response_body=$4
  local check_passed=0 # Assume pass

  echo -n "  Expecting HTTP $expected_status... "
  if [ "$http_status" -ne "$expected_status" ]; then
    echo -e "${COLOR_RED}FAILED!${COLOR_RESET}"
    echo "    Error: $error_message"
    echo "    Expected HTTP Status: $expected_status, Received: $http_status"
    if [[ -n "$response_body" ]]; then
        echo "    Response Body:"
        # Attempt pretty print, fallback to raw if jq fails
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
    check_passed=1 # Mark as failed
  else
    echo -e "${COLOR_GREEN}OK.${COLOR_RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
  return $check_passed
}

# Function to check command success allowing multiple status codes
# Updates PASS_COUNT/FAIL_COUNT, returns 0 on pass, 1 on fail
# Usage: check_success_multi "$HTTP_STATUS" "status1 status2" "$ERROR_MESSAGE" "$RESPONSE_BODY"
check_success_multi() {
  local http_status=$1
  local expected_statuses=($2) # Create array from space-separated string
  local error_message=$3
  local response_body=$4
  local match=0
  local check_passed=0 # Assume pass

  echo -n "  Expecting HTTP (${expected_statuses[*]})... "
  for status in "${expected_statuses[@]}"; do
    if [ "$http_status" -eq "$status" ]; then
      match=1
      break
    fi
  done

  if [ "$match" -eq 0 ]; then
    echo -e "${COLOR_RED}FAILED!${COLOR_RESET}"
    echo "    Error: $error_message"
    echo "    Expected HTTP Statuses: (${expected_statuses[*]}), Received: $http_status"
     if [[ -n "$response_body" ]]; then
        echo "    Response Body:"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
    check_passed=1 # Mark as failed
  else
    echo -e "${COLOR_GREEN}OK (HTTP $http_status).${COLOR_RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
  return $check_passed
}

# Function to check JSON property existence and value, allowing jq arguments
# Updates PASS_COUNT/FAIL_COUNT, returns 0 on pass, 1 on fail
# Usage: check_json "$JSON_BODY" "$JQ_QUERY" "$DESCRIPTION" [jq_args...]
check_json() {
    local json_body=$1
    local jq_query=$2
    local description=$3
    shift 3 # Remove the first 3 args (body, query, description)
    local jq_args=("$@") # Capture remaining args for jq
    local check_passed=0 # Assume pass

    echo -n "  Checking JSON: $description... "
    # Pass jq_args before the query
    if ! echo "$json_body" | jq -e "${jq_args[@]}" "$jq_query" > /dev/null 2>&1; then
        echo -e "${COLOR_RED}FAILED!${COLOR_RESET}"
        echo "    JQ Args: ${jq_args[@]}"
        echo "    JQ Query: $jq_query"
        echo "    JSON Body:"
        echo "$json_body" | jq '.' 2>/dev/null || echo "$json_body"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        check_passed=1
    else
        echo -e "${COLOR_GREEN}OK.${COLOR_RESET}"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
    return $check_passed
}

# Function to check cookie properties
# Updates PASS_COUNT/FAIL_COUNT, returns 0 on pass, 1 on fail
# Usage: check_cookie "$COOKIE_JAR_PATH" "$COOKIE_NAME" "$EXPECTED_HTTPONLY" "$EXPECTED_SECURE"
check_cookie() {
    local cookie_jar=$1
    local cookie_name=$2
    local expected_httponly=$3 # true or false
    local expected_secure=$4   # TRUE or FALSE (as per curl format)
    local description="Cookie '$cookie_name' flags (HttpOnly=$expected_httponly, Secure=$expected_secure)"
    local check_passed=0 # Assume pass

    echo -n "  Checking: $description... "
    local has_failed=0

    # Check HttpOnly
    if [[ "$expected_httponly" == "true" ]]; then
        if ! grep -q "^#HttpOnly_.*[[:space:]]${cookie_name}[[:space:]]" "$cookie_jar"; then
            echo -e "${COLOR_RED}FAILED! (HttpOnly missing)${COLOR_RESET}"
            has_failed=1
        fi
    else # Expected HttpOnly=false (less common, but check if needed)
         if grep -q "^#HttpOnly_.*[[:space:]]${cookie_name}[[:space:]]" "$cookie_jar"; then
            echo -e "${COLOR_RED}FAILED! (HttpOnly unexpectedly present)${COLOR_RESET}"
            has_failed=1
        fi
    fi

    # Check Secure flag (only if HttpOnly check passed or wasn't the failure)
    if [[ "$has_failed" -eq 0 ]]; then
        local secure_flag=$(awk -v name="$cookie_name" '$6 == name {print $4}' "$cookie_jar")
        if [[ "$secure_flag" != "$expected_secure" ]]; then
             echo -e "${COLOR_RED}FAILED! (Secure flag mismatch. Expected: $expected_secure, Got: $secure_flag)${COLOR_RESET}"
             has_failed=1
        fi
    fi

    if [[ "$has_failed" -eq 1 ]]; then
        echo "    Cookie Jar Contents:"
        cat "$cookie_jar"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        check_passed=1
    else
         echo -e "${COLOR_GREEN}OK.${COLOR_RESET}"
         PASS_COUNT=$((PASS_COUNT + 1))
    fi
    return $check_passed
}


# --- Test Execution ---
echo -e "${COLOR_BLUE}--- GuruChat API Test Suite ---${COLOR_RESET}"
echo "Using base URL: $BASE_URL"
echo "Using test email: $TEST_EMAIL"

echo -e "\n${COLOR_YELLOW}--- Category: Public API Endpoint Tests (No Auth Required) ---${COLOR_RESET}"

# --- Test 1: Registration Input Validation (Bad Request) ---
print_test_header "[Public API] Registration with Missing Fields (Expect 400)"
# Middleware should allow this to reach the API
BAD_REG_PAYLOAD='{"name": "'"${TEST_NAME}"'", "email": "'"${TEST_EMAIL}"'"}' # Missing password
BAD_REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "${BAD_REG_PAYLOAD}")
BAD_REG_STATUS=$(echo "$BAD_REG_RESPONSE" | tail -n1)
BAD_REG_BODY=$(echo "$BAD_REG_RESPONSE" | sed '$d')
check_success "$BAD_REG_STATUS" 400 "Registration with missing fields should fail with 400 (API validation)" "$BAD_REG_BODY"

# --- Test 2: Registration (Successful or Existing User) ---
print_test_header "[Public API] Registration (Expect 201 Created or 400 Bad Request)"
# Middleware should allow this to reach the API
REG_PAYLOAD='{"name": "'"${TEST_NAME}"'", "email": "'"${TEST_EMAIL}"'", "password": "'"${TEST_PASSWORD}"'"}'
REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "${REG_PAYLOAD}")
REG_STATUS=$(echo "$REG_RESPONSE" | tail -n1)
REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')

# Expect 201 (new user) or 400 (user already exists, from API)
if check_success_multi "$REG_STATUS" "201 400" "Registration request failed" "$REG_BODY"; then
    # Additional checks based on status code
    if [ "$REG_STATUS" -eq 201 ]; then
        # API returns success message, not userId
        check_json "$REG_BODY" '.message == "User registered successfully"' "Success message is correct"
    elif [ "$REG_STATUS" -eq 400 ]; then # Changed from 409 to 400
        check_json "$REG_BODY" '.message | test("already exists")' "Error message contains 'already exists'"
    fi
fi

# --- Test 3: Login & Cookie Handling ---
print_test_header "[Public API] Login (Expect 200)"
# Middleware should allow this to reach the API
LOGIN_PAYLOAD='{"email": "'"${TEST_EMAIL}"'", "password": "'"${TEST_PASSWORD}"'"}'
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -c "$COOKIE_JAR" \
  -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${LOGIN_PAYLOAD}")
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if check_success "$LOGIN_STATUS" 200 "Login request failed" "$LOGIN_BODY"; then
    # Check token is NOT in body
    check_json "$LOGIN_BODY" 'has("token") | not' "Response body does not contain token"
fi

echo -e "\n${COLOR_YELLOW}--- Category: Authenticated API Endpoint Tests ---${COLOR_RESET}"

# --- Test 4: Check Cookie Flags ---
print_test_header "[Auth API] Check Cookie Flags (HttpOnly=T, Secure=F)"
# This implicitly tests the login API's Set-Cookie header
check_cookie "$COOKIE_JAR" "jwt_token" "true" "FALSE"

# --- Test 5: Fetch All Gurus (Authenticated) ---
print_test_header "[Auth API] Fetch All Gurus (Expect 200)"
# Middleware should allow authenticated request
GURUS_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -X GET "${BASE_URL}/gurus")
GURUS_STATUS=$(echo "$GURUS_RESPONSE" | tail -n1)
GURUS_BODY=$(echo "$GURUS_RESPONSE" | sed '$d')

if check_success "$GURUS_STATUS" 200 "Fetch all gurus request failed" "$GURUS_BODY"; then
    if check_json "$GURUS_BODY" '(.success == true) and (.data | type == "array")' "Response format valid (success=true, data=array)"; then
         if check_json "$GURUS_BODY" '(.data | length > 0)' "Guru data array is not empty"; then
             # Extract the ID only if prior checks passed
             GURU_ID=$(echo "$GURUS_BODY" | jq -r '.data[0]._id // ""')
             if [ -z "$GURU_ID" ]; then
               echo "    ${COLOR_RED}Error: Could not extract _id from the first guru.${COLOR_RESET}"
               FAIL_COUNT=$((FAIL_COUNT+1)) # Increment fail count directly here
             else
                echo "    Extracted Guru ID: ${GURU_ID}"
             fi
         fi
    fi
fi

# --- Test 6: Fetch Specific Guru (Authenticated) ---
print_test_header "[Auth API] Fetch Specific Guru (Expect 200)"
if [ -z "$GURU_ID" ]; then
    echo "  ${COLOR_YELLOW}SKIPPING - Guru ID not available from previous test.${COLOR_RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1)) # Count skipped as fail for summary
else
    # Middleware should allow authenticated request
    SPECIFIC_GURU_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -X GET "${BASE_URL}/gurus/${GURU_ID}")
    SPECIFIC_GURU_STATUS=$(echo "$SPECIFIC_GURU_RESPONSE" | tail -n1)
    SPECIFIC_GURU_BODY=$(echo "$SPECIFIC_GURU_RESPONSE" | sed '$d')

    if check_success "$SPECIFIC_GURU_STATUS" 200 "Fetch specific guru request failed" "$SPECIFIC_GURU_BODY"; then
        # Pass --arg GURU_ID "$GURU_ID" as separate arguments to check_json
        check_json "$SPECIFIC_GURU_BODY" '(.success == true) and (.data._id == $GURU_ID)' "Response format valid and ID matches" --arg GURU_ID "$GURU_ID"
    fi
fi

# --- Test 7: Fetch Guru with Invalid ID Format ---
print_test_header "[Auth API] Fetch Guru with Invalid ID Format (Expect 400)"
# Middleware should allow authenticated request, API should validate ID
INVALID_GURU_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -X GET "${BASE_URL}/gurus/invalid-object-id-format")
INVALID_GURU_STATUS=$(echo "$INVALID_GURU_RESPONSE" | tail -n1)
INVALID_GURU_BODY=$(echo "$INVALID_GURU_RESPONSE" | sed '$d')
check_success "$INVALID_GURU_STATUS" 400 "Fetch with invalid Guru ID should fail with 400" "$INVALID_GURU_BODY"

# --- Test 8: Chat Endpoint (Authenticated) ---
# Note: Renumbered from original Test 9 to keep auth tests together
print_test_header "[Auth API] Chat Endpoint (Expect 200 Stream Start)"
# Middleware should allow authenticated request
if [ -z "$GURU_ID" ]; then
     echo "  ${COLOR_YELLOW}SKIPPING - Guru ID not available from previous test.${COLOR_RESET}"
     FAIL_COUNT=$((FAIL_COUNT + 1))
else
    CHAT_PAYLOAD='{"messages": [{"role": "user", "content": "Hello from the test script!" }], "guruId": "'"${GURU_ID}"'"}'
    # Use --no-buffer for streaming. Send cookie. Only check initial status code.
    CHAT_STATUS=$(curl -s --no-buffer -w "%{http_code}" -o /dev/null -X POST "${BASE_URL}/chat" \
      -b "$COOKIE_JAR" \
      -H "Content-Type: application/json" \
      -d "${CHAT_PAYLOAD}")
    # For streaming, we primarily care if the connection was successful (200 OK)
    check_success "$CHAT_STATUS" 200 "Authenticated chat request failed (check Vercel dev logs for stream errors)" ""
fi

# --- Test 9: Logout ---
# Note: Renumbered from original Test 10
print_test_header "[Auth API] Logout (Expect 200)"
# Middleware should allow authenticated request
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -I \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -X POST "${BASE_URL}/auth/logout")
LOGOUT_STATUS=$(echo "$LOGOUT_RESPONSE" | grep -Fi HTTP/ | awk '{print $2}')
LOGOUT_HEADERS=$(echo "$LOGOUT_RESPONSE")

if check_success "$LOGOUT_STATUS" 200 "Logout request failed" ""; then
    # Check if Set-Cookie header is trying to clear the jwt_token
    echo -n "  Checking: Cookie clearing header present... "
    if ! echo "$LOGOUT_HEADERS" | grep -Fi 'set-cookie:' | grep -q 'jwt_token=[^;]*; .*Max-Age=0'; then
        echo -e "${COLOR_YELLOW}WARNING! (Max-Age=0 not found)${COLOR_RESET}"
        echo "    Warning: Logout response (200) did not seem to explicitly clear jwt_token via Max-Age=0."
        echo "    Logout Headers:"
        echo "$LOGOUT_HEADERS"
        # Don't fail the test, but warn - PASS_COUNT already incremented by check_success
    else
         echo -e "${COLOR_GREEN}OK.${COLOR_RESET}"
         # PASS_COUNT already incremented by check_success
    fi
fi

echo -e "\n${COLOR_YELLOW}--- Category: Middleware Tests (Incorrect Auth) ---${COLOR_RESET}"

# --- Test 10: Chat Endpoint without Authentication ---
print_test_header "[Middleware NoAuth] Chat Endpoint (Expect 307 Redirect)"
# Middleware should intercept and redirect
CHAT_PAYLOAD='{"messages": [{"role": "user", "content": "Hello again!" }], "guruId": "'"${GURU_ID}"'"}'
UNAUTH_CHAT_STATUS=$(curl -s --no-buffer -w "%{http_code}" -o /dev/null -X POST "${BASE_URL}/chat" \
  -H "Content-Type: application/json" \
  -d "${CHAT_PAYLOAD}")
# This test should expect 307 because middleware redirects unauthenticated protected API requests
check_success "$UNAUTH_CHAT_STATUS" 307 "Chat request without auth cookie should be redirected (307) by middleware" ""

# --- Test 11: Access Protected Route After Logout ---
print_test_header "[Middleware NoAuth] Fetch Gurus after Logout (Expect 307 Redirect)"
# Middleware should intercept and redirect
POST_LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -X GET "${BASE_URL}/gurus")
POST_LOGOUT_STATUS=$(echo "$POST_LOGOUT_RESPONSE" | tail -n1)
POST_LOGOUT_BODY=$(echo "$POST_LOGOUT_RESPONSE" | sed '$d')
check_success "$POST_LOGOUT_STATUS" 307 "Fetch gurus after logout should redirect (307) due to middleware" "$POST_LOGOUT_BODY"


# --- Test Summary ---
echo -e "\n${COLOR_BLUE}--- Test Summary ---${COLOR_RESET}"
echo -e "Total Tests: ${TOTAL_TESTS}" # Note: Some tests have sub-checks counted in pass/fail
echo -e "${COLOR_GREEN}Passed: ${PASS_COUNT}${COLOR_RESET}"
echo -e "${COLOR_RED}Failed: ${FAIL_COUNT}${COLOR_RESET}"
echo "--------------------"

# Exit with the number of failures (0 for success)
# The trap function will handle the final exit code 