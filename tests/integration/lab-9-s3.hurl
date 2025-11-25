# tests/integration/lab-9-s3.hurl
# Lab 9: S3 integration test (Basic Auth)

# 1. POST a text fragment with body "Hello S3!"

POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1

`Hello S3!`
HTTP/1.1 201
[Captures]
url: header "Location"

# 2. GET the fragment we just created

GET {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
header "content-type" == "text/plain; charset=utf-8"
body == "Hello S3!"

# 3. DELETE the fragment

DELETE {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200

# 4. GET again → should be 404

GET {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 404
