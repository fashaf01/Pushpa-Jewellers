#!/usr/bin/env sh
# Bulk-download product images from a WordPress / WooCommerce site.
#
# Run this on your own machine — it needs to reach the site, which the build
# environment cannot. It walks the WordPress REST media library, saves every
# image into ./product-images/, and writes a manifest of what came down.
#
#   sh tools/fetch-images.sh https://saravanas.lk
#
# Needs: curl, python3.

set -eu

SITE="${1:-}"
OUT="${2:-product-images}"

if [ -z "$SITE" ]; then
  echo "usage: sh tools/fetch-images.sh <site-url> [output-dir]" >&2
  exit 2
fi

SITE="${SITE%/}"
mkdir -p "$OUT"
: > "$OUT/manifest.tsv"

echo "Reading the media library at $SITE ..."

page=1
total=0
while : ; do
  body=$(curl -fsS "$SITE/wp-json/wp/v2/media?per_page=100&media_type=image&page=$page" 2>/dev/null) || break
  [ -z "$body" ] && break

  count=$(printf '%s' "$body" | python3 -c '
import sys, json
try:
    items = json.load(sys.stdin)
except Exception:
    items = []
if not isinstance(items, list):
    items = []
for m in items:
    url = m.get("source_url", "")
    if not url:
        continue
    title = (m.get("title") or {}).get("rendered", "")
    alt = m.get("alt_text", "")
    print("\t".join([url, title.replace("\t", " "), alt.replace("\t", " ")]))
print("__COUNT__%d" % len(items), file=sys.stderr)
' 2>"$OUT/.count" >> "$OUT/manifest.tsv")

  n=$(sed -n 's/^__COUNT__//p' "$OUT/.count" 2>/dev/null || echo 0)
  [ -z "$n" ] && n=0
  [ "$n" -eq 0 ] && break

  total=$((total + n))
  echo "  page $page — $n images (running total $total)"
  page=$((page + 1))
done

rm -f "$OUT/.count"

if [ "$total" -eq 0 ]; then
  echo ""
  echo "The REST media route returned nothing. Either it is disabled, or the site"
  echo "is not WordPress. Fall back to mirroring the uploads folder:"
  echo ""
  echo "  wget -r -l4 -nc -A jpg,jpeg,png,webp -P $OUT $SITE/wp-content/uploads/"
  echo ""
  exit 1
fi

echo ""
echo "Downloading $total images into $OUT/ ..."
cut -f1 "$OUT/manifest.tsv" | while read -r url; do
  [ -z "$url" ] && continue
  name=$(printf '%s' "$url" | sed 's#.*/##')
  [ -f "$OUT/$name" ] || curl -fsS -o "$OUT/$name" "$url" || echo "  skipped $url" >&2
done

echo ""
echo "Done. $(find "$OUT" -type f ! -name manifest.tsv | wc -l | tr -d ' ') files in $OUT/"
echo "manifest.tsv lists each URL with its title and alt text."
echo ""
echo "Next: commit that folder (or send it over) and the images get wired into the page."
