import React, { useMemo } from 'react';

export const DistortedGrid: React.FC = () => {
  const paths = useMemo(() => {
    // Coordinate space dimensions
    const width = 420;
    const height = 860;
    const spacing = 28;

    // Organic displacement function based on smooth continuous low-frequency harmonics
    const getWarp = (x: number, y: number) => {
      const dx =
        3.2 * Math.sin(y * 0.022 + 0.6) +
        2.1 * Math.cos((y - x) * 0.015 + 1.2) +
        1.4 * Math.sin(x * 0.012 + y * 0.018 + 0.8);

      const dy =
        3.0 * Math.sin(x * 0.021 + 0.9) +
        2.2 * Math.cos((x + y) * 0.014 + 1.7) +
        1.3 * Math.sin(y * 0.016 - x * 0.019 + 2.1);

      return { dx, dy };
    };

    // Smooth Catmull-Rom to Cubic Bezier conversion for organic curves
    const pointsToSpline = (pts: { x: number; y: number }[]): string => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
      }
      return d;
    };

    const result: string[] = [];

    // Horizontal lines (spanning from y = -10 down to y = 460 where mask reaches 0)
    for (let y = -10; y <= 460; y += spacing) {
      const pts: { x: number; y: number }[] = [];
      for (let x = -15; x <= width + 15; x += 25) {
        const warp = getWarp(x, y);
        pts.push({
          x: x + warp.dx,
          y: y + warp.dy,
        });
      }
      result.push(pointsToSpline(pts));
    }

    // Vertical lines (spanning across width, extending down to y = 470)
    for (let x = -10; x <= width + 10; x += spacing) {
      const pts: { x: number; y: number }[] = [];
      for (let y = -15; y <= 470; y += 25) {
        const warp = getWarp(x, y);
        pts.push({
          x: x + warp.dx,
          y: y + warp.dy,
        });
      }
      result.push(pointsToSpline(pts));
    }

    return result;
  }, []);

  return (
    <div
      id="snapkeep-background-grid"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 420 860"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Vertical linear gradient for the grid opacity mask:
              0–20%: Grid clearly visible (0.24 - 0.18)
              20–40%: Gradually becomes more subtle (0.18 - 0.05)
              40–50%: Smoothly fades away completely (0.05 - 0.00)
              50–100%: 0 opacity (pure dark background remains)
          */}
          <linearGradient id="distorted-grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="12%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.13" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.035" />
            <stop offset="47%" stopColor="#FFFFFF" stopOpacity="0.01" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <mask id="distorted-grid-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#distorted-grid-fade)" />
          </mask>
        </defs>

        <g mask="url(#distorted-grid-mask)">
          {paths.map((d, index) => (
            <path
              key={index}
              d={d}
              stroke="#FFFFFF"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
