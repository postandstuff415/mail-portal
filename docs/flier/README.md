# Post and Stuff flier (4 x 6 in and 5 x 7 in)

Both sizes are the same design. Each PDF includes 1/16 in bleed on every side (the dark background runs past the cut line, so no white edges), and text stays at least 1/4 in from the edge.

| Size | Send to the printer | Image (300 dpi) |
| --- | --- | --- |
| 4 x 6 in | `post-and-stuff-flier-4x6.pdf` (4.125 x 6.125 in) | `post-and-stuff-flier-4x6.png` (1238 x 1838 px) |
| 5 x 7 in | `post-and-stuff-flier-5x7.pdf` (5.125 x 7.125 in) | `post-and-stuff-flier-5x7.png` (1538 x 2138 px) |

- The PNGs are for printers that want an image, or for social media.
- The QR code opens https://postandstuff.com/signup. Scan a printed proof before ordering a full run.

To change wording: edit `scripts/make-flier.mjs` and run `node scripts/make-flier.mjs` (it writes `flier.html` for 4x6 and `flier-5x7.html` for 5x7). Then re-render each size with Chrome:

```
chrome --headless=new --no-pdf-header-footer --print-to-pdf=docs/flier/post-and-stuff-flier-4x6.pdf docs/flier/flier.html
chrome --headless=new --no-pdf-header-footer --print-to-pdf=docs/flier/post-and-stuff-flier-5x7.pdf docs/flier/flier-5x7.html
chrome --headless=new --hide-scrollbars --window-size=396,588 --force-device-scale-factor=3.125 --screenshot=docs/flier/post-and-stuff-flier-4x6.png docs/flier/flier.html
chrome --headless=new --hide-scrollbars --window-size=492,684 --force-device-scale-factor=3.125 --screenshot=docs/flier/post-and-stuff-flier-5x7.png docs/flier/flier-5x7.html
```
