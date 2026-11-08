import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "framer-motion";
import avatarFront from "@/assets/avatar/avatar-front.png";
import avatarRight from "@/assets/avatar/avatar-right.png";
import avatarBack from "@/assets/avatar/avatar-back.png";
import avatarLeft from "@/assets/avatar/avatar-left.png";

// 360-degree rotation order: Front (0) -> Right (1) -> Back (2) -> Left (3)
const FRAMES = [avatarFront, avatarRight, avatarBack, avatarLeft];

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

export function AnimatedLogo({ className = "", size = 62 }: AnimatedLogoProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  // Preload turnaround frames immediately
  useEffect(() => {
    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Continuous spinning loop: pauses on the front face longer, turns around slower
  useEffect(() => {
    if (reduceMotion) return;
    // Front face (index 0) pauses for ~2.4s; other turnaround frames change at a relaxed pace (340ms)
    const delay =
      frameIndex === 0
        ? (isHovered ? 1200 : 2400)
        : (isHovered ? 200 : 340);

    timerRef.current = window.setTimeout(() => {
      setFrameIndex((prev) => (prev + 1) % FRAMES.length);
    }, delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [frameIndex, isHovered, reduceMotion]);

  return (
    <Link
      href="/"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Lenna Hua: Return to homepage"
      className={`relative inline-flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Crisp line art with white outline wrap in dark mode */}
        <img
          src={FRAMES[frameIndex]}
          alt="Lenna Hua rotating character avatar"
          width={size}
          height={size}
          className="w-full h-full object-contain pointer-events-none select-none avatar-dark-outline"
          draggable={false}
        />
      </div>
    </Link>
  );
}
