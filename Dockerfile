FROM caddy:2.8-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY public /srv
# Stamp the CSS and JS links with a hash of their contents, so each release gets new URLs
# and browsers never keep last week's styles. The build fails if a link is left unstamped.
RUN V=$(cat /srv/assets/css/site.css /srv/assets/js/site.js | md5sum | cut -c1-10) \
 && sed -i "s/__V__/$V/g" /srv/index.html \
 && ! grep -q __V__ /srv/index.html

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
