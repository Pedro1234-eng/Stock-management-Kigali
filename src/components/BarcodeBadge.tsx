import React from 'react';

interface BarcodeBadgeProps {
  barcode: string;
  name?: string;
  priceRwf?: number;
  width?: number;
  height?: number;
  showText?: boolean;
}

export const BarcodeBadge: React.FC<BarcodeBadgeProps> = ({
  barcode,
  name,
  priceRwf,
  width = 180,
  height = 50,
  showText = true,
}) => {
  // Deterministic SVG bars based on barcode string
  const bars = React.useMemo(() => {
    const list: { width: number; space: number }[] = [];
    let seed = 0;
    for (let i = 0; i < barcode.length; i++) {
      seed = (seed * 31 + barcode.charCodeAt(i)) % 1000;
    }
    
    // Start guard bars
    list.push({ width: 2, space: 2 });
    list.push({ width: 2, space: 2 });

    for (let i = 0; i < barcode.length; i++) {
      const charCode = barcode.charCodeAt(i);
      const w1 = (charCode % 3) + 1.5;
      const s1 = ((charCode >> 1) % 3) + 1.5;
      const w2 = ((charCode >> 2) % 2) + 1.5;
      const s2 = ((charCode >> 3) % 2) + 1.5;
      list.push({ width: w1, space: s1 });
      list.push({ width: w2, space: s2 });
    }

    // End guard bars
    list.push({ width: 2, space: 2 });
    list.push({ width: 2, space: 1 });
    return list;
  }, [barcode]);

  let currentX = 10;

  return (
    <div className="inline-flex flex-col items-center bg-white text-slate-900 p-2 rounded border border-slate-200 shadow-xs select-none">
      {name && (
        <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[190px] mb-0.5">
          {name}
        </span>
      )}
      
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-hidden"
      >
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width + bar.space;
          if (x + bar.width > width - 10) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={4}
              width={bar.width}
              height={height - 8}
              fill="#0f172a"
            />
          );
        })}
      </svg>

      {showText && (
        <div className="flex items-center justify-between w-full px-2 mt-0.5 text-[11px] font-mono tracking-widest text-slate-700">
          <span>{barcode}</span>
          {priceRwf !== undefined && (
            <span className="font-bold text-emerald-800">{priceRwf.toLocaleString()} Frw</span>
          )}
        </div>
      )}
    </div>
  );
};
