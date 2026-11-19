#!/usr/bin/env sh
# Stamps ?v=<version> on the site's own CSS and JS links in every page, in place.
#
#   sh tools/stamp-versions.sh
#
# Browsers keep CSS and JS for a week (.htaccess), so a changed file needs a new address to show at once.
# Run this before committing a release: Hostinger deploys this branch straight from GitHub, so what is
# committed is what visitors get. (tools/package-hostinger.sh stamps its zip the same way.)

set -eu
cd "$(dirname "$0")/.."
STAMP=$(date -u +%Y%m%d%H%M)
git ls-files -z -- 'index.html' '*/index.html' | xargs -0 perl -pi -e \
  's{((?:src|href)="(?!https?:)[^"]+\.(?:js|css))(?:\?v=[^"]*)?"}{$1?v='"$STAMP"'"}g'
echo "stamped ?v=$STAMP"
