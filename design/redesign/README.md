# Redesign preview (November 2026)

A one-page design for the home page: EB Garamond for headlines, Outfit for text and the interface, the hot pink
from Pushpa's own print (#db0a73, sampled from the Suba Mangala flyer), plum and gold, and a new money exchange
section (Western Union, Ria Money Transfer, MoneyGram, foreign currency) with the three showrooms and numbers.

Build the self-contained preview (fonts and photos inlined) with:

    python3 design/redesign/build.py . dist/pushpa-redesign.html

`fonts/` holds the two families cut down to Latin, as woff2 (from the EB Garamond and Outfit files the client
sent; both under the SIL Open Font License, copies here).

Motion: the hero rises in on first view (CSS animation, 800 ms, strong ease-out, 80 ms stagger; the photo unveils
with clip-path), blocks fade up once as they scroll into view, the pink band drifts at a constant linear pace and
pauses under the pointer, buttons press to 0.97. Hover effects only run on devices with a real pointer, and
reduced-motion keeps the fades and drops the movement.

The gold rate in the bar is a sample; the live site reads it from /api/gold.
