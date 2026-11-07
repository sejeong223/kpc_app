export type NavigatorShortcut = "copy" | "paste" | "remove";
export interface NavigatorKey {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
}

export function navigatorShortcut(event: NavigatorKey): NavigatorShortcut | null {
  if (event.isComposing || event.altKey || event.shiftKey) return null;
  const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
  if (modifier) return key === "c" ? "copy" : key === "v" ? "paste" : null;
  return key === "delete" || key === "backspace" ? "remove" : null;
}

export function slideNavigationDelta(event: NavigatorKey): -1 | 0 | 1 {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return 0;
  switch (event.key.toLowerCase()) {
    case "arrowup": case "arrowleft": return -1;
    case "arrowdown": case "arrowright": return 1;
    default: return 0;
  }
}
