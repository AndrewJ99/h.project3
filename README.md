# An Anniversary Scrapbook

A single-page, dependency-free scrapbook: a book sits in the middle of a clean
white space, you flip through it (drag a page across, or use the arrows / arrow
keys), and clicking any photo pops it out big with a handwritten note beside it.

Built with plain HTML, CSS and JavaScript so it hosts anywhere static —
GitHub Pages included — and works offline.

```
3yearScrapbook/
├── index.html      structure
├── styles.css      all the look + the page-flip 3D
├── script.js       the engine (page model, dragging, lightbox)
├── photos.js       ← the ONLY file you edit: your photos + notes
└── images/         ← your photo files go here
```

## Make it yours

Everything lives in **`photos.js`** — three sections:

1. **The words** — `title`, `subtitle`, `coverYear`, and the `dedication` /
   `closing` message pages.
2. **The look** — `coverImage` (a photo behind the cover; a dark wash is laid
   over it automatically so the title stays readable), `backImage`, and a
   `theme` block of colours + fonts. Delete any `theme` line to fall back to
   the built-in sleek blue-grey default.
3. **The photos** — drop files into `images/` named `MMDDYY-A.jpeg` (date + a
   letter A–Z so you can have several photos on one day; see
   `images/README.txt`), then list each with an optional `note`. Dates are read
   from the filename and sorted automatically.

That's it. Open `index.html` in a browser to preview. Missing image files show
a soft placeholder, so the book works before every photo is in.

## Host it on GitHub Pages (free, gives you a URL)

1. Create a new repository on GitHub and upload these files (keep the structure).
2. Repo **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**. Branch: **main**, folder: **/ (root)**. Save.
4. Wait ~1 minute. Your URL appears at the top of that same Pages screen:
   `https://<your-username>.github.io/<repo-name>/`

With Git on the command line instead:

```bash
cd 3yearScrapbook
git init && git add . && git commit -m "Our third year"
git branch -M main
git remote add origin https://github.com/<you>/<repo-name>.git
git push -u origin main
# then turn on Pages in Settings as above
```

To keep the URL private-ish, give the repo an unguessable name — GitHub Pages on
a free account is always public, so don't put anything you'd mind a stranger
seeing behind a guessed link.

## How it works (and the trade-offs I made)

- **3D CSS page-flip, no library.** turn.js / StPageFlip would give a fancier
  paper-bend, but they're heavyweight and date badly. Each "leaf" here is one
  `<div>` with a front and back face; turning it is a `rotateY` transition.
  Self-contained, smooth, and easy for you to restyle. Two pages = one leaf,
  so the book is just leaves stacked with managed `z-index`.
- **Drag *and* arrows.** Dragging feels like a real book but is fiddly on its
  own; arrows (and ← → keys) are the reliable fallback. You get both. A drag
  past 40% of the page width completes the turn; less than that snaps back, and
  the snap's duration scales to the distance left so it never feels sluggish.
- **`photos.js` instead of auto-reading the folder.** A static host can't list a
  directory, so the photo list has to live *somewhere* — a plain JS file you
  edit is the friendliest version of that, and it's also where the notes live.
- **1-up vs 4-up is a live toggle**, not a build choice — the button is in the
  top-right. One big photo per page is calmer; four is better once you have a
  lot of memories.
- **Filename-driven dates.** Your existing `MMDDYY-A` naming *is* the data
  model, so you rarely type a date by hand. If your digits are day-first, set
  `dateFormat: "DDMMYY"` in `photos.js`.

## Tweaks you might want

- Colours / fonts: the `theme` block in `photos.js` — no CSS editing needed.
  For a different font, set `theme.googleFonts` to a
  [fonts.google.com](https://fonts.google.com) css2 query and point
  `headingFont` / `bodyFont` at it.
- Deeper styling: every colour token lives in the `:root` block of `styles.css`;
  `theme` just overrides those at runtime.
- Flip speed: `--flip-time` in `styles.css` **and** `BASE_FLIP` in `script.js`
  (keep them equal).
- Fewer/more drifting marks: `COUNT` in `seedAmbient()` in `script.js`.
- Reduced-motion users automatically get a calmer, near-instant version.
