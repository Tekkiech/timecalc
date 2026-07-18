# 168 — Free Hours Calculator

A week has 168 hours. This is a small, fast, single-page calculator that helps
you find out how many of them are actually yours — subtract sleep, school,
work, church, commute, or any custom category, and see what's left for
studying or picking up a shift.

No build step, no framework, no backend. Everything runs client-side and
nothing you type is stored or sent anywhere.

## Features

- **Quick mode** — one weekly-hours input per category.
- **Day-by-day mode** — a Mon–Sun grid per category for more accurate totals.
- **Custom categories** — add and remove your own (gym, volunteering, etc).
- **Live results** — an animated ring, free-hours count, average free hours
  per day, and estimated 2-hour study blocks / 8-hour shifts you could fit.
- **Per-day breakdown** — a bar chart of free hours for each day of the week.
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
