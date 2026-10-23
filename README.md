# Spanish Mum in Paris · Studio

A local web app to make on-brand visuals for LinkedIn, Instagram and Facebook (carousels, posts, stories), A4 PDF documents (guides, client documents, offer sheets, corporate proposals) and 16:9 presentations exported as PowerPoint, in the brand's fonts, colours and voice, with a library of everything made and a record of what each image or text request cost.

**How it works:** Rebeca writes a prompt ("un carrousel LinkedIn pour les RH sur la charge mentale, avec ces deux chiffres…"), optionally lets Claude improve it, and clicks *Create the visual*. Claude (with the brand guidelines and Rebeca's voice) picks the format and the templates, writes every slide and the caption, and describes the photos; Flux 2 on Replicate generates those photos, which drop into their slides; the studio sets all the text in Fraunces and Albert Sans. She then refines it by asking for changes in plain words, or edits any field by hand, and exports. Text is never drawn by an image model (brand guidelines, p. 24).

## First setup

Needs [Node.js](https://nodejs.org) 22 or later and Google Chrome (used to render the exports).

```sh
npm install
cp .env.example .env      # then paste the two keys into .env
npm run seed              # optional: imports Rebeca's photos, the AI images and the « enjeu RH » carousel from ../spanishmuminparis
```

`.env` must contain one key per line, not commented out:

```sh
ANTHROPIC_API_KEY=sk-ant-…
REPLICATE_API_TOKEN=r8_…
```

## Running it

- **Every day:** double-click `Studio.command` in Finder. It builds the app the first time (and after any code update), then opens <http://localhost:4747>. Keep the Terminal window open while working; close it to stop.
- **While developing:** `npm run dev`, same address.

The studio always uses port **4747**, so it never clashes with the website (Astro, 4321) or other apps. To change it, edit `dev` and `start` in `package.json` and `PORT` in `Studio.command`.

## What's inside

| Screen | What it does |
|---|---|
| **Create** (home) | The prompt box. *Improve my prompt* (Claude rewrites it into a complete brief, with undo), format, universe, photos (auto, her photos, generated, none), number of slides, **language of the texts** (French, or English: Claude then writes every slide, the caption and the speaker notes in English, whatever language the prompt is in, with English typography and labels), examples, recent prompts to reuse |
| Library | Every asset with a live preview, filters by platform, universe and status, search, duplicate, delete |
| **From a template** | The manual way: pick one of sixteen formats and a starting structure, then write every text yourself |
| Documents | Four A4 formats, in portrait or landscape, exported as real PDFs (selectable text, embedded fonts, clickable links): **Guide** (lead magnet), **Client document** (moodboard, shopping list, Home Routine planning), **Offer sheet**, **Corporate proposal**. Page templates after section 08 of the guidelines: cover, text page (subheadings, lists), photo page, checklist, table, three key figures, offer, moodboard (up to six photos, palette, materials), closing page with contacts and the « Rebeca » signature; running footer and page numbers. In landscape the same pages put the photo, the moodboard gallery or the offer's list beside the text, and text pages run in two columns; switch at any time in the editor (Portrait / Landscape under the page) or ask for « en paysage » in the prompt |
| Presentations | Two 16:9 formats (1920 × 1080): **Corporate deck** (a workshop proposal, the Home & Life Balance workshop itself, a talk) and **Client presentation** (a project: intention, moodboard, pieces, next steps). The document pages drawn twice as large, plus a **Section** divider and an **Agenda**. Every slide has **speaker notes**, written by Claude with the slides and editable under the fields; the brand check uses shorter limits on slides. **New presentation** (library and home page) opens a blank deck straight away, no prompt. On any template slide, in any format, **click a text to change it on the slide itself**: a text box opens in its place, in the same type. Any deck slide can also be a **free canvas**: a blank slide, a template slide **unlocked** into blocks (it keeps its look), or a template slide you add a block to (which unlocks it). Blocks are texts in the brand's type presets, photos, tinted boxes, hairlines and tables; drag to move, pull the corners to resize, double-click a text to type on the slide, with snapping guides, arrow-key nudging, duplicate, copy and paste, ordering and ⌘Z undo. Claude leaves free slides exactly as they are when asked for changes. Exported as **PowerPoint** (one picture per slide with the notes, so it looks exactly like the preview in PowerPoint, Keynote and Google Slides), PDF, or PNGs |
| Editor | A prompt bar under the preview: *ask for a change* (« raccourcis ce slide », « ajoute un slide… », « une autre photo ») and see before/after before applying, or *regenerate from the prompt*. Slides on the left (← → or Page ↑ ↓ move between them, Home / End go to the first and last), live preview in the middle, fields on the right. Eight templates (Title, Key figure, Point, List, Quote, Photo + title, Full photo + text, Closing), four grounds, automatic French typography (or English, when the visual's language is switched to English in the panel on the right; the brand check and Claude follow it), type that shrinks to fit. **Undo / Redo** (⌘Z, ⇧⌘Z) over every change and **Save** (⌘S, changes also save by themselves), slides deleted without a dialog and brought back by Undo. Brand check, **Improve with Claude** (each change shown before/after, kept only if ticked), **Review** by Claude, caption drafting, history of versions, export to PDF (LinkedIn carousels), PNG or ZIP, published status and link |
| Photos on slides | **Photo + title** fills the top of the slide with the photo and crops it to that frame (focal point and zoom in the inspector). **Full photo + text** shows the photo whole, never cropped: a wide photo fills the width and the text starts right under it; a taller one is shown smaller inside the margins, the ground around it, so the text keeps its room. Switch between the two with *Framing* under the photo, or ask for « la photo entière » / « sans couper la photo » in the prompt: Claude then picks Full photo + text |
| Images | Real photos first, then AI images (tagged). Upload (HEIC works), generate with brand scene presets or her own words, optional prompt written by Claude, cost shown before generating, sharpen ×2 with Topaz |
| Costs | This month, budget, six-month history, by service, by task, by asset, every request with its usage and cost, editable prices |
| Settings | Key status, default image model, default sharpening |

## Where the brand lives

All taken from the brand guidelines (v1.0, October 2026, in the website repo at `design/brand/`).

| What | File |
|---|---|
| Colours, grounds, universe tints | `src/lib/brand/tokens.ts` |
| Formats (sizes, platforms) | `src/lib/brand/formats.ts` |
| Templates: fields, limits, starters | `src/lib/brand/layouts.ts` |
| Templates: the look | `src/components/slides/slides.css`, `SlideView.tsx`; document pages and presentation slides `docs.css`, `DocPage.tsx` |
| French typography and `*italic*` markup | `src/lib/brand/typography.ts` |
| Brand check rules | `src/lib/brand/lint.ts` |
| Rebeca's voice, as sent to Claude | `src/lib/brand/voice.ts` |
| From a prompt to a visual (the guide Claude follows, built from the formats and templates) | `src/lib/ai/compose.ts` |
| Photo direction and scene presets | `src/lib/brand/image-presets.ts` |
| Fonts and logos | `public/brand/` (copied from the website repo) |

The editor preview and the exports use the same component: the export opens `/render/<id>` in headless Chrome and captures it at 2× before scaling down, like the website's `render.sh` scripts. The PowerPoint export puts those captures on the slides of a `.pptx` (pptxgenjs) with the speaker notes.

## Data

Everything is in `data/` (git-ignored): `studio.db` (SQLite: assets, versions, images, jobs, costs, settings), `media/` (images), `exports/` (PNG, PDF, ZIP) and `cache/` (preview sizes). Back it up by copying the folder, or set `SMP_DATA_DIR` in `.env` to keep it elsewhere (a synced folder, for instance).

## Costs

Costs are estimated from what each request used (megapixels for images, tokens for Claude) and the price table on the Costs page, which starts with the prices published in October 2026: Flux 2 Max about $0.10 per 2-megapixel image, Topaz $0.05 per image, Claude Opus 5.5 about $0.02 per text request. Invoices remain on Replicate and in the Anthropic Console.

## Scripts

```sh
npm run dev          # development server on http://localhost:4747
npm run build        # production build (Studio.command does it for you)
npm start            # production server on http://localhost:4747
npm run seed         # import from the website repo (safe to run twice)
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run db:generate  # after a change to src/lib/db/schema.ts: writes a migration in drizzle/, applied on next start
```
