#!/usr/bin/env sh
# Builds dist/pushpa-hostinger.zip: exactly the files that go into Hostinger's public_html.
#
#   sh tools/package-hostinger.sh
#
# Upload the zip in hPanel > Files > File Manager > public_html, then right-click > Extract.
# Leaves out everything that is only for development or for Vercel
# (README, tools, build.js, vercel.json, api/gold.js, zips).

set -eu
cd "$(dirname "$0")/.."

OUT=dist/pushpa-hostinger.zip
STAGE=dist/hostinger
rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"

# Site files only, as tracked by git (so stray local files never get uploaded)
git ls-files -z -- \
  .htaccess index.html assets api/gold.php \
  '*/index.html' \
| xargs -0 -I{} sh -c 'mkdir -p "$1/$(dirname "$2")" && cp "$2" "$1/$2"' _ "$STAGE" {}

(cd "$STAGE" && zip -qr -X "../$(basename "$OUT")" .htaccess .)

echo "$OUT  $(du -h "$OUT" | cut -f1)  ($(cd "$STAGE" && find . -type f | wc -l | tr -d ' ') files)"
