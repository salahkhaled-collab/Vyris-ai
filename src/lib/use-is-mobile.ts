"use client";

import { useEffect, useState } from "react";

/** True below the desktop breakpoint (Tailwind `lg`, 1024px). null until known, so nothing renders twice. */
export function useIsMobile(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}
