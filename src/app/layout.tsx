import type { Metadata } from "next";
import "./globals.css";
import "@/components/slides/slides.css";
import "@/components/slides/docs.css";

export const metadata: Metadata = {
  title: "Spanish Mum in Paris · Studio",
  description: "Create on-brand visuals for LinkedIn, Instagram and Facebook.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
