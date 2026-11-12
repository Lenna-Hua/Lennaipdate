import type { ReactNode } from "react";

export function AdjustmentFrame({
  children,
  className = "",
  innerClassName = "",
  dashedColor = "border-foreground/60 dark:border-foreground/70",
  handleColor = "bg-foreground dark:bg-foreground",
  handleBorderColor = "border-background",
  circleHandle = true,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  dashedColor?: string;
  handleColor?: string;
  handleBorderColor?: string;
  circleHandle?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center border border-dashed ${dashedColor} ${className}`}
    >
      {/* Top-left handle (square) */}
      <span
        aria-hidden="true"
        className={`absolute -top-1 -left-1 w-2 h-2 ${handleColor} border ${handleBorderColor} shadow-xs pointer-events-none z-10`}
      />
      {/* Top-right handle (circle / rotation node) */}
      <span
        aria-hidden="true"
        className={`absolute -top-1 -right-1 w-2 h-2 ${
          circleHandle ? "rounded-full" : ""
        } ${handleColor} border ${handleBorderColor} shadow-xs pointer-events-none z-10`}
      />
      {/* Bottom-left handle (square) */}
      <span
        aria-hidden="true"
        className={`absolute -bottom-1 -left-1 w-2 h-2 ${handleColor} border ${handleBorderColor} shadow-xs pointer-events-none z-10`}
      />
      {/* Bottom-right handle (square) */}
      <span
        aria-hidden="true"
        className={`absolute -bottom-1 -right-1 w-2 h-2 ${handleColor} border ${handleBorderColor} shadow-xs pointer-events-none z-10`}
      />
      <span className={innerClassName}>{children}</span>
    </span>
  );
}
