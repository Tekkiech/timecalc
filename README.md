# 168 — Free Hours Calculator

A week has 168 hours. This is a small, fast, single-page calculator that helps
you find out how many of them are actually yours — subtract sleep, school,
work, church, commute, or any custom category, and see what's left for
studying or picking up a shift.

No build step, no framework, no backend. Everything runs client-side and
saves only to your own browser's local storage — nothing is sent anywhere.

## Features

- **Quick mode** — one weekly-hours input per category.
- **Day-by-day mode** — a Mon–Sun grid per category for more accurate totals.
- **Edit mode** — rename, recolor, drag-to-reorder, or remove *any* category,
  including the defaults (Sleep, School, Work, Church, Commute), add your
  own, and edit the page's own headline, subtext, and section copy in place.
- **Configurable insights** — set your own study-block and shift-block
  lengths instead of the 2-hour / 8-hour defaults.
- **Three day-breakdown views** — bar chart, pie chart, or a pictogram
  (waffle chart), switchable any time.
- **Live results** — an animated ring, free-hours count, average free hours
  per day, and estimated study blocks / shifts you could fit.
- **Persistence** — every edit (categories, colors, order, copy, chart
  choice, settings) is saved to `localStorage` automatically, with a
  one-click "reset everything to defaults."
- Dark, editorial visual style with GSAP scroll/entrance animations and a
  Three.js ambient background (168 points on a sphere — one per hour).

## Tech

Plain HTML/CSS/JS. [GSAP](https://gsap.com/) (+ ScrollTrigger) for animation,
[Three.js](https://threejs.org/) for the background scene, both loaded from
CDN. No bundler, no dependencies to install.

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8877
```

then open `http://localhost:8877`.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Pick the `main` branch and `/ (root)` folder, then **Save**.
5. Your site will be live at `https://<username>.github.io/<repo-name>/`
   within a minute or two.

## License

MIT — see [LICENSE](LICENSE).
