# tests/integration/lab-10-dynamodb.hurl
#
# Lab 10 – DynamoDB integration test

# 1. POST a new JSON fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz
Content-Type: application/json

{ "service": "DynamoDB" }

# 2. Expect 201 and capture Location + id
HTTP/1.1 201
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# 3. GET the metadata for the first fragment
GET {{fragment1_url}}/info
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

HTTP/1.1 200
[Asserts]
jsonpath "$.fragment.id" == "{{fragment1_id}}"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.created" exists
jsonpath "$.fragment.updated" exists

# 4. POST a second Markdown fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz
Content-Type: text/markdown

`DynamoDB is **great**.`

# 5. Expect 201 and capture Location + id
HTTP/1.1 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# 6. GET the metadata for the second fragment
GET {{fragment2_url}}/info
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

HTTP/1.1 200
[Asserts]
jsonpath "$.fragment.id" == "{{fragment2_id}}"
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.created" exists
jsonpath "$.fragment.updated" exists

# 7. GET all fragments
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments[*]" contains "{{fragment1_id}}"
jsonpath "$.fragments[*]" contains "{{fragment2_id}}"

# 8. DELETE the first fragment
DELETE {{fragment1_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

# 9. Confirm 200 from DELETE
HTTP/1.1 200

# 10. Try to GET the first fragment again (should be 404)
GET {{fragment1_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

# 11. Confirm 404
HTTP/1.1 404

# 12. GET all fragments again
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOkhlbGxvMTIz

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments[*]" not contains "{{fragment1_id}}"
jsonpath "$.fragments[*]" contains "{{fragment2_id}}"
    