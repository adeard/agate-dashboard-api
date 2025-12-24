#!/bin/bash

# Test Machine Logs API Endpoints
# Server: http://localhost:3079

BASE_URL="http://localhost:3079"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"

echo "========================================"
echo "Testing Machine Logs File API"
echo "========================================"

echo -e "\n1. GET All Machine Logs Files"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/file"
curl -X GET "${BASE_URL}/api/v4/machine-logs/file" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n2. GET All Machine Logs Files with Filters"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/file?machine=Machine%201"
curl -X GET "${BASE_URL}/api/v4/machine-logs/file?machine=Machine%201" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n3. GET Machine Logs File Detail (replace FILE_ID with actual ID)"
FILE_ID="REPLACE_WITH_ACTUAL_FILE_ID"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/file/${FILE_ID}"
curl -X GET "${BASE_URL}/api/v4/machine-logs/file/${FILE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n========================================"
echo "Testing Machine Logs Data API"
echo "========================================"

echo -e "\n4. GET All Machine Logs Data"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/data"
curl -X GET "${BASE_URL}/api/v4/machine-logs/data" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n5. GET All Machine Logs Data with Filters"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/data?status=critical"
curl -X GET "${BASE_URL}/api/v4/machine-logs/data?status=critical" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n6. GET Machine Logs Data Detail (replace DATA_ID with actual ID)"
DATA_ID="REPLACE_WITH_ACTUAL_DATA_ID"
echo "Request: GET ${BASE_URL}/api/v4/machine-logs/data/${DATA_ID}"
curl -X GET "${BASE_URL}/api/v4/machine-logs/data/${DATA_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n========================================"
echo "Test Complete"
echo "========================================"
