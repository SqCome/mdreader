import type { OutlineItem } from "../lib/outline";

interface OutlineProps {
  items: OutlineItem[];
  activeHeading: OutlineItem | undefined;
  onJumpTo: (from: number) => void;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "H1",
  2: "H2",
  3: "H3",
};

export default function Outline({ items, activeHeading, onJumpTo }: OutlineProps) {
  if (items.length === 0) {
    return (
      <aside className="outline-pane" aria-label="Document outline">
        <div className="outline-header">Contents</div>
        <div className="outline-empty">No headings found</div>
      </aside>
    );
  }

  return (
    <aside className="outline-pane" aria-label="Document outline">
      <div className="outline-header">Contents</div>
      <nav className="outline-list">
        {items.map((item, i) => {
          const isActive = activeHeading?.from === item.from && activeHeading?.to === item.to;
          return (
            <button
              key={i}
              className={`outline-item outline-level-${item.level}${isActive ? " outline-active" : ""}`}
              onClick={() => onJumpTo(item.from)}
              title={item.text}
            >
              <span className="outline-badge">{LEVEL_LABEL[item.level]}</span>
              <span className="outline-text">{item.text}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
