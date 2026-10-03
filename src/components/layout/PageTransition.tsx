import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useLiteMotion } from "@/hooks/use-lite-motion";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const lite = useLiteMotion();

  return (
    <motion.div
      key={location}
      initial={lite ? false : { opacity: 0, y: 20 }}
      animate={lite ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={lite ? { opacity: 0 } : { opacity: 0, y: -20 }}
      transition={lite ? { duration: 0.18 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen w-full flex flex-col"
    >
      <main id="main-content" className="flex-1 w-full relative z-10 pt-8 md:pt-32 pb-24 px-6 md:px-12 max-w-[1600px] mx-auto">
        {children}
      </main>
    </motion.div>
  );
}
