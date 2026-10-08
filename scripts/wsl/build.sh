#!/usr/bin/env bash
# Sync the Windows checkout into WSL's native filesystem and build there —
# OpenNext needs real symlinks, which Windows blocks without Developer Mode.
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
SRC=/mnt/c/Users/Admin/projects/aqim
DST="$HOME/aqim"
mkdir -p "$DST"
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude .open-next \
  --exclude .wrangler --exclude src/generated --exclude .git \
  "$SRC/" "$DST/"
cd "$DST"
echo "== npm ci"
npm ci --no-audit --no-fund 2>&1 | tail -3
npm rebuild esbuild workerd >/dev/null 2>&1 || true
echo "== prisma generate"
npx prisma generate 2>&1 | tail -1
echo "== build"
CI=1 npx opennextjs-cloudflare build < /dev/null 2>&1 | tail -15
