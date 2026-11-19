#!/bin/sh
# Builds dist/hostinger-upload.zip: only the files the live site needs.
# Upload it in hPanel > File Manager > public_html, then Extract.
set -e
cd "$(dirname "$0")/.."
rm -f dist/hostinger-upload.zip
mkdir -p dist
zip -rq dist/hostinger-upload.zip index.html .htaccess assets -x '*.DS_Store'
unzip -l dist/hostinger-upload.zip
echo "Built dist/hostinger-upload.zip"
