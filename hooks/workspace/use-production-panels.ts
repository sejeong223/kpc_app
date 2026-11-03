"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
export interface ProductionPanelState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  mobilePanel: "slides" | "editor" | "sources";
}
const defaults: ProductionPanelState = {
    leftOpen: true,
    rightOpen: true,
    leftWidth: 240,
    rightWidth: 320,
    mobilePanel: "editor",
  },
  schema = z.strictObject({
    leftOpen: z.boolean(),
    rightOpen: z.boolean(),
    leftWidth: z.number().min(200).max(320),
    rightWidth: z.number().min(280).max(420),
    mobilePanel: z.enum(["slides", "editor", "sources"]),
  });
export function useProductionPanels(namespace: string) {
  const [state, setState] = useState<ProductionPanelState>(defaults),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(
          "kpc-production-panels:" + namespace,
        );
        if (saved) {
          const value = schema.safeParse(JSON.parse(saved));
          if (value.success) setState(value.data);
        }
      } catch {
        /* 저장소 제한 시 기본 배치를 사용한다. */
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [namespace]);
  const update = (changes: Partial<ProductionPanelState>) =>
    setState((s) => ({ ...s, ...changes }));
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "kpc-production-panels:" + namespace,
        JSON.stringify(state),
      );
    } catch {
      /* 화면 선호 저장 실패는 문서 저장에 영향을 주지 않는다. */
    }
  }, [namespace, ready, state]);
  return {
    state,
    update,
    resize: (side: "left" | "right", delta: number) =>
      setState((s) => ({
        ...s,
        [side + "Width"]: Math.max(
          side === "left" ? 200 : 280,
          Math.min(
            side === "left" ? 320 : 420,
            s[side === "left" ? "leftWidth" : "rightWidth"] + delta,
          ),
        ),
      })),
    reset: () => setState(defaults),
  };
}
