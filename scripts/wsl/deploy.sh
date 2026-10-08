#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
export CLOUDFLARE_API_TOKEN="$(tr -d '\r\n ' < /mnt/c/Users/Admin/.cloudflare_token_for_aqim.txt)"
export CLOUDFLARE_ACCOUNT_ID=23c4ed86016680e63c6c038a14a9806b
cd "$HOME/aqim"
echo "== deploy"
npx opennextjs-cloudflare deploy < /dev/null 2>&1 | tail -20
