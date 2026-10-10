import { useEffect, useState } from "react";

type Listener = (lite: boolean) => void;

let current = true;
let started = false;
const listeners = new Set<Listener>();

type NetworkInformation = { saveData?: boolean };

function readLite(): boolean {
  if (typeof window === "undefined") return true;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const touchOnly =
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(pointer: coarse)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: NetworkInformation }).connection
      ?.saveData,
  );
  return reduce || narrow || touchOnly || saveData;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const mqs = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(max-width: 767px)"),
    window.matchMedia("(hover: none)"),
    window.matchMedia("(pointer: coarse)"),
  ];
  const update = () => {
    current = readLite();
    listeners.forEach((listener) => listener(current));
  };
  update();
  mqs.forEach((mq) => mq.addEventListener("change", update));
}

/**
 * True on phones, touch-only devices, Save-Data, or reduced-motion.
 * Starts `true` so the first paint never kicks off desktop-only GPU work.
 */
export function useLiteMotion(): boolean {
  const [lite, setLite] = useState(true);

  useEffect(() => {
    start();
    setLite(current);
    listeners.add(setLite);
    return () => {
      listeners.delete(setLite);
    };
  }, []);

  return lite;
}
