"use client";

import { useEffect, useState, type ComponentType } from "react";
import { getModelContext } from "./modelContext";

export function WebMcpDetect() {
  const [Bridge, setBridge] = useState<ComponentType | null>(null);
  useEffect(() => {
    let active = true;
    if (getModelContext()) void import("./Bridge").then(module => {
      if (active) setBridge(() => module.WebMcpBridge);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return Bridge ? <Bridge /> : null;
}
