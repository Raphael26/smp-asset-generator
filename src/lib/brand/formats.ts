// Output formats. Adding one = adding an entry here (the templates adapt to its shape).

export type Shape = "portrait" | "square" | "story" | "landscape";

export type Format = {
  id: string;
  platform: "LinkedIn" | "Instagram" | "Facebook";
  name: string;
  width: number;
  height: number;
  shape: Shape;
  /** Several slides (carousel) or a single image. */
  multi: boolean;
  maxSlides: number;
  /** LinkedIn carousels are uploaded as a PDF document; everything else as images. */
  primaryExport: "pdf" | "png";
  hint: string;
};

export const FORMATS: Format[] = [
  {
    id: "linkedin-carousel",
    platform: "LinkedIn",
    name: "Carousel",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: true,
    maxSlides: 20,
    primaryExport: "pdf",
    hint: "Uploaded as a PDF document, one page per slide.",
  },
  {
    id: "linkedin-post",
    platform: "LinkedIn",
    name: "Post · portrait",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Takes the most room in the feed.",
  },
  {
    id: "linkedin-post-square",
    platform: "LinkedIn",
    name: "Post · square",
    width: 1080,
    height: 1080,
    shape: "square",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Safe everywhere.",
  },
  {
    id: "linkedin-post-landscape",
    platform: "LinkedIn",
    name: "Post · landscape",
    width: 1200,
    height: 627,
    shape: "landscape",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Same shape as a link preview.",
  },
  {
    id: "instagram-post",
    platform: "Instagram",
    name: "Post · 4:5",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Standard portrait post.",
  },
  {
    id: "instagram-square",
    platform: "Instagram",
    name: "Post · square",
    width: 1080,
    height: 1080,
    shape: "square",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Classic square post.",
  },
  {
    id: "instagram-carousel",
    platform: "Instagram",
    name: "Carousel",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: true,
    maxSlides: 20,
    primaryExport: "png",
    hint: "One image per slide, uploaded together.",
  },
  {
    id: "instagram-story",
    platform: "Instagram",
    name: "Story",
    width: 1080,
    height: 1920,
    shape: "story",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Keep text out of the top and bottom 250px.",
  },
  {
    id: "facebook-post",
    platform: "Facebook",
    name: "Post · 4:5",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Portrait post.",
  },
  {
    id: "facebook-landscape",
    platform: "Facebook",
    name: "Post · landscape",
    width: 1200,
    height: 630,
    shape: "landscape",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Same shape as a link preview.",
  },
];

export function getFormat(id: string): Format {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

export const PLATFORMS = ["LinkedIn", "Instagram", "Facebook"] as const;
