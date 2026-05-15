/* =============================================================================
   YOUR SCRAPBOOK — EDIT THIS FILE
   =============================================================================
   This is the ONLY file you need to touch. Three sections: words, look, photos.

   ADDING PHOTOS
   -------------
   1. Drop image files into the  images/  folder.
   2. Name each file with the month + day it was taken, plus a letter:
            MM-DDA.jpeg   ->  August 23  (first photo that day)
            MM-DDB.jpeg   ->  August 23  (second photo that SAME day)
      The trailing letter A–Z just lets you have several photos on one day.
      (No year is stored — captions read e.g. "August 23", and photos sort by
      month then day. If your scrapbook spans an anniversary, see
      `anniversaryMonth` below.)
   3. Add an entry to the `photos` array below. Only `file` is required;
      `note` is the little message shown in the pop-out view.

   The date under each photo is read from the filename automatically. To pin
   a specific photo to a real calendar date, add a `date: "2025-08-23"` field
   to its entry — that overrides the filename for that one.
============================================================================= */

window.SCRAPBOOK_CONFIG = {
  /* ---- THE WORDS -----------------------------------------------------------
     All the text on the cover and the two message pages. */
  title:     "Happy Anniversary!",
  subtitle:  "Years 2-3",
  coverYear: "a year of us! 🗣️",

  // Shown on the first inside page, right after the cover.
  dedication:
    "One year. A thousand small, ordinary days — and every single one better " +
    "because you were in it. This is the whole of our second year together, " +
    "start to finish. Turn the page, love.",

  // Shown on the final inside page, right before the back cover.
  closing:
    "Two years behind us, and the third already begun. Whatever this next " +
    "year holds, I want to spend it the same way: with you, a camera, and a " +
    "reason to make one of these again. Happy anniversary.",

  /* ---- THE LOOK ------------------------------------------------------------
     A photo behind the cover (and back cover) — optional. Put the file in
     images/ and name it here, or use a path / URL. A dark wash is laid over
     it automatically so the title stays readable. Leave "" for a plain cover. */
  coverImage: "",          // e.g. "cover.jpeg"
  backImage:  "",          // e.g. "back.jpeg"

  // "single" = one big photo per page.  "quad" = four photos per page.
  // (There's also a live toggle button in the top-right corner.)
  defaultLayout: "single",

  // How the digits in your filenames are arranged.
  //   "MM-DD"   ->  08-23A.jpeg   = August 23              (current)
  //   "DD-YY"   ->  23-25A.jpeg   = day 23, 2025
  //   "MMDDYY"  ->  052325-A.jpeg = May 23, 2025
  //   "DDMMYY"  ->  230525-A.jpeg = May 23, 2025
  dateFormat: "MM-DD",

  // Optional: if your scrapbook runs from anniversary to anniversary instead
  // of January to December, set this to the anniversary month (1=Jan … 12=Dec)
  // so photos sort in the right order. E.g. 5 makes the book start in May
  // and roll Jun → Dec → Jan → Apr. Default 1 = naive Jan-Dec sort.
  anniversaryMonth: 5,

  // Colours + fonts. Everything here is optional — delete a line to fall back
  // to the built-in sleek blue-grey theme.
  theme: {
    accent:    "#6f8ca8",   // rules, small flourishes, links
    accentDeep:"#4f6d8c",   // a darker accent for signatures
    ink:       "#2b333d",   // main text colour
    inkSoft:   "#6b7785",   // captions, hints, page numbers
    paper:     "#e9edf1",   // the page colour
    coverFrom: "#3f4f60",   // cover gradient — top
    coverTo:   "#252e38",   // cover gradient — bottom
    heart:     "#9fb2c4",   // the drifting marks in the background

    headingFont: "'Fraunces', Georgia, serif",
    bodyFont:    "'Cormorant Garamond', Georgia, serif",
    // To use different fonts, set googleFonts to a fonts.google.com css2 query
    // (everything after "family=") and point the two fonts above at it, e.g.:
    // googleFonts: "Marcellus&family=Cormorant+Garamond:wght@400;500;600",
  },

  /* ---- THE PHOTOS ----------------------------------------------------------
     Replace these samples with your own. If an image file isn't there yet the
     page draws a soft placeholder, so the whole book works before you've added
     a single photo. */
  photos: [
    // ---- May ----
    { file: "05-18A.JPG", note: "" },
    { file: "05-19A.JPG", note: "" },
    // ---- July ----
    { file: "07-27A.JPG", note: "" },
    // ---- August ----
    { file: "08-02A.JPG", note: "" },
    { file: "08-02B.JPG", note: "" },
    { file: "08-10A.HEIC", note: "" },
    { file: "08-13A.HEIC", note: "" },
    { file: "08-22A.JPG", note: "" },
    { file: "08-23A.JPG", note: "" },   // there's also an 08-23A.HEIC — JPG preferred
    { file: "08-23B.JPG", note: "" },
    { file: "08-23C.JPG", note: "" },
    { file: "08-23D.JPG", note: "" },
    { file: "08-23F.JPG", note: "" },
    { file: "08-23G.JPG", note: "" },
    // ---- September ----
    { file: "09-26A.JPG", note: "" },
    // ---- November ----
    { file: "11-01A.HEIC", note: "" },
    { file: "11-09A.JPG", note: "" },
    // ---- December ----
    { file: "12-07A.JPG", note: "" },
    { file: "12-24A.JPG", note: "" },   // there's also a 12-24A.HEIC — JPG preferred
    // ---- January (next calendar year) ----
    { file: "01-01A.JPG", note: "" },
    // ---- February ----
    { file: "02-14A.JPG", note: "" },
    { file: "02-14B.JPG", note: "" },
    { file: "02-14C.JPG", note: "" },
    { file: "02-15A.JPG", note: "" },
    { file: "02-26A.JPG", note: "" },
    { file: "02-28A.JPG", note: "" },
    { file: "02-28B.JPG", note: "" },
    { file: "02-28C.JPG", note: "" },
    { file: "02-28D.JPG", note: "" },
    // ---- March ----
    { file: "03-15A.JPG", note: "" },
    { file: "03-15B.JPG", note: "" },
    { file: "03-15C.JPG", note: "" },
    { file: "03-15D.JPG", note: "" },
    { file: "03-15E.JPG", note: "" },
    { file: "03-15G.JPG", note: "" },
    { file: "03-15H.JPG", note: "" },
    { file: "03-15I.JPG", note: "" },
    // ---- April ----
    { file: "04-02A.JPG", note: "" },
  ],
};
