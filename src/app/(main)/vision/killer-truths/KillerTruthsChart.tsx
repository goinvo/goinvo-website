"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type KillerTruthsRow = {
  name: string;
  value: number;
};

function formatValue(value: number) {
  return value.toLocaleString("en-US");
}

export function KillerTruthsChart({ rows }: { rows: KillerTruthsRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const updateWidth = () => {
      setWidth(node.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const maxValue = useMemo(
    () => rows.reduce((largest, row) => Math.max(largest, row.value), 0),
    [rows],
  );

  const isMobile = width > 0 && width < 600;
  const rowHeight = 40;
  const chartHeight = rowHeight * rows.length;
  const desktopBarStart = 290;
  const desktopChartWidth = Math.max(width - 320, 0);
  const mobileChartWidth = Math.max(width, 0);

  const getBarWidth = (value: number) => {
    if (maxValue === 0) {
      return 0;
    }

    return (
      (value / maxValue) * (isMobile ? mobileChartWidth : desktopChartWidth)
    );
  };

  return (
    <div id="killer-chart" ref={containerRef}>
      {width > 0 ? (
        <svg
          className={isMobile ? "mobile" : undefined}
          width={width}
          height={chartHeight}
          role="img"
          aria-label="Estimated number of deaths in USA from 2007 to 2014 by cause"
        >
          {rows.map((row, index) => {
            const y = index * rowHeight;
            const textY = y + rowHeight / 2;
            const barWidth = getBarWidth(row.value);

            if (isMobile) {
              return (
                <g key={row.name} transform={`translate(0, ${y})`}>
                  <rect
                    className="bar"
                    x={0}
                    y={0}
                    width={barWidth}
                    height={rowHeight}
                  />
                  <text
                    className="value"
                    x={80}
                    y={rowHeight / 2}
                    dominantBaseline="middle"
                  >
                    {formatValue(row.value)}
                  </text>
                  <text
                    className="name"
                    x={100}
                    y={rowHeight / 2}
                    dominantBaseline="middle"
                  >
                    {row.name}
                  </text>
                </g>
              );
            }

            return (
              <g key={row.name} transform={`translate(0, ${y})`}>
                <rect
                  className="bar"
                  x={desktopBarStart}
                  y={8}
                  width={barWidth}
                  height={rowHeight - 8}
                />
                <text
                  className="value"
                  x={275}
                  y={textY}
                  dominantBaseline="middle"
                >
                  {formatValue(row.value)}
                </text>
                <text
                  className="name"
                  x={200}
                  y={textY}
                  dominantBaseline="middle"
                >
                  {row.name}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}
