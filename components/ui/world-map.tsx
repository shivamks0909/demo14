"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";
import { useTheme } from "next-themes";

interface MapProps {
dots?: Array<{
start: { lat: number; lng: number; label?: string };
end: { lat: number; lng: number; label?: string };
}>;
lineColor?: string;
}

export default function WorldMap({
dots = [],
lineColor = "#0ea5e9",
}: MapProps) {
const svgRef = useRef<SVGSVGElement>(null);
const map = new DottedMap({ height: 100, grid: "diagonal" });

const { theme } = useTheme();

const svgMap = map.getSVG({
radius: 0.22,
color: theme === "dark" ? "#FFFFFF40" : "#00000040",
shape: "circle",
backgroundColor: theme === "dark" ? "black" : "white",
});

const projectPoint = (lat: number, lng: number) => {
const x = (lng + 180) * (800 / 360);
const y = (90 - lat) * (400 / 180);
return { x, y };
};

const createCurvedPath = (
start: { x: number; y: number },
end: { x: number; y: number }
) => {
const midX = (start.x + end.x) / 2;
const midY = Math.min(start.y, end.y) - 50;
return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
};

return (
  <div className="absolute inset-0 w-full h-full z-0">
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
      className="h-full w-full opacity-40"
      alt="world map"
      draggable={false}
    />
    <svg
      ref={svgRef}
      viewBox="0 0 800 400"
      className="absolute inset-0 w-full h-full"
    >
      {dots.map((dot, i) => {
        const startPoint = projectPoint(dot.start.lat, dot.start.lng);
        const endPoint = projectPoint(dot.end.lat, dot.end.lng);
        return (
          <motion.path
            key={i}
            d={createCurvedPath(startPoint, endPoint)}
            fill="none"
            stroke={lineColor}
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: i * 0.4 }}
          />
        );
      })}
    </svg>
  </div>
);
}