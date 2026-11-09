# Inner-page motion (site-motion)

Cinematic but quiet motion for the static inner pages (`web/site/`, rendered from `web/templates/`): kinetic
headlines, reveals, card staggers, counters, hero parallax, a small 3D product on solution pages, Lenis smooth
scroll and a charcoal page wipe with a red edge, as on the homepage. Plain ES modules, no build step, same CDN
versions as the homepage (GSAP 3.13.0 with ScrollTrigger, SplitText and Flip; Lenis 1.1.13; three 0.170.0).

All copy stays in the HTML. Motion is switched on per element with the data attributes below, so Webflow
can own the text and the same effects can be rebuilt with Webflow Interactions or loaded as custom code.

## Smooth, never flickery

- Every scroll-linked effect (parallax, the 3D turn) goes through `follower.js`: each frame the value moves a
  share of the way to its target, never faster than a top speed, and catches up more slowly while the page
  scrolls fast (`FOLLOW` in config.js). A hard flick glides instead of jumping.
- Lenis eases its own smoothing down while the page moves fast (`SCROLL`).
- Entrances play once and are never hidden again: no show/hide toggles while scrolling.
- Animated items start hidden through CSS (`.sm-js`, set by the head snippet before the first paint), so they
  never flash in their final state and jump back. If the script has not started after 3 s, `.sm-failed` shows
  everything as plain text. Without JavaScript nothing is hidden.

## Attributes

| Attribute | On | What it does | Webflow Interactions equivalent |
|---|---|---|---|
| `data-reveal` | any element | Fades up once when it scrolls into view. `data-reveal="0.3"` adds a delay (s). | Scroll into view: move Y 28px to 0 + opacity 0 to 100%, 0.9 s, ease out |
| `data-reveal-group` | a rich-text wrapper | Each direct child fades up as it comes into view; a `<section>` child has its own children revealed instead. | Same as above on the children (class-based trigger) |
| `data-kinetic="words"` / `"letters"` | headline | SplitText: words (or letters) rise out of a mask one after another. | GSAP SplitText custom code, or Webflow's "split text" animation |
| `data-stagger` | a list or grid | Children (cards, facts, photos) come in one after another, once. | Scroll into view on the list: children move Y + fade, staggered 0.07 s |
| `data-counter` | a number | Counts up to the number written ("1.27 MW", "450 kW", "2023"); keeps text and decimals. A plain year counts from 12 years earlier. `data-counter-from="..."` sets the start. | Custom code (Interactions cannot count) |
| `data-parallax` | a frame round an image | The image (first child) is scaled 1.16 and drifts inside the frame as it crosses the screen. `data-parallax="4"` sets the shift (% of height). | While scrolling in view: move image Y -6% to 6%, smoothing on |
| `data-faq` | a section with `<details>` | Answers open and close with an eased height. Plain details/summary without the script. | Custom code, or a Webflow dropdown with height animation |
| `data-filter-list` | the projects card list | Filter links (`data-filter="solution=heat-pumps"`) filter in place: cards glide (GSAP Flip), new ones fade in, the URL keeps the query. Matching rule: `window.kugaFilterProjects(query)` in the page's inline script. | Finsweet CMS Filter with its built-in animation |
| `data-product-hero="<id>"` | an empty box in the hero | Lazily draws the 3D product (ids below), turning gently with scroll. Hidden if WebGL fails. | Custom code only |
| `data-page-wipe` | one empty div, first in `<body>` | The page transition panel (charcoal, red leading edge). | Custom code, or a page-load / page-leave interaction on a fixed div |
| `data-no-transition` | a link | This link navigates without the wipe. | — |
| `data-lenis-prevent` | a scrollable box | Lets the box scroll natively inside Lenis (phone menu, dropdown). | Same attribute |

Product ids (`data-product-hero`): `solar-panel`, `battery-sbr`, `battery-powerstack`, `inverter`, `hot-water`,
`ev-charger` (the homepage's procedural meshes in `web/src/shapes/`). Which solution gets which is
`SOLUTION_PRODUCTS` in `cms/render_pages.py`.

## Per mode (gsap.matchMedia)

- Full motion: everything above.
- Phone (max-width 767px): shorter moves, smaller parallax, the 3D at the low tier (pixel ratio 1.5, no
  antialias, 1024 px solar texture, no idle sway), the wipe runs bottom to top.
- Reduced motion: no Lenis, no parallax, no 3D animation (one still frame), no split text; entrances are plain
  fades; the page change is a short fade; FAQ items open natively.

## Files

```
config.js          every tunable (timings, distances, eases, quality tiers, lighting, product angles)
main.js            entry: wires the modules to the page, gsap.matchMedia, lazy 3D after the first paint
mode.js            reduced / phone, read live
scroll-speed.js    smoothed scroll speed (px/s), whatever moves the page
follower.js        eased, velocity-aware value for scroll-linked effects
smooth-scroll.js   Lenis + ScrollTrigger; #anchor links glide
page-transition.js data-page-wipe
kinetic-text.js    data-kinetic
reveal.js          data-reveal, data-reveal-group
stagger.js         data-stagger
counters.js        data-counter
parallax.js        data-parallax
faq.js             data-faq
project-filter.js  data-filter-list
product-hero.js    data-product-hero: WebGL check, scroll turn, render loop while on screen
product-scene.js   three.js renderer, camera, studio lighting
product-models.js  product id -> mesh builder in ../src/shapes/ (imported read-only)
motion.css         start states, the wipe panel, the 3D canvas
```

The page loads it through `web/templates/site-motion-head.html` (stylesheet, the small inline start-state
script, the import map and `main.js`), which `cms/render_pages.py` inlines into every page. In Webflow that
block goes once into Site settings > Custom code > Head, with `site-motion/` and `src/` hosted next to each
other (the 3D imports `../src/shapes/` and `../src/utils/product-geometry.js`).

## Known gaps

- Reduced motion was not checked in a browser (the test browser could not emulate it).
- The test browser window was throttled to a few frames per second, so tween smoothness (wipe, Flip, counters)
  was checked by state and end result, not by watching them run at 60 fps.
- The reference templates `project.html`, `news.html`, `location.html` and `product.html` (not rendered; the
  renderer uses `page.html`) carry no motion attributes yet.
- The 3D renderer is not disposed on page leave (the page is unloaded anyway).
