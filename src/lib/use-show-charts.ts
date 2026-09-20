"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "vyris:showCharts";
const EVENT = "vyris:showCharts-change";

export function useShowCharts(): [boolean, (v: boolean) => void] {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const read = () => {
      try {
        setShow(localStorage.getItem(KEY) !== "0");
      } catch {
        setShow(true);
      }
    };
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const set = useCallback((v: boolean) => {
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      // storage blocked: the switch just won't persist
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [show, set];
}