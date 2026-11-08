export function FigmaArrow({
  className = "",
  color = "currentColor",
  width = 22,
  height = 12,
  strokeWidth = 1.8,
}: {
  className?: string;
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 31.1625 17.6625"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 inline-block align-middle ${className}`}
      aria-hidden="true"
    >
      <path
        d="M0 8.60374H29"
        strokeWidth={strokeWidth}
        stroke={color}
        strokeLinecap="round"
      />
      <path
        d="M21.5942 16.6467L29.043 8.55253L20.9488 1.10375"
        strokeWidth={strokeWidth}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
