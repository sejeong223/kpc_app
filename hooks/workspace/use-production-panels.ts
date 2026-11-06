"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
export interface ProductionPanelState {
  leftOpen: boolean; rightOpen: boolean; leftWidth: number; rightWidth: number;
  mobilePanel: "slides" | "editor" | "sources";
}
const defaults: ProductionPanelState = { leftOpen: true, rightOpen: true, leftWidth: 240, rightWidth: 360, mobilePanel: "editor" };
const schema = z.strictObject({ leftOpen: z.boolean(), rightOpen: z.boolean(), leftWidth: z.number().min(150).max(480), rightWidth: z.number().min(280).max(680), mobilePanel: z.enum(["slides", "editor", "sources"]) });
export function resolveProductionPanelWidths(state: ProductionPanelState, width: number): { left: number; right: number } {
  if (width <= 760) return { left: state.leftWidth, right: state.rightWidth };
  if (width < 1180) return {
    left: Math.min(state.leftWidth, Math.max(150, width - 326 - (state.rightOpen ? 0 : 40))),
    right: Math.min(state.rightWidth, width - 40),
  };
  const budget = width - 320 - (state.leftOpen ? 6 : 40) - (state.rightOpen ? 6 : 40);
  const left = Math.min(state.leftWidth, Math.max(150, budget - (state.rightOpen ? 280 : 0)));
  const right = Math.min(state.rightWidth, Math.max(280, budget - (state.leftOpen ? left : 0)));
  return { left, right };
}
export function useProductionPanels(namespace: string) {
  const [stored, setStored] = useState<{ namespace: string | null; state: ProductionPanelState }>({ namespace: null, state: defaults });
  const ready = stored.namespace === namespace, state = ready ? stored.state : defaults;
  useEffect(() => {
    const timer = setTimeout(() => {
      let next = defaults;
      try { const raw = localStorage.getItem("kpc-production-panels:" + namespace); if (raw) { const parsed = schema.safeParse(JSON.parse(raw)); if (parsed.success) next = parsed.data; } } catch { /* Layout preferences are optional. */ }
      setStored({ namespace, state: next });
    }, 0);
    return () => clearTimeout(timer);
  }, [namespace]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("kpc-production-panels:" + namespace, JSON.stringify(state)); } catch { /* Document saving remains available. */ }
  }, [namespace, ready, state]);
  const update = (changes: Partial<ProductionPanelState>) => setStored(previous => previous.namespace === namespace ? { namespace, state: { ...previous.state, ...changes } } : previous);
  return { state, update,
    resize: (side: "left" | "right", delta: number) => setStored(previous => {
      if (previous.namespace !== namespace) return previous;
      const key = side === "left" ? "leftWidth" : "rightWidth";
      return { namespace, state: { ...previous.state, [key]: Math.max(side === "left" ? 150 : 280, Math.min(side === "left" ? 480 : 680, previous.state[key] + delta)) } };
    }),
    reset: () => update(defaults),
  };
}
