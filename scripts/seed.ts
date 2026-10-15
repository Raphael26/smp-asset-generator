// First-run import: Rebeca's photos and the AI images from the website repo, plus the
// « enjeu RH » LinkedIn carousel rebuilt as an editable asset. Safe to run twice.
//   npm run seed                      (looks for ../spanishmuminparis)
//   npm run seed -- /path/to/website  (another location)
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { saveImage } from "@/lib/media";
import { createAsset, updateAsset } from "@/lib/assets";
import { newSlide } from "@/lib/brand/layouts";
import { DEFAULT_OPTIONS } from "@/lib/content";

const site = path.resolve(process.argv[2] ?? path.join(process.cwd(), "..", "spanishmuminparis"));
if (!fs.existsSync(site)) {
  console.error(`Website repo not found at ${site}`);
  process.exit(1);
}

const REAL: [string, string][] = [
  ["src/assets/rebeca.jpg", "Rebeca at her desk"],
  ["src/assets/rebeca-micro.jpg", "Rebeca with a microphone, kitchen"],
  ["src/assets/journal/charge-mentale-bureau.jpg", "Rebeca with a microphone, living room"],
  ["src/assets/journal/charge-mentale.jpg", "Rebeca with her laptop"],
  ["src/assets/rebeca-showroom.jpg", "Rebeca in a showroom"],
];

const AI: [string, string, string][] = [
  ["design/photos-ia/salon.jpg", "Living room", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/salon-large.jpg", "Living room, wide", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/cuisine.jpg", "Kitchen", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/chambre.jpg", "Bedroom", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/arche.jpg", "Arch", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/porte.jpg", "Door", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/moodboard.jpg", "Moodboard", "black-forest-labs/flux-2-pro"],
  ["design/photos-ia/mains.jpg", "Hands arranging a vase", "black-forest-labs/flux-2-pro"],
  ["src/assets/journal/maison-rangee.jpg", "Tidy home", "black-forest-labs/flux-2-max"],
  ["src/assets/journal/habitudes-enfants.jpg", "Children's habits", "black-forest-labs/flux-2-max"],
  ["src/assets/journal/kave-home.jpg", "Kave Home living room", "black-forest-labs/flux-2-max"],
  ["design/banners/sources/buffet.jpg", "Sideboard, banner", "black-forest-labs/flux-2-max"],
  ["design/banners/sources/salon.jpg", "Living room, banner", "black-forest-labs/flux-2-max"],
  ["design/banners/sources/arches.jpg", "Arches, banner", "black-forest-labs/flux-2-max"],
  ["design/banners/sources/nature-morte.jpg", "Still life on ink, banner", "black-forest-labs/flux-2-max"],
];

async function main() {
  const existing = new Set(db.select({ label: schema.media.label }).from(schema.media).all().map((m) => m.label));
  let added = 0;
  for (const [rel, label] of REAL) {
    const f = path.join(site, rel);
    if (!fs.existsSync(f) || existing.has(label)) continue;
    await saveImage(fs.readFileSync(f), { kind: "upload", isAi: false, label });
    added++;
  }
  for (const [rel, label, model] of AI) {
    const f = path.join(site, rel);
    if (!fs.existsSync(f) || existing.has(label)) continue;
    await saveImage(fs.readFileSync(f), { kind: "generated", isAi: true, label, model, params: { importedFrom: rel } });
    added++;
  }
  console.log(`Images imported: ${added}`);

  const title = "Pourquoi la parentalité est un enjeu RH";
  if (!db.select().from(schema.assets).where(eq(schema.assets.title, title)).get()) {
    const asset = createAsset({ title, formatId: "linkedin-carousel", universe: "entreprises", starterId: "blank" });
    const eyebrow = "Parentalité & entreprise";
    const s1 = newSlide("figure");
    s1.fields = {
      eyebrow,
      title: "Pourquoi la parentalité est un *enjeu RH* ?",
      value: "+60 %",
      text: "des femmes vivant avec un enfant de moins de 15 ans déclarent une charge mentale lourde.",
      contrast: "Contre 40 % des hommes.",
      source: "INED, 2026",
    };
    const s2 = newSlide("figure");
    s2.fields = {
      eyebrow,
      title: "Sans équilibre,\n*on s'en va.*",
      value: "40 %",
      text: "des actifs français ont déjà quitté un poste incompatible avec leur vie personnelle.",
      contrast: "",
      source: "Randstad Workmonitor, 2026",
    };
    const s3 = newSlide("figure");
    s3.fields = {
      eyebrow,
      title: "Avec équilibre,\n*on reste.*",
      value: "42 %",
      text: "des actifs français placent l'équilibre des temps de vie en tête des raisons de rester chez leur employeur.",
      contrast: "Le salaire ? 30 %.",
      source: "Randstad Workmonitor, 2026",
    };
    const s4 = newSlide("cta");
    s4.fields = {
      eyebrow: "Home & Life Balance · Ateliers en entreprise",
      title: "Allégez la charge mentale *de vos équipes.*",
      text: "Des ateliers pratiques pour aider vos collaborateurs à mieux organiser leur quotidien à la maison.",
      button: "Réserver un appel",
      url: "spanishmuminparis.com/entreprises",
    };
    updateAsset(asset.id, {
      status: "ready",
      notes: "Rebuilt from design/linkedin-carousel in the website repo (October 2026).",
      content: { slides: [s1, s2, s3, s4], caption: "", options: { ...DEFAULT_OPTIONS, universeTag: false } },
    });
    console.log(`Sample asset created: ${title}`);
  }
}

main().then(() => process.exit(0));
