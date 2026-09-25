| `about.html`   | Photo, story, full elevator pitch, experience, education, skills |

The look: editorial minimal — white page, light Cormorant Garamond serif, letterspaced
small capitals, hairline rules, and a full-bleed hero photograph. No borders, shadows,
badges or icons; the photographs carry the page.# Captured by Hailey Grace — Photography Portfolio

A hand-coded portfolio and résumé site. No website builder, no frameworks, no build
step — just HTML, CSS, and one small JavaScript file. It runs anywhere that can serve
static files.

## Pages

| File | What's on it |
|---|---|
| `index.html`   | Hero, short pitch, six featured images, what I shoot |
| `work.html`    | Full gallery, filterable by category, click-to-enlarge |
| `about.html`   | Photo, story, full elevator pitch, experience, education, skills |
| `contact.html` | Contact details and an inquiry form |
| `404.html`     | Friendly not-found page |

## How it's put together

```
css/styles.css    all styling; the colour palette lives in :root at the top
js/main.js        mobile menu, scroll reveals, gallery filters, lightbox
images/grid/      ~900px versions, used in the gallery
images/full/      ~1800px versions, used when an image is opened
images/hero.jpg   the home page hero
```

**Changing the colours.** Everything reads from the variables at the top of
`css/styles.css`: `--paper` (light green page), `--paper-alt` (dusty blue bands),
`--green` / `--green-deep` (accents and buttons), `--blue` / `--blue-deep` (offset
shadows, labels, footer). Change those and the whole site follows.

**Adding a photo to the gallery.** Drop the large version in `images/full/` and a
smaller copy in `images/grid/`, then copy one `<button class="shot">` block in
`work.html` and point it at the new filenames. On a Mac you can resize without
installing anything:

```sh
sips -Z 900  -s format jpeg -s formatOptions 62 photo.jpg --out images/grid/photo.jpg
sips -Z 1800 -s format jpeg -s formatOptions 68 photo.jpg --out images/full/photo.jpg
```

## Previewing it locally

```sh
cd ~/Sites/hailey-hunt-portfolio
ruby -run -e httpd . -p 8099
```

Then open <http://127.0.0.1:8099>.

## Notes

- Works down to 360px wide; the gallery goes from three columns to one.
- Keyboard accessible throughout — the lightbox traps focus and closes on `Esc`,
  arrow keys move between images.
- Respects `prefers-reduced-motion`.
- Total page weight is small: the largest image is about 300 KB.

## Deploying

Built for GitHub Pages with no build step — the files in this folder *are* the site.

Recommended repository name: **`<your-username>.github.io`**, which publishes at
`https://<your-username>.github.io`.

If you instead use a project repo (published at `.../<repo-name>/`), change the three
root-absolute paths in `404.html` (`/css/styles.css`, `/`, `/work.html`) to relative
ones, or the not-found page will lose its styling.

## The accent colour

The site is neutral except for one accent, set once at the top of `css/styles.css`:

```css
--accent: #8C3A47;   /* oxblood */
```

It is used only on link and button hover, so changing that single line restyles every
interactive state on the site.
