"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

interface ProductionSidebarPreference {
  version: 1;
  collapsed: boolean;
}
const schema = z.strictObject({ version: z.literal(1), collapsed: z.boolean() });
const keyFor = (namespace: string) => "kpc-production-menu-sidebar:" + namespace;

export function useProductionSidebar(namespace: string | null): {
  collapsed: boolean;
  ready: boolean;
  setCollapsed(value: boolean): void;
} {
  const [stored, setStored] = useState<{ namespace: string | null; collapsed: boolean; ready: boolean }>({
    namespace: null, collapsed: true, ready: false,
  });
  // 늦게 완료된 초기 읽기가 사용자의 수동 선택을 덮어쓰지 않게 한다.
  const choice = useRef<{ namespace: string | null; collapsed: boolean } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      let collapsed = true;
      if (namespace !== null) {
        try {
          const raw = localStorage.getItem(keyFor(namespace));
          if (raw !== null) {
            const parsed = schema.safeParse(JSON.parse(raw));
            if (parsed.success) collapsed = parsed.data.collapsed;
          }
        } catch { /* 저장소를 사용할 수 없어도 메뉴 조작은 유지한다. */ }
      }
      if (choice.current?.namespace === namespace) collapsed = choice.current.collapsed;
      setStored({ namespace, collapsed, ready: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [namespace]);
  const setCollapsed = useCallback((collapsed: boolean) => {
    choice.current = { namespace, collapsed };
    setStored({ namespace, collapsed, ready: true });
    if (namespace !== null) {
      const value: ProductionSidebarPreference = { version: 1, collapsed };
      try { localStorage.setItem(keyFor(namespace), JSON.stringify(value)); }
      catch { /* 현재 화면의 선택은 메모리에 남긴다. */ }
    }
  }, [namespace]);
  return {
    collapsed: stored.namespace === namespace ? stored.collapsed : true,
    ready: stored.namespace === namespace && stored.ready,
    setCollapsed,
  };
}
