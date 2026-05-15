PUT YOUR PHOTOS IN THIS FOLDER.

Name each file with the month + day + a letter:

    MM-DDA.jpeg
    │   │ │
    │   │ └─ A, B, C ... lets you have several photos on the SAME day
    │   └─── day        (1–31, zero-padded)
    └─────── month      (1–12, zero-padded)

Examples:
    01-01A.jpeg     -> January 1   (first photo that day)
    08-23A.jpeg     -> August 23   (first photo that day)
    08-23B.jpeg     -> August 23   (second photo that day)
    12-25A.jpeg     -> December 25

(No year is stored in the filename. Captions read "August 23", and photos
are sorted by month then day. If your scrapbook runs anniversary-to-
anniversary instead of Jan–Dec, set `anniversaryMonth` in photos.js so the
order rolls correctly across the boundary.)

.jpeg / .jpg / .png / .webp / .gif / .avif all work natively.
.heic / .heif work too — they're decoded in the browser on the fly. (A tiny
decoder library is fetched the first time an HEIC is shown, then cached.)
Then add a matching line to photos.js.

Cover / back-cover images are the exception: they don't need the date naming.
Just drop e.g. cover.jpeg in here and point coverImage at it in photos.js.

If a file listed in photos.js isn't here yet, the book just draws a soft
placeholder in its place, so you can build the whole thing before the photos
are ready.

(This README.txt is only here so the empty folder gets committed to git.
You can delete it once you've added real photos.)
