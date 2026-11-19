#!/usr/bin/env sh
# Builds dist/pushpa-hostinger.zip: exactly the files that go into Hostinger's public_html.
#
#   sh tools/package-hostinger.sh
#
# Upload the zip in hPanel > Files > File Manager > public_html, then right-click > Extract.
# Leaves out everything that is only for development (README, docs, tools).
# The database details live outside public_html (pj-data/), so re-extracting never touches them.

set -eu
cd "$(dirname "$0")/.."

OUT=dist/pushpa-hostinger.zip
STAGE=dist/hostinger
rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"

# Site files only, as tracked by git (so stray local files never get uploaded)
git ls-files -z -- \
  .htaccess index.html coming-soon.on assets admin api \
  '*/index.html' \
| xargs -0 -I{} sh -c 'mkdir -p "$1/$(dirname "$2")" && cp "$2" "$1/$2"' _ "$STAGE" {}

# Browsers keep CSS and JS for a week (.htaccess), so every upload stamps a fresh ?v= on the site's own
# CSS and JS links: the pages are re-checked on every visit, and point at the new files at once.
STAMP=$(git rev-parse --short HEAD 2>/dev/null || date +%s)$(git diff --quiet HEAD -- 2>/dev/null || echo "-$(date +%H%M%S)")
find "$STAGE" -name index.html -exec perl -pi -e \
  's{((?:src|href)="(?!https?:)[^"]+\.(?:js|css))(?:\?v=[^"]*)?"}{$1?v='"$STAMP"'"}g' {} +

(cd "$STAGE" && zip -qr -X "../$(basename "$OUT")" .htaccess .)

echo "$OUT  $(du -h "$OUT" | cut -f1)  ($(cd "$STAGE" && find . -type f | wc -l | tr -d ' ') files)"
