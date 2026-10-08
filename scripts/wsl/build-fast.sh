#!/usr/bin/env bash
# Same as build.sh, but skips `npm ci` when package-lock.json hasn't changed.
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
SRC=/mnt/c/Users/Admin/projects/aqim
DST="$HOME/aqim"
mkdir -p "$DST"
OLD=$(sha1sum "$DST/package-lock.json" 2>/dev/null | cut -d' ' -f1 || true)
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude .open-next \
  --exclude .wrangler --exclude src/generated --exclude .git \
  "$SRC/" "$DST/"
cd "$DST"
NEW=$(sha1sum package-lock.json | cut -d' ' -f1)
if [ "$OLD" != "$NEW" ] || [ ! -d node_modules ]; then
  echo "== npm ci"; npm ci --no-audit --no-fund 2>&1 | tail -3
  npm rebuild esbuild workerd >/dev/null 2>&1 || true
else
  echo "== deps unchanged"
fi
[ -d src/generated ] || { echo "== prisma generate"; npx prisma generate 2>&1 | tail -1; }
echo "== build"
CI=1 NODE_OPTIONS=--max-old-space-size=2048 npx opennextjs-cloudflare build < /dev/null 2>&1 | tail -6
