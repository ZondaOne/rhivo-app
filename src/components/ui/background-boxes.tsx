'use client';
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BoxesProps {
  className?: string;
}

export const Boxes = ({ className, ...rest }: BoxesProps) => {
  const rows = new Array(80).fill(1);
  const cols = new Array(50).fill(1);

  // Brand colors matching the light palette - grays and teal/green
  const colors = [
    "rgb(249 250 251)", // gray-50
    "rgb(243 244 246)", // gray-100
    "rgb(229 231 235)", // gray-200
    "rgb(209 213 219)", // gray-300
    "rgb(186 230 253)", // sky-200 (light teal variant)
    "rgb(153 246 228)", // teal-200
    "rgb(94 234 212)",  // teal-300
    "rgb(45 212 191)",  // teal-400
    "rgb(187 247 208)", // green-200
    "rgb(134 239 172)", // green-300
    "rgb(74 222 128)",  // green-400
  ];

  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0",
        className
      )}
      {...rest}
    >
      {/* Reverse vignette effect */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, rgba(255, 255, 255, 1) 0%, transparent 100%)`,
        }}
      />
      {rows.map((_, i) => (
        <motion.div
          key={`row` + i}
          className="w-32 h-16 border-l border-gray-200 relative"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col` + j}
              className="w-32 h-16 border-r border-t border-gray-200 relative"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="absolute h-6 w-10 -top-[14px] -left-[22px] text-gray-200 stroke-[1px] pointer-events-none"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};
