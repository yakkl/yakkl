#!/bin/zsh
curl -X POST http://localhost:5000/gramps \
  -H "Content-Type: application/json" \
  -d '{"task": "defi_news"}'
