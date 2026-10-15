@AGENTS.md

# Project notes

- Local-only studio for Spanish Mum in Paris social visuals. README.md has the map of files.
- Runs on port 4747 only (`npm run dev`, `npm start`, `Studio.command`). Next allows one dev server per project.
- UI in English; the content of the visuals is French. The main flow is prompt → visual (`src/lib/ai/compose.ts`, `/api/create`); changes from the editor's prompt bar are proposals she applies.
- Generated photos are tied to slides via `slide.photoJob` / `job.request.targetSlideId`; the editor polls and `placePhoto` fills the slide server-side too.
- Never let an image model draw text: photos come from Replicate, all text is set by `SlideView` in the brand fonts.
- Next.js 16 with `cacheComponents: false`: pages are client components that call the `/api` route handlers.
- Paths built from `process.cwd()` in server code carry `/* turbopackIgnore: true */`; without it the dev server watches `data/` and reloads the page on every database write.
- Preview and export share `src/components/slides/SlideView.tsx`; exports go through `/render/[id]` in headless Chrome (`src/lib/render/export.ts`).
- Schema change: edit `src/lib/db/schema.ts`, run `npm run db:generate`, commit the migration in `drizzle/`.
