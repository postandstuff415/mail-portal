# Post and Stuff flier (4 x 6 in)

- `post-and-stuff-flier-4x6.pdf`: send this to the printer. It is 4.125 x 6.125 in: a 4 x 6 card plus 1/16 in bleed on every side (the dark background runs past the cut line, so no white edges). Text stays at least 1/4 in from the edge.
- `post-and-stuff-flier-4x6.png`: same design at 300 dpi (1238 x 1838 px), for printers that want an image, or for social media.
- The QR code opens https://postandstuff.com/signup. Scan a printed proof before ordering a full run.

To change wording: edit `scripts/make-flier.mjs`, run `node scripts/make-flier.mjs`, then re-render with Chrome:

```
chrome --headless=new --no-pdf-header-footer --print-to-pdf=docs/flier/post-and-stuff-flier-4x6.pdf docs/flier/flier.html
```
