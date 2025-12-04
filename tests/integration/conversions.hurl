# tests/integration/conversions.hurl
# Integration tests for fragment conversions

# Test 1: Markdown conversions
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:Hello123
```
# Hello World

This is **markdown** content.
```

HTTP/1.1 201
[Captures]
md_url: header "Location"
md_id: jsonpath "$.fragment.id"

# Get markdown as HTML
GET http://localhost:8080/v1/fragments/{{md_id}}.html
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/html; charset=utf-8
[Asserts]
body contains "<h1>Hello World</h1>"
body contains "<strong>markdown</strong>"

# Get markdown as text
GET http://localhost:8080/v1/fragments/{{md_id}}.txt
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body contains "# Hello World"
body contains "**markdown**"

# Test 2: JSON conversions
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:Hello123

{"name": "test", "value": 123}

HTTP/1.1 201
[Captures]
json_id: jsonpath "$.fragment.id"

# Get JSON as YAML
GET http://localhost:8080/v1/fragments/{{json_id}}.yaml
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "name: test"
body contains "value: 123"

# Get JSON as text
GET http://localhost:8080/v1/fragments/{{json_id}}.txt
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body contains "test"
body contains "123"

# Test 3: Plain text conversions
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:Hello123
```
Just plain text here```

HTTP/1.1 201
[Captures]
txt_id: jsonpath "$.fragment.id"

# Get text as .txt (same format)
GET http://localhost:8080/v1/fragments/{{txt_id}}.txt
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Just plain text here"

# Test 4: Invalid conversion (text to image should fail)
GET http://localhost:8080/v1/fragments/{{txt_id}}.png
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 415
[Asserts]
jsonpath "$.error.message" contains "Unsupported"

# Test 5: HTML conversions
POST http://localhost:8080/v1/fragments
Content-Type: text/html
[BasicAuth]
user1@email.com:Hello123
```
<html><body><h1>Test</h1></body></html>
```

HTTP/1.1 201
[Captures]
html_id: jsonpath "$.fragment.id"

# Get HTML as text (strips tags)
GET http://localhost:8080/v1/fragments/{{html_id}}.txt
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body contains "Test"

# Test 6: CSV conversions
POST http://localhost:8080/v1/fragments
Content-Type: text/csv
[BasicAuth]
user1@email.com:Hello123
```
name,age,city
John,30,NYC
Jane,25,LA
```

HTTP/1.1 201
[Captures]
csv_id: jsonpath "$.fragment.id"

# Get CSV as JSON
GET http://localhost:8080/v1/fragments/{{csv_id}}.json
[BasicAuth]
user1@email.com:Hello123

HTTP/1.1 200
[Asserts]
header "Content-Type" contains "application/json"
jsonpath "$[0].name" == "John"
jsonpath "$[0].age" == "30"
jsonpath "$[1].name" == "Jane"
