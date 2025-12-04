# tests/integration/put-fragments.hurl
# Integration tests for PUT /v1/fragments/:id

# 1. POST a text/plain fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:Hello123

`This is fragment v1`

HTTP/1.1 201
[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"

# 2. GET the fragment to verify initial content
GET {{fragment_url}}
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "This is fragment v1"

# 3. PUT to update the fragment with new content
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:Hello123

`This is fragment v2 - updated!`

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment_id}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 30

# 4. GET the fragment again to verify it was updated
GET {{fragment_url}}
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "This is fragment v2 - updated!"

# 5. Try to PUT with wrong content type (should fail with 400)
PUT {{fragment_url}}
Content-Type: application/json
[BasicAuth]
user1@email.com:Hello123

`{"test": "data"}`

HTTP/1.1 400
[Asserts]
jsonpath "$.error.message" contains "type"

# 6. Try to PUT to non-existent fragment (should fail with 404)
PUT http://localhost:8080/v1/fragments/99999999-9999-9999-9999-999999999999
Content-Type: text/plain
[BasicAuth]
user1@email.com:Hello123

`Some data`

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" contains "not found"

# 7. POST a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:Hello123

{"version": 1, "status": "initial"}

HTTP/1.1 201
[Captures]
json_fragment_url: header "Location"

# 8. PUT to update the JSON fragment
PUT {{json_fragment_url}}
Content-Type: application/json
[BasicAuth]
user1@email.com:Hello123

{"version": 2, "status": "updated", "new_field": true}

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"

# 9. GET the updated JSON fragment
GET {{json_fragment_url}}
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.version" == 2
jsonpath "$.status" == "updated"
jsonpath "$.new_field" == true
