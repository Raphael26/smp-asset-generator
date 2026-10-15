"use client";

import { Fragment, type ReactNode } from "react";
import type { Paragraph } from "@/lib/brand/typography";

export function Rich({ paragraphs, as = "p" }: { paragraphs: Paragraph[]; as?: "p" | "span" }) {
  const Tag = as;
  return (
    <>
      {paragraphs.map((para, pi) => (
        <Tag key={pi}>
          {para.map((line, li) => (
            <Fragment key={li}>
              {li > 0 && <br />}
              {line.map((piece, k) => {
                let node: ReactNode = piece.text;
                if (piece.em) node = <em>{node}</em>;
                if (piece.strong) node = <strong>{node}</strong>;
                return <Fragment key={k}>{node}</Fragment>;
              })}
            </Fragment>
          ))}
        </Tag>
      ))}
    </>
  );
}

export function VisioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="6" width="13" height="12" rx="1.5" />
      <path d="M15.5 10.5 21.5 7v10l-6-3.5" />
    </svg>
  );
}
