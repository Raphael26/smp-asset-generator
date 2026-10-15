"use client";

/** Portrait or landscape, for A4 documents: two chips, each with the shape of the page. */
export function OrientationChoice({ landscape, onChange, disabled = false }: { landscape: boolean; onChange: (landscape: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Orientation">
      {[false, true].map((l) => (
        <button key={String(l)} className="chip" aria-pressed={landscape === l} onClick={() => onChange(l)} disabled={disabled}>
          <span aria-hidden className="block border border-current" style={l ? { width: 13, height: 9 } : { width: 9, height: 13 }} />
          {l ? "Landscape" : "Portrait"}
        </button>
      ))}
    </div>
  );
}
