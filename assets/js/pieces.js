/* The shop's own pieces, in the order they show (newest first). Pushpa's 32 Instagram pieces are in
   pieces-instagram.js and are shown alongside these, one in every row of four.

   To add a piece, put a line at the top of this list and its photo in assets/img/shop/:
     - the photo is 1080 x 1350, named after the slug: assets/img/shop/rose-ring.webp. A photo of any other size
       can be framed to fit with: python3 tools/frame-photos.py <photo> rose-ring
     - a 540 x 675 copy goes in assets/img/shop/small/ for the grid (frame-photos.py makes it, or run
       python3 tools/shop-thumbs.py); without one, the grid uses the full photo
     - more photos of the same piece: rose-ring-2.webp, rose-ring-3.webp, and photos: 3 on its line
       (a close-up cut from the same photo: python3 tools/frame-photos.py --closeup <photo> rose-ring-2)
   weight: as printed, in grams, or '' when not known. A set lists each piece with '+' ('11.580 g + 18.880 g'),
           a range uses '–' ('1.740 – 2.100 g'). note: what a single weight covers, when not the whole set.
   cats:   any of necklaces, bangles, rings, pendants, bracelets, bridal.
   ig:     optional, the Instagram post id, from instagram.com/pushpajewellers_official/p/<id>/ */
window.PIECES = [];
