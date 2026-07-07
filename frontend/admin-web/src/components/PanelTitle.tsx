import type { ReactNode } from "react";

export function PanelTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {aside}
    </div>
  );
}
