import { useRef, useState } from 'react';

export default function PhotoGallery({ photos }) {
  const list = photos.filter((p) => p.src);
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active) setActive(index);
  }

  if (list.length === 0) {
    return (
      <div className="aspect-[16/9] bg-canvas dark:bg-garage flex items-center justify-center">
        <span className="font-mono text-xs tracking-plate text-ink-soft dark:text-paper-soft">NO PHOTO YET</span>
      </div>
    );
  }

  if (list.length === 1) {
    return (
      <div className="aspect-[16/9] bg-canvas dark:bg-garage overflow-hidden">
        <img src={list[0].src} alt={list[0].label} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="aspect-[16/9] flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-canvas dark:bg-garage"
      >
        {list.map((p) => (
          <div key={p.label} className="w-full h-full flex-shrink-0 snap-center">
            <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {list.map((p, i) => (
          <span
            key={p.label}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? 'bg-vermilion' : 'bg-white/60'}`}
          />
        ))}
      </div>
      <span className="absolute top-2 right-2 font-mono text-[9px] tracking-plate uppercase bg-canvas/90 dark:bg-garage/90 px-2 py-1 border border-canvas-line dark:border-garage-line">
        {list[active]?.label}
      </span>
    </div>
  );
}
