import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={location}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -20 }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen w-full flex flex-col"
    >
      <main id="main-content" className="flex-1 w-full relative z-10 pt-4 pb-16 max-w-[1800px] mx-auto">
        {children}
      </main>
    </motion.div>
  );
}
