# tests/integration/jwt-auth.hurl
# Test with JWT Bearer token
POST http://localhost:8080/v1/fragments
Content-Type: application/json
Authorization: Bearer {{TOKEN}}
{
  "type": "text/plain",
  "data": "Testing JWT auth"
}

HTTP/1.1 201
[Asserts]
header "Location" exists
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" exists

# Display full response for debugging
[Options]
verbose: true
