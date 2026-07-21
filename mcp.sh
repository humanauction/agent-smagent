#!/bin/bash
echo "$1" | node dist/ha_mcp/server.js

# test with
# ./mcp.sh '{"id":1,"method":"smage.providers"}'
# ./mcp.sh '{"id":2,"method":"smage.call","params":{"session":"abc","model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}],"options":{"provider":"local"}}}'