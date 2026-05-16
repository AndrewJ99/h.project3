/* =============================================================================
   THREE YEARS — SCRAPBOOK ENGINE
   -----------------------------------------------------------------------------
   No build step, no dependencies. Plain ES5-ish JS so it runs anywhere.

   The model, in one paragraph:
   We turn CONFIG.photos into a flat list of "pages" (cover, dedication, photo
   pages, closing, back cover). Two pages = one physical "leaf" of paper. The
   book shows a two-page spread; `state.flipped` counts how many leaves have
   been turned. Turning a leaf is just toggling a CSS class that rotates it in
   3D — but we also support grabbing a page and dragging it across by hand,
   which means temporarily taking manual control of the transform and then
   handing it back to CSS on release.
   ============================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------------
     0.  Config, constants, tiny helpers
     ------------------------------------------------------------------------- */
  var CONFIG = window.SCRAPBOOK_CONFIG || {};
  var IMG_DIR = "images/";
  var THUMB_DIR = "images/thumbs/";
  var BASE_FLIP = 0.95;            // seconds — must match --flip-time in CSS
  var DRAG_COMMIT = 0.4;           // how far you must drag (0–1) to turn a page
  // Phones run out of texture memory fast, so we keep fewer leaves "live"
  // on small screens. The lightbox still gets the full-size image either way.
  var IS_MOBILE = window.matchMedia
    && window.matchMedia("(max-width: 720px)").matches;
  var WINDOW_SIZE = IS_MOBILE ? 1 : 2;

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };

  // Resolve an image name to a usable src: a bare filename lives in images/;
  // anything with a slash, or a data:/http(s): URL, is used exactly as given.
  function resolveImg(name) {
    if (!name) return "";
    if (/^(https?:|data:)/.test(name) || name.indexOf("/") !== -1) return name;
    return IMG_DIR + name;
  }

  var COVER_IMG = resolveImg(CONFIG.coverImage);
  var BACK_IMG  = resolveImg(CONFIG.backImage);

  var book        = $("book");
  var bookWrap    = $("bookWrap");
  var navPrev     = $("navPrev");
  var navNext     = $("navNext");
  var hintEl      = $("hint");
  var indicator   = $("pageIndicator");
  var brandEl     = $("brand");
  var layoutBtn   = $("layoutToggle");
  var layoutLabel = $("layoutLabel");
  var layoutGlyph = $("layoutGlyph");

  /* ---------------------------------------------------------------------------
     1.  Photos — parse dates from filenames, sort chronologically
     ------------------------------------------------------------------------- */
  // Parse the leading digits of a filename into a Date, using CONFIG.dateFormat.
  //   "MM-DD"   ->  "08-23A.jpeg"   = August 23  (no year in the name)
  //   "DD-YY"   ->  "23-25A.jpeg"   = the 23rd, 2025  (no month in the name)
  //   "MMDDYY"  ->  "052325-A.jpeg" = May 23, 2025
  //   "DDMMYY"  ->  "230525-A.jpeg" = May 23, 2025
  function parseDateFromFile(file) {
    var name = String(file);
    var fmt  = CONFIG.dateFormat || "MMDDYY";
    var dd, mm, yy, m;

    if (fmt === "MM-DD") {
      // no year in the filename -> synthesize one (2000) just so we still
      // have a real Date for sorting; captions show month + day only.
      m = name.match(/^(\d{2})-(\d{2})/);
      if (!m) return null;
      mm = m[1]; dd = m[2]; yy = "00";
    } else if (fmt === "DD-YY") {
      m = name.match(/^(\d{2})-(\d{2})/);
      if (!m) return null;
      dd = m[1]; yy = m[2]; mm = "01";
    } else {
      // legacy 6-digit formats: MMDDYY (default) or DDMMYY
      m = name.match(/(\d{6})/);
      if (!m) return null;
      var s = m[1];
      if (fmt === "DDMMYY") { dd = s.slice(0, 2); mm = s.slice(2, 4); yy = s.slice(4, 6); }
      else                  { mm = s.slice(0, 2); dd = s.slice(2, 4); yy = s.slice(4, 6); }
    }

    var year  = 2000 + parseInt(yy, 10);
    var month = parseInt(mm, 10) - 1;
    var day   = parseInt(dd, 10);

    // For MM-DD, if the scrapbook spans an anniversary (say May→April), set
    // CONFIG.anniversaryMonth = 5. Months before that are shifted into the
    // next synthetic year so chronological sort starts at the anniversary.
    if (fmt === "MM-DD") {
      var anniMonth = parseInt(CONFIG.anniversaryMonth, 10) || 1;
      if (month + 1 < anniMonth) year += 1;
    }

    var d = new Date(year, month, day);
    // reject impossible dates (e.g. month 13 rolling over)
    if (isNaN(d.getTime()) || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
  }

  function fmtLong(d) {
    if (CONFIG.dateFormat === "MM-DD") {
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }
    if (CONFIG.dateFormat === "DD-YY") {
      return d.getDate() + " · " + d.getFullYear();
    }
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function fmtShort(d) {
    if (CONFIG.dateFormat === "MM-DD") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (CONFIG.dateFormat === "DD-YY") {
      return d.getDate() + " · '" + String(d.getFullYear()).slice(-2);
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Normalise CONFIG.photos into rich objects, then sort by date.
  var photos = (CONFIG.photos || []).map(function (p, i) {
    var entry = (typeof p === "string") ? { file: p } : p;
    var date = entry.date ? new Date(entry.date) : parseDateFromFile(entry.file);
    if (date && isNaN(date.getTime())) date = null;
    return {
      file:      entry.file,
      src:       resolveImg(entry.file),
      note:      entry.note || "",
      date:      date,
      longLabel: entry.caption || (date ? fmtLong(date)  : entry.file),
      shortLabel:entry.caption || (date ? fmtShort(date) : entry.file),
      _order:    i
    };
  });
  photos.sort(function (a, b) {
    if (a.date && b.date) return a.date - b.date;
    if (a.date) return -1;
    if (b.date) return 1;
    return a._order - b._order;
  });
  // give every photo its final index (used by the lightbox)
  photos.forEach(function (p, i) { p.index = i; });

  /* ---------------------------------------------------------------------------
     2.  A pretty SVG placeholder for any image that isn't there yet
     ------------------------------------------------------------------------- */
  function placeholder(label) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#dfe4e9"/><stop offset="0.55" stop-color="#c6cfd9"/>' +
      '<stop offset="1" stop-color="#aab7c4"/></linearGradient></defs>' +
      '<rect width="400" height="320" fill="url(#g)"/>' +
      '<text x="200" y="150" font-size="54" text-anchor="middle" fill="#5f6f80" opacity="0.7">&#10086;</text>' +
      '<text x="200" y="195" font-size="17" text-anchor="middle" fill="#5f6f80" ' +
      'font-family="Georgia, serif" opacity="0.85">' + String(label || "add a photo") + '</text>' +
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------------------------
     2b.  HEIC / HEIF support
     -------------------------------------------------------------------------
     Apple's HEIC format isn't rendered natively by Chrome, Firefox, or Edge.
     If we spot one, we fetch the bytes, lazy-load a tiny decoder library, and
     hand the decoded JPEG to the <img> as an object URL. The decoder is only
     loaded if you actually have an HEIC photo — so nothing's downloaded if
     your whole album is .jpg.
     ------------------------------------------------------------------------- */
  var HEIC_RE = /\.hei[cf]$/i;
  function isHeic(name) { return HEIC_RE.test(name || ""); }

  var heicLibPromise = null;
  function ensureHeicLib() {
    if (heicLibPromise) return heicLibPromise;
    heicLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload = function () {
        if (window.heic2any) resolve(window.heic2any);
        else reject(new Error("heic2any did not attach"));
      };
      s.onerror = function () { reject(new Error("heic2any failed to load")); };
      document.head.appendChild(s);
    });
    return heicLibPromise;
  }

  // Returns a Promise<src> with the displayable URL for a photo. JPG/PNG/etc.
  // resolve instantly; HEIC files are fetched + decoded once, then the
  // resulting object URL is cached on the photo so both the page thumbnail and
  // the lightbox reuse it.
  function getDisplaySrc(photo) {
    if (photo._converted)  return Promise.resolve(photo._converted);
    if (photo._converting) return photo._converting;
    if (!isHeic(photo.file)) return Promise.resolve(photo.src);

    photo._converting = fetch(photo.src)
      .then(function (r) {
        if (!r.ok) throw new Error("not found: " + photo.src);
        return r.blob();
      })
      .then(function (blob) {
        return ensureHeicLib().then(function (h) {
          return h({ blob: blob, toType: "image/jpeg", quality: 0.92 });
        });
      })
      .then(function (out) {
        // heic2any returns a Blob, or an Array<Blob> for multi-frame HEICs
        var b = Array.isArray(out) ? out[0] : out;
        photo._converted = URL.createObjectURL(b);
        return photo._converted;
      });
    return photo._converting;
  }

  /* ---------------------------------------------------------------------------
     3.  Build the page list  (changes when the layout toggles)
     ------------------------------------------------------------------------- */
  var layout = (CONFIG.defaultLayout === "quad") ? "quad" : "single";

  // Returns an array of "page descriptors". Each becomes one printed face.
  function buildPages() {
    var perPage = (layout === "quad") ? 4 : 1;
    var pages = [];

    pages.push({ type: "cover" });
    pages.push({ type: "note", variant: "dedication" });

    for (var i = 0; i < photos.length; i += perPage) {
      pages.push({ type: "photos", items: photos.slice(i, i + perPage) });
    }
    if (photos.length === 0) pages.push({ type: "empty" });

    pages.push({ type: "note", variant: "closing" });

    // The back cover must be the very last face, and leaves pair faces 2-by-2,
    // so everything before the back cover has to be an odd count.
    if (pages.length % 2 === 0) pages.push({ type: "blank" });
    pages.push({ type: "back" });

    return pages;
  }

  /* ---------------------------------------------------------------------------
     4.  Render a single page descriptor into a DOM element
     ------------------------------------------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // One photo "polaroid". Clicking it opens the lightbox (handled by delegation).
  function buildPhoto(photo, isQuad) {
    var fig = el("div", "photo");
    fig.setAttribute("data-photo-index", photo.index);

    var wrap = el("div", "photo-img-wrap");
    var img = el("img");
    img.alt = photo.longLabel;
    img.draggable = false;
    img.loading = "lazy";
    // swap to a placeholder if the file is missing — but only once
    // error chain: thumb missing -> try the full-size -> fall back to placeholder
    img.onerror = function () {
      var s = img.src || "";
      if (s.indexOf("/thumbs/") !== -1 && !img.dataset.triedFull) {
        img.dataset.triedFull = "1";
        img.src = photo.src;
        return;
      }
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = placeholder(photo.shortLabel);
    };
    img.decoding = "async";
    img._photo = photo;
    // src is left empty here on purpose — hydrateImg() sets it later, only
    // when this leaf is in the active window. That way far-off pages don't
    // download + decode dozens of multi-megabyte JPEGs up front.
    wrap.appendChild(img);

    var cap = el("div", "photo-caption", isQuad ? photo.shortLabel : photo.longLabel);

    fig.appendChild(wrap);
    fig.appendChild(cap);
    return fig;
  }

  // Lay a dark wash over a supplied cover photo so the title stays readable.
  function applyCoverImage(node, src) {
    if (!src) return;
    node.classList.add("has-image");
    node.style.backgroundImage =
      "linear-gradient(160deg, rgba(18,24,31,0.55), rgba(18,24,31,0.82)), " +
      "url('" + src + "')";
  }

  function buildPageEl(page, pageNumber) {
    var node;

    if (page.type === "cover") {
      node = el("div", "page page--cover");
      applyCoverImage(node, COVER_IMG);
      node.appendChild(el("div", "cover-flourish", "&#10086;"));
      node.appendChild(el("h1", "cover-title", CONFIG.title || "Us"));
      node.appendChild(el("p", "cover-subtitle", CONFIG.subtitle || "Our Story"));
      node.appendChild(el("p", "cover-year", CONFIG.coverYear || ""));
      node.appendChild(el("p", "cover-open-hint", "click to open"));

    } else if (page.type === "back") {
      node = el("div", "page page--back");
      applyCoverImage(node, BACK_IMG);
      node.appendChild(el("div", "cover-flourish", "&#10086;"));
      node.appendChild(el("h2", "cover-title", "to be continued"));
      node.appendChild(el("p", "cover-subtitle", "&#8734;"));

    } else if (page.type === "note") {
      node = el("div", "page page--note");
      node.appendChild(el("div", "note-mark", "&#10086;"));
      var text = page.variant === "closing"
        ? (CONFIG.closing || "Happy anniversary.")
        : (CONFIG.dedication || "Here is the year we just lived.");
      node.appendChild(el("p", "note-body", text));
      node.appendChild(el("p", "note-sign",
        page.variant === "closing" ? "&#8212; andoy" : "&#8212; andoy &#8594;"));

    } else if (page.type === "photos") {
      node = el("div", "page");
      var grid = el("div", "page-grid " + (layout === "quad" ? "is-quad" : "is-single"));
      page.items.forEach(function (photo) {
        grid.appendChild(buildPhoto(photo, layout === "quad"));
      });
      node.appendChild(grid);
      node.appendChild(el("div", "page-number", String(pageNumber)));

    } else if (page.type === "empty") {
      node = el("div", "page page--note");
      node.appendChild(el("div", "note-mark", "&#10086;"));
      node.appendChild(el("p", "note-body",
        "No photos yet. Open <em>photos.js</em> and add a few &#8212; this book " +
        "fills itself in as soon as you do."));

    } else { // blank
      node = el("div", "page");
      node.appendChild(el("div", "page-number", String(pageNumber)));
    }

    return node;
  }

  /* ---------------------------------------------------------------------------
     5.  Build the leaves (sheets of paper) from the page list
     ------------------------------------------------------------------------- */
  var pages = [];
  var leaves = [];          // { el, front, back }  in spine order
  var leafCount = 0;

  function buildBook() {
    // wipe any previously built leaves (keep the decorative edges)
    Array.prototype.slice.call(book.querySelectorAll(".leaf")).forEach(function (n) {
      n.parentNode.removeChild(n);
    });

    pages = buildPages();
    leaves = [];
    leafCount = pages.length / 2;

    var contentNo = 0; // running page number for content pages only

    for (var k = 0; k < leafCount; k++) {
      var leaf = el("div", "leaf");
      leaf.setAttribute("data-leaf", k);

      var frontFace = el("div", "leaf-face leaf-front");
      var backFace  = el("div", "leaf-face leaf-back");

      var frontPage = pages[2 * k];
      var backPage  = pages[2 * k + 1];

      if (frontPage.type === "photos" || frontPage.type === "blank") contentNo++;
      frontFace.appendChild(buildPageEl(frontPage, contentNo));
      if (backPage.type === "photos" || backPage.type === "blank") contentNo++;
      backFace.appendChild(buildPageEl(backPage, contentNo));

      leaf.appendChild(frontFace);
      leaf.appendChild(backFace);

      // hand a leaf back to CSS once its turn animation finishes
      leaf.addEventListener("transitionend", onLeafTransitionEnd);

      var leafObj = { el: leaf, index: k, _settle: null, _settleTimer: null };
      leaf._wrap = leafObj;            // back-reference for the transitionend handler
      leaves.push(leafObj);
      book.appendChild(leaf);
    }
  }

  /* ---------------------------------------------------------------------------
     6.  State + render
     ------------------------------------------------------------------------- */
  var state = { flipped: 0 };     // how many leaves are turned (0 .. leafCount)
  var animatingLeaf = null;       // the leaf currently mid-flip, if any
  var hasInteracted = false;

  // Paint the whole book from `state`. Idempotent — safe to call any time.
  function render() {
    for (var i = 0; i < leaves.length; i++) {
      var lf = leaves[i];
      var isFlipped = i < state.flipped;
      lf.el.classList.toggle("flipped", isFlipped);

      // stacking: flipped leaves stack left, unflipped stack right; the leaf
      // that's actually moving always sits on top of everything.
      var z = isFlipped ? i : (leafCount - i);
      if (lf === animatingLeaf) z = leafCount + 5;
      lf.el.style.zIndex = z;
    }

    book.classList.toggle("book--closed-front", state.flipped === 0);
    book.classList.toggle("book--closed-back",  state.flipped === leafCount);

    navPrev.disabled = state.flipped === 0;
    navNext.disabled = state.flipped === leafCount;

    updateIndicator();
    updateWindow();
  }

  function visiblePhotosOn(pageIndex) {
    var p = pages[pageIndex];
    return (p && p.type === "photos") ? p.items : [];
  }

  function updateIndicator() {
    var txt;
    if (state.flipped === 0) {
      txt = "the cover";
    } else if (state.flipped === leafCount) {
      txt = "the end · ❦";
    } else {
      // gather the photos shown on the current spread
      var shown = visiblePhotosOn(2 * state.flipped - 1)
                    .concat(visiblePhotosOn(2 * state.flipped));
      var dated = shown.filter(function (p) { return p.date; });
      if (dated.length) {
        var first = dated[0], last = dated[dated.length - 1];
        txt = (first === last || first.shortLabel === last.shortLabel)
          ? first.longLabel
          : first.shortLabel + "  —  " + last.shortLabel;
      } else {
        txt = "spread " + state.flipped + " of " + (leafCount - 1);
      }
    }
    indicator.textContent = txt;
  }

  function noteFirstInteraction() {
    if (hasInteracted) return;
    hasInteracted = true;
    if (hintEl) hintEl.style.opacity = "0";
  }

  /* ---------------------------------------------------------------------------
     6b. Hydration window — only the leaves near the current spread are kept
         "live". Far-off leaves are hidden from rendering, and their <img>s
         don't get a `src` until the leaf comes into the window. This keeps
         decoded-image memory bounded and the compositor cheap.
     ------------------------------------------------------------------------- */
  function hydrateImg(img) {
    if (img._hydrated) return;
    var photo = img._photo;
    if (!photo) return;
    img._hydrated = true;

    if (isHeic(photo.file)) {
      // show the soft placeholder while the HEIC decodes in the background
      img.src = placeholder(photo.shortLabel);
      getDisplaySrc(photo).then(function (src) { img.src = src; })
                          .catch(function () { /* placeholder stays */ });
    } else {
      // try the small thumbnail first; img.onerror falls back to the full-size
      // version (and then to a placeholder) if either is missing
      img.src = THUMB_DIR + photo.file;
    }
  }

  function hydrateLeaf(lf) {
    var imgs = lf.el.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; i++) hydrateImg(imgs[i]);
  }

  // Mark every leaf as visible or hidden based on distance from state.flipped.
  // `visibility: hidden` means the browser skips paint/composite for that leaf
  // entirely — the geometry stays in the layout tree so 3D stacking is intact.
  function updateWindow() {
    if (!leaves.length) return;
    for (var i = 0; i < leaves.length; i++) {
      var lf = leaves[i];
      var inWindow = Math.abs(i - state.flipped) <= WINDOW_SIZE;
      lf.el.style.visibility = inWindow ? "" : "hidden";
      if (inWindow) hydrateLeaf(lf);
    }
  }

  /* ---------------------------------------------------------------------------
     7.  Programmatic page turns (arrows + keyboard + cover click)
     ------------------------------------------------------------------------- */
  function turnTo(target) {
    target = clamp(target, 0, leafCount);
    if (target === state.flipped || animatingLeaf || drag.active) return;

    // the leaf that moves is the one between the old and new state
    var movingIndex = (target > state.flipped) ? state.flipped : target;
    var lf = leaves[movingIndex];

    animatingLeaf = lf;
    lf.el.classList.add("turning");
    lf.el.style.transitionDuration = "";   // use the full CSS duration
    state.flipped = target;
    noteFirstInteraction();
    render();                              // toggles .flipped -> CSS animates it
    // fallback in case transitionend never arrives (interrupted/equal values)
    scheduleSettle(lf, BASE_FLIP * 1000 + 150);
  }

  // Reconcile a leaf once its flip is done — called by transitionend OR, as a
  // safety net, by a timer. Guarded so it only ever runs once per turn.
  function settleLeaf(lf) {
    if (animatingLeaf !== lf && !lf._settle) return;   // nothing pending
    if (lf._settleTimer) { clearTimeout(lf._settleTimer); lf._settleTimer = null; }

    lf.el.classList.remove("turning");

    // a hand-dragged turn leaves inline styles behind; clear them and adopt
    // the final state so CSS classes take back control with no visual jump.
    if (lf._settle) {
      var s = lf._settle;
      lf._settle = null;
      lf.el.classList.remove("dragging");
      lf.el.style.transition = "";
      lf.el.style.transitionDuration = "";
      lf.el.style.transform = "";
      lf.el.style.zIndex = "";
      state.flipped = s.finalFlipped;
    }
    if (animatingLeaf === lf) animatingLeaf = null;
    render();
  }

  function scheduleSettle(lf, ms) {
    if (lf._settleTimer) clearTimeout(lf._settleTimer);
    lf._settleTimer = setTimeout(function () { settleLeaf(lf); }, ms);
  }

  function onLeafTransitionEnd(e) {
    if (e.target !== e.currentTarget) return;   // ignore bubbling from .photo etc.
    if (e.propertyName !== "transform") return;
    var lf = e.currentTarget._wrap;
    if (lf) settleLeaf(lf);
  }

  /* ---------------------------------------------------------------------------
     8.  Drag-to-turn  (the part that makes it feel like a real book)
     -------------------------------------------------------------------------
     On pointerdown we figure out whether the grabbed page can turn forward or
     back. While moving we drive the leaf's rotateY by hand (transition off).
     On release we re-enable the transition, fling the leaf to whichever side
     it's closest to, and let onLeafTransitionEnd() reconcile the state.
     ------------------------------------------------------------------------- */
  var drag = {
    active: false, leaf: null, dir: null,
    startX: 0, startY: 0, pageW: 1, progress: 0, moved: false, suppressClick: false
  };

  function leafIndexFromEvent(e) {
    var leafEl = e.target.closest ? e.target.closest(".leaf") : null;
    if (!leafEl) return -1;
    return parseInt(leafEl.getAttribute("data-leaf"), 10);
  }

  function onPointerDown(e) {
    // a fresh press starts a clean slate; any click suppressed from a previous
    // drag has already had its chance to fire by now
    drag.suppressClick = false;
    if (animatingLeaf || drag.active || e.button === 1 || e.button === 2) return;

    var idx = leafIndexFromEvent(e);
    if (idx < 0) return;

    // which way can this page go?
    var dir = null;
    if (idx === state.flipped && state.flipped < leafCount) dir = "fwd";
    else if (idx === state.flipped - 1 && state.flipped > 0) dir = "bwd";
    if (!dir) return;

    drag.active = true;
    drag.leaf = leaves[idx];
    drag.dir = dir;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.pageW = book.offsetWidth / 2 || 1;
    drag.progress = (dir === "fwd") ? 0 : 0;  // 0 = "rest" position for this dir
    drag.moved = false;

    drag.leaf.el.classList.add("dragging");          // kills CSS transition
    drag.leaf.el.style.zIndex = leafCount + 5;
    // a book that's closed should slide open as you pull the page
    book.classList.remove("book--closed-front", "book--closed-back");

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) drag.moved = true;

    var rotation, p;
    if (drag.dir === "fwd") {
      // dragging the right page leftwards: 0deg -> -180deg
      p = clamp(-dx / drag.pageW, 0, 1);
      rotation = -180 * p;
    } else {
      // dragging the left page rightwards: -180deg -> 0deg
      p = clamp(dx / drag.pageW, 0, 1);
      rotation = -180 + 180 * p;
    }
    drag.progress = p;
    drag.leaf.el.style.transform = "rotateY(" + rotation + "deg)";
  }

  function onPointerUp() {
    if (!drag.active) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    var lf = drag.leaf;
    drag.active = false;
    drag.leaf = null;

    // A tap, not a drag: undo the drag setup and let onBookClick do its job
    // (open the cover, pop a photo into the lightbox, etc.).
    if (!drag.moved) {
      lf.el.classList.remove("dragging");
      lf.el.style.transform = "";
      lf.el.style.zIndex = "";
      lf.el.style.transitionDuration = "";
      render();                       // restores the closed-book offset
      return;
    }

    var commit = drag.progress > DRAG_COMMIT;
    var finalRotation, finalFlipped, remaining;

    if (drag.dir === "fwd") {
      if (commit) { finalRotation = -180; finalFlipped = lf.index + 1; remaining = 1 - drag.progress; }
      else        { finalRotation = 0;    finalFlipped = lf.index;     remaining = drag.progress; }
    } else {
      if (commit) { finalRotation = 0;    finalFlipped = lf.index;     remaining = 1 - drag.progress; }
      else        { finalRotation = -180; finalFlipped = lf.index + 1; remaining = drag.progress; }
    }

    // re-enable the transition, but scale its length to the distance left to go
    var dur = Math.max(0.28, remaining * BASE_FLIP);
    lf.el.classList.remove("dragging");
    lf.el.style.transitionDuration = dur.toFixed(2) + "s";
    lf.el.classList.add("turning");

    // slide the book to its resting offset in sync with the page
    book.classList.toggle("book--closed-front", finalFlipped === 0);
    book.classList.toggle("book--closed-back",  finalFlipped === leafCount);

    // stash what settleLeaf() should reconcile, then kick off the animation
    lf._settle = { finalFlipped: finalFlipped };
    animatingLeaf = lf;
    /* eslint-disable no-unused-expressions */
    lf.el.offsetWidth;                // force reflow -> animate from dragged angle
    lf.el.style.transform = "rotateY(" + finalRotation + "deg)";

    // safety net: if the target equals the current angle, transitionend won't fire
    scheduleSettle(lf, dur * 1000 + 150);

    drag.suppressClick = true;
    noteFirstInteraction();
  }

  /* ---------------------------------------------------------------------------
     9.  Clicks: open the cover, or pop a photo into the lightbox
     ------------------------------------------------------------------------- */
  function onBookClick(e) {
    if (drag.suppressClick) { drag.suppressClick = false; return; }

    var photoEl = e.target.closest ? e.target.closest(".photo") : null;
    if (photoEl) {
      openLightbox(parseInt(photoEl.getAttribute("data-photo-index"), 10));
      return;
    }
    if (e.target.closest && e.target.closest(".page--cover")) { turnTo(state.flipped + 1); return; }
    if (e.target.closest && e.target.closest(".page--back"))  { turnTo(state.flipped - 1); return; }
  }

  /* ---------------------------------------------------------------------------
     10.  Lightbox — the pop-out photo + handwritten note
     ------------------------------------------------------------------------- */
  var lb        = $("lightbox");
  var lbImg     = $("lightboxImg");
  var lbDate    = $("lightboxDate");
  var lbText    = $("lightboxText");
  var lbCount   = $("lightboxCount");
  var lbIndex   = -1;
  var lbCloseTimer = null;

  function fillLightbox(i) {
    var p = photos[i];
    if (!p) return;
    lbIndex = i;

    lbImg.dataset.fallback = "";
    lbImg.style.opacity = "0";
    lbImg.onerror = function () {
      if (lbImg.dataset.fallback) return;
      lbImg.dataset.fallback = "1";
      lbImg.src = placeholder(p.shortLabel);
    };
    lbImg.onload = function () { lbImg.style.opacity = "1"; };
    lbImg.alt = p.longLabel;
    if (isHeic(p.file)) {
      lbImg.src = placeholder(p.shortLabel);
      getDisplaySrc(p).then(function (src) { lbImg.src = src; })
                      .catch(function () { /* placeholder stays */ });
    } else {
      lbImg.src = p.src;
    }

    lbDate.textContent  = p.date ? p.longLabel : (p.longLabel || "Undated");
    lbText.textContent  = p.note || "";
    lbCount.textContent = "photo " + (i + 1) + " of " + photos.length;
  }

  function openLightbox(i) {
    if (lbCloseTimer) { clearTimeout(lbCloseTimer); lbCloseTimer = null; }
    fillLightbox(i);
    lb.hidden = false;
    // next frame -> add the class so the entrance transition actually runs
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lb.classList.add("is-open"); });
    });
    noteFirstInteraction();
  }

  function closeLightbox() {
    lb.classList.remove("is-open");
    lbCloseTimer = setTimeout(function () { lb.hidden = true; lbCloseTimer = null; }, 420);
  }

  function stepLightbox(delta) {
    if (lbIndex < 0 || photos.length === 0) return;
    var n = (lbIndex + delta + photos.length) % photos.length;
    fillLightbox(n);
  }

  /* ---------------------------------------------------------------------------
     11.  Layout toggle (1 big photo  <->  4 per page)
     ------------------------------------------------------------------------- */
  function syncLayoutButton() {
    // the button advertises what you'll switch TO
    if (layout === "single") {
      layoutLabel.textContent = "4 per page";
      layoutGlyph.textContent = "▦";
    } else {
      layoutLabel.textContent = "1 per page";
      layoutGlyph.textContent = "□";
    }
  }

  function toggleLayout() {
    if (animatingLeaf || drag.active) return;

    // Page-index doesn't translate between the two layouts — quad has roughly
    // a quarter as many leaves. So instead of preserving state.flipped, we
    // anchor on a photo from the current spread and look it up after rebuild.
    var wasAtStart  = state.flipped === 0;
    var wasAtEnd    = state.flipped === leafCount;
    var anchorFile  = null;
    if (!wasAtStart && !wasAtEnd) {
      var shown = visiblePhotosOn(2 * state.flipped - 1)
                    .concat(visiblePhotosOn(2 * state.flipped));
      if (shown.length) anchorFile = shown[0].file;
    }

    layout = (layout === "single") ? "quad" : "single";
    syncLayoutButton();
    buildBook();

    // Decide where to land in the new layout.
    var target = 0;
    if (wasAtEnd) {
      target = leafCount;
    } else if (anchorFile) {
      for (var p = 0; p < pages.length; p++) {
        var pg = pages[p];
        if (pg.type !== "photos") continue;
        var hit = false;
        for (var k = 0; k < pg.items.length; k++) {
          if (pg.items[k].file === anchorFile) { hit = true; break; }
        }
        if (hit) {
          // page index p sits on leaf floor((p+1)/2) when made the visible spread
          target = Math.floor((p + 1) / 2);
          break;
        }
      }
    }
    state.flipped = clamp(target, 0, leafCount);
    animatingLeaf = null;

    // apply the new state instantly — we don't want every prior leaf to
    // visibly flip itself when the book is rebuilt under us
    book.classList.add("book--rebuilding");
    render();
    book.offsetWidth;                            // force reflow
    book.classList.remove("book--rebuilding");
  }

  /* ---------------------------------------------------------------------------
     12.  Ambient drifting hearts in the white space
     ------------------------------------------------------------------------- */
  function seedAmbient() {
    var host = $("ambient");
    if (!host) return;
    var COUNT = 14;
    for (var i = 0; i < COUNT; i++) {
      var h = el("span", "heart", "❦");
      h.style.left = (Math.random() * 100).toFixed(2) + "%";
      var dur = 16 + Math.random() * 16;
      h.style.animationDuration = dur.toFixed(1) + "s";
      h.style.animationDelay = (-Math.random() * dur).toFixed(1) + "s";
      h.style.fontSize = (0.7 + Math.random() * 1.4).toFixed(2) + "rem";
      host.appendChild(h);
    }
  }

  /* ---------------------------------------------------------------------------
     13.  Theme — fold the optional `theme` block from photos.js over the CSS
     ------------------------------------------------------------------------- */
  function applyTheme() {
    var t = CONFIG.theme || {};
    var root = document.documentElement;
    var vars = {
      accent: "--accent", accentDeep: "--accent-deep",
      ink: "--ink", inkSoft: "--ink-soft",
      paper: "--paper", paperEdge: "--paper-edge", paperShade: "--paper-shade",
      coverFrom: "--cover-from", coverTo: "--cover-to",
      heart: "--heart",
      headingFont: "--font-heading", bodyFont: "--font-body"
    };
    Object.keys(vars).forEach(function (key) {
      if (t[key]) root.style.setProperty(vars[key], t[key]);
    });
    // pull in a custom Google Fonts family set, if one was named
    if (t.googleFonts) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=" + t.googleFonts + "&display=swap";
      document.head.appendChild(link);
    }
  }

  /* ---------------------------------------------------------------------------
     14.  Wire everything up
     ------------------------------------------------------------------------- */
  function init() {
    applyTheme();

    if (brandEl) brandEl.textContent = (CONFIG.title || "Our") + " · " + (CONFIG.subtitle || "Scrapbook");
    document.title = (CONFIG.title || "Our Scrapbook") + " · " + (CONFIG.subtitle || "");

    syncLayoutButton();
    seedAmbient();
    buildBook();
    render();

    // navigation
    navPrev.addEventListener("click", function () { turnTo(state.flipped - 1); });
    navNext.addEventListener("click", function () { turnTo(state.flipped + 1); });
    layoutBtn.addEventListener("click", toggleLayout);

    // dragging + clicking happen on the book
    book.addEventListener("pointerdown", onPointerDown);
    book.addEventListener("click", onBookClick);
    // never let the browser's native image drag hijack a page drag
    book.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // lightbox
    $("lightboxClose").addEventListener("click", closeLightbox);
    $("lightboxBackdrop").addEventListener("click", closeLightbox);
    $("lbPrev").addEventListener("click", function () { stepLightbox(-1); });
    $("lbNext").addEventListener("click", function () { stepLightbox(1); });

    // keyboard
    window.addEventListener("keydown", function (e) {
      var lbOpen = !lb.hidden;
      if (e.key === "Escape" && lbOpen) { closeLightbox(); return; }
      if (lbOpen) {
        if (e.key === "ArrowLeft")  stepLightbox(-1);
        if (e.key === "ArrowRight") stepLightbox(1);
        return;
      }
      if (e.key === "ArrowLeft")  turnTo(state.flipped - 1);
      if (e.key === "ArrowRight") turnTo(state.flipped + 1);
    });

    // the page size is viewport-derived; keep the drag math honest on resize
    window.addEventListener("resize", function () {
      if (drag.active) drag.pageW = book.offsetWidth / 2 || 1;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
