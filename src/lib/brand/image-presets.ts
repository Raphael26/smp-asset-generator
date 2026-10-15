// Art-direction presets for generated photos (brand guidelines, section 05 « Interiors and formats »).

export const PHOTO_STYLE =
  "Editorial interior photograph, shot on medium format, natural daylight, warm whites, crisp natural detail, soft film grain. Muted palette of cream, sand and warm taupe with a few accents of terracotta, ochre and olive green. Lived-in but tidy. No people, no text, no letters, no logos.";

export type PhotoPreset = { id: string; name: string; scene: string };

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: "salon",
    name: "Parisian living room",
    scene:
      "A calm Haussmannian living room: herringbone oak parquet, white plaster mouldings, tall French windows with sheer linen curtains, a cream linen sofa with terracotta and olive cushions, a light oak coffee table with a stack of books, an olive tree in a terracotta pot, warm late-afternoon sun.",
  },
  {
    id: "cuisine",
    name: "Warm kitchen",
    scene:
      "A warm Parisian kitchen corner: worn oak counter, handmade ceramic bowls and a linen tea towel, a glass jar with an olive branch, cream plaster wall, golden morning light from a side window.",
  },
  {
    id: "table",
    name: "Table set for friends",
    scene:
      "A table set for friends in a Parisian dining room: linen tablecloth, handmade ceramic plates, simple glasses, a small bouquet of garden flowers, a bread basket, warm evening lamplight and candles, chairs slightly pulled out.",
  },
  {
    id: "entree",
    name: "Organised entryway",
    scene:
      "A tidy family entryway: oak wall pegs with two small children's raincoats, a low wooden bench with woven seagrass baskets underneath, children's shoes neatly lined on herringbone parquet, cream plaster wall, soft morning light.",
  },
  {
    id: "enfant",
    name: "Child's bedroom",
    scene:
      "A calm, tidy child's bedroom in a Parisian apartment: a linen-covered bed, a rattan basket of toys, a low shelf with a few picture books facing out, a small wooden chair, soft afternoon light through sheer curtains.",
  },
  {
    id: "bureau",
    name: "Desk & planning",
    scene:
      "A calm home desk by a tall window: a light oak table, a weekly family planner card without legible text, a ceramic mug, a pencil pot, a small vase with an olive sprig, soft daylight.",
  },
  {
    id: "nature-morte",
    name: "Still life",
    scene:
      "A quiet still life on a light oak sideboard against a limewash plaster wall: a warm taupe stoneware vase with dried grasses, linen-bound books, a small ceramic bowl, soft window light from the left, visible textures.",
  },
  {
    id: "matieres",
    name: "Materials close-up",
    scene:
      "A close-up of natural materials layered together: washed linen, oak grain, rattan weave and glazed ceramic, in cream, sand and terracotta tones, soft raking daylight revealing the texture.",
  },
  {
    id: "arches",
    name: "Soft architecture",
    scene:
      "Soft curved plaster arches and layered curved walls in off-white cream and warm taupe tones, diffuse daylight casting gentle shadows, fine limewash texture, serene and calm.",
  },
];

export function presetPrompt(presetId: string | null, extra = ""): string {
  const preset = PHOTO_PRESETS.find((p) => p.id === presetId);
  return [preset?.scene, extra.trim(), PHOTO_STYLE].filter(Boolean).join(" ");
}
