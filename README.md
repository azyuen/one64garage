# one64garage

A personal automotive journal that links your 1:64 diecast collection with your
Gran Turismo driving experience. No accounts, no backend, no subscriptions —
everything lives in your browser or in one JSON file you control.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## How data is stored

There are two layers, on purpose:

1. **`src/data/cars.json`** — the reference car database (make, model, specs,
   history). This is meant to be edited by hand, like a spreadsheet, and
   committed to your repo. Copy the shape of an existing entry to add a new
   car, or use the in-app "Add Car" screen, which writes to layer 2 instead.
2. **Browser `localStorage`** — everything personal: your diecast records,
   GT journal entries, driver development notes, "Take this car out"
   sessions, your theme preference, and any cars added through the UI. This
   never leaves your device and isn't sent anywhere.

Because personal data lives in `localStorage`, it's tied to one browser on
one device. If you want a backup, open the browser console and run:

```js
copy(JSON.stringify(await import('./src/lib/storage.js').then(m => m.exportAllData())))
```

(or wire up a simple export/import button later — the `exportAllData` /
`importAllData` functions in `src/lib/storage.js` are already there for it.)

## Adding cars to the reference database

Open `src/data/cars.json` and add an entry following the existing shape:

```json
{
  "id": "unique-slug-id",
  "make": "Toyota",
  "model": "AE86",
  "variant": "GT-APEX",
  "year": 1985,
  "generation": "AE86",
  "bodyType": "3-door hatchback",
  "countryOfOrigin": "Japan",
  "heroImage": "",
  "tech": {
    "engine": "4A-GEU",
    "configuration": "Inline-4, DOHC 16v",
    "displacement": "1587 cc",
    "horsepower": "130 PS",
    "torque": "149 Nm",
    "weight": "955 kg",
    "drivetrain": "FR",
    "transmission": "5-speed manual"
  },
  "history": {
    "whyItMatters": "…"
  }
}
```

`id` must be unique. Your diecast/GT/driver-development records are keyed to
it, so avoid renaming an `id` once you've started journaling against it.

## Bulk importing cars

On the **Add Car** page there's a "Bulk Import from JSON" panel. Upload a
JSON file containing either:

- A plain array of car objects (same shape as the entries in
  `src/data/cars.json`), or
- An object with a `"cars"` array in that shape.

Each entry needs at least `make` and `model`. An `id` is generated from
make/model/variant/year if you don't supply one, and duplicates against
your existing garage get a `-2`, `-3`, etc. suffix automatically. Imported
cars are saved the same way as ones added through the form — as custom
cars in `localStorage` — so this is the fastest way to seed a large
collection without filling out the form 100 times.

## Backing up your data

Since diecast records, GT journal entries, driver development notes, and
your cars themselves all live in this browser's `localStorage`, the
**Journal** tab has an export/restore section:

- **Export backup** downloads everything as one JSON file — cars, records,
  sessions, and your display/theme preferences.
- **Restore from backup** does a complete, literal restore: the app ends up
  exactly matching the backup file, not merged with whatever was already
  there. It asks for confirmation first since it replaces everything, and
  reloads the page afterward so every part of the app (including theme)
  picks up the restored state cleanly.

Export a backup occasionally, or before switching devices — there's no
server copy of any of this.

## Take This Car Out

Car selection is now two steps — pick a Make, then a Model — so it scales
better as the garage grows past a handful of cars. The reflection field is
framed as "What I Learned": go drive in Gran Turismo first, then come back
and log impressions, setup notes, or anything memorable. It's a driving
journal, not a pre-drive planning checklist.

## Vehicle data lookup

`src/lib/vehicleLookup.js` searches Wikidata first (structured facts:
manufacturer, country of origin, production years) and pulls technical specs
from a matched Wikipedia article's infobox, parsed as real HTML rather than
wikitext. If Wikidata can't find a confident match, a "Try Wikipedia search
instead" fallback runs a plain Wikipedia text search, which is more
forgiving of loose or partial names. Every field is reviewed and explicitly
approved before it touches your form — nothing is ever auto-applied over
existing data.

Note on data sources: an earlier request asked for
[ilyasozkurt/automobile-models-and-specs](https://github.com/ilyasozkurt/automobile-models-and-specs)
as the primary source. That dataset is real, but it's only distributed as
zip files intended for server-side database import — there's no hosted
endpoint a browser can query, and it's too large to bundle into a
backend-less, lightweight app. Wikidata + Wikipedia are the closest
genuinely-live, CORS-friendly, structured equivalent.

## GT7 exact vehicle name matching

On the GT Journal tab, if "Game" is set to Gran Turismo 7, an in-game model
field gets a "Find exact GT7 name" button. This queries the
[ddm999/gt7info](https://github.com/ddm999/gt7info) car list — a
community-maintained, actively-updated CSV published on GitHub Pages, also
relied on by several third-party GT7 tools — and ranks matches by
make/model/year similarity.

This only covers GT7. There's no equivalent live, structured, CORS-friendly
source for GT5/GT6/Sport, so matching for those games is still manual entry
— it would be dishonest to fabricate a database for something that doesn't
verifiably exist.

## Drive Console (Drive Mode)

**iPad-exclusive.** Drive Console is meant to be a dedicated dashboard
display mounted beside a sim racing setup, not a phone feature — it's
gated entirely to iPad. There's no formal "is this an iPad" browser API
(iPadOS 13+ deliberately reports its user agent as "Macintosh" for site
compatibility), so detection combines the legacy `iPad` user-agent check
with the standard workaround for modern iPadOS: a "Mac" platform that also
reports multi-touch support. On any other device — iPhone included — the
Drive Mode button and auto-activation are hidden entirely; there's no
disabled/greyed-out version to stumble into.

On a landscape iPad, selecting a car on the **Take Out** page automatically
switches into the console. Visually, it's a **fixed image skin with real
UI positioned underneath it** — `src/assets/drive-mode-skin.webp` is a
photographic OEM dashboard mockup treated as the permanent shell; none of
it is drawn in CSS. Every content position (header, three gauges, LCD,
button windows) was measured programmatically from the image's actual
transparent cutouts rather than eyeballed, then expressed as percentages
of the image's own dimensions so it stays aligned at any render size.

**How the skin works:** the source PNG doesn't have real transparency — it
uses a checkerboard pattern as a placeholder for "make this transparent,"
which gets converted into an actual alpha channel (bright, low-saturation
pixels → transparent; everything else stays opaque) before it can work as
an overlay. "ONE64 GARAGE," "DRIVE," "NOTES," and the button icons are
fixed baked-in art; only the genuinely transparent regions (header text
area, three gauges, the LCD, and two small active-state indicator pills)
carry real app content.

**Vehicle header**: make/model/variant/year, right-aligned, and it
literally shrinks to fit — a script measures the rendered text against the
available width and reduces the font size until it stops overflowing, so
"Mazda MX-5" and "Mitsubishi Lancer Evolution VI Tommi Mäkinen Edition"
both render cleanly without hardcoding different cases.

**Three gauges**: a manual Drive Timer (tap Start/Stop, double-tap to
reset — it isn't trying to detect actual Gran Turismo play time, since a
web page can't see what's happening in another app), Garage Rating as
stars, and horsepower + drivetrain. Only the *values* render — the dial
labels are baked into the image.

**The LCD** is deliberately larger than the first version and shows more
at once: driving tips, your last session note, and the car's historical
notes on the Drive screen; a note-entry field plus full session history on
the Notes screen. Text sizes scale with `clamp()` against the viewport and
lean toward "readable from arm's length at a sim rig," not desktop-density
text.

**Physical controls** (left to right): **Illumination** cycles Day / Dusk
/ Night, shifting the glow color and brightness of every readout. **Drive**
and **Notes** switch the LCD's two screens — their small active-state
indicator dots are the two genuinely transparent pill cutouts in the skin,
not a redrawn UI. **Select** pages through the current screen's content
when it's longer than the visible area, wrapping back to the top at the
end — a physical-feeling alternative to a scrollbar. A small **Return**
button integrated into the header takes you back to the main app.

A couple of practical notes:

- There's no web API for detecting "device unlocked," so auto-activation
  is landscape orientation on a detected iPad. A manual "Drive Mode" button
  is available on iPad in any orientation, with a hint to rotate if it's
  not landscape yet.
- Car selection happens on the normal Take Out page before entering Drive
  Console, not inside it — matching the workflow (select car → enter
  console → drive → return → log a note) and keeping the unit uncluttered.
- Rotating back to portrait exits Drive Console automatically.

## Adding to your iOS home screen

The app is set up to install like a native app icon:

1. Deploy it (see below), then open the live site in **Safari** on
   your iPhone or iPad — make sure you're on the Garage home page.
2. Tap the **Share** icon → **Add to Home Screen**.
3. It'll use the one64garage icon and open full-screen with no Safari
   address bar when launched from the home screen.

The icons live in `public/icons/` (generated from the garage-shutter artwork)
and are wired up in `index.html` and `public/manifest.webmanifest`. If you
ever want to swap the icon, replace the files in `public/icons/` — keep the
same filenames and square dimensions and nothing else needs to change.

## Deploying to Netlify

1. Push this project to a GitHub/GitLab/Bitbucket repo (or drag-and-drop the
   built `dist/` folder into Netlify's dashboard for a quick one-off deploy).
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build`. Publish directory: `dist`.
   (Already configured in `netlify.toml`.)
4. Deploy. That's it — no environment variables, no database, no functions.

The app uses hash-based routing (`/#/car/...`), so it works correctly on
Netlify's static hosting with no redirect rules required.

## Project structure

```
src/
  data/cars.json        reference car database (edit by hand)
  lib/storage.js         localStorage read/write helpers
  lib/useCars.js          merges cars.json + custom cars + records
  lib/vehicleLookup.js      Wikidata search/matching + Wikipedia infobox parsing
  components/             CarCard, CompletionRing, PhotoUpload, StarRating, VehicleLookup, Nav, ThemeToggle
  pages/
    Garage.jsx            home — visual grid, sort/filter, grid density
    CarDetail.jsx          spec sheet + diecast + GT journal (with notes timeline)
    CarForm.jsx             add / edit a car (with structured vehicle lookup)
    TakeOut.jsx              "take this car out" session picker + random suggestion
    Journal.jsx              collection stats, drives per month, activity feed
```

## Notes on photos

Diecast photos are downscaled client-side and stored as data URLs in
`localStorage`, since there's no backend to upload to. `localStorage` has a
small quota (typically 5–10MB per origin), which is enough for dozens of
compressed photos but not hundreds. If you outgrow it, the natural next step
is swapping the photo field for a hosted-image URL instead of a data URL.
