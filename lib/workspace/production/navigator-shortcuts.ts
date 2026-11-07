export type NavigatorShortcut = "copy" | "paste" | "remove";
export interface NavigatorKey {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
}

export function navigatorShortcut(event: NavigatorKey): NavigatorShortcut | null {
  if (event.isComposing || event.altKey || event.shiftKey) return null;
  // IME/layouts can report a localized character (e.g. ㅊ/ㅍ) for Ctrl+C/V.
  const key = event.code === "KeyC" ? "c" : event.code === "KeyV" ? "v" : event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier) return key === "c" ? "copy" : key === "v" ? "paste" : null;
  return key === "delete" || key === "del" || key === "backspace" || event.code === "Delete" || event.code === "Backspace" ? "remove" : null;
}

export function slideNavigationDelta(event: NavigatorKey): -1 | 0 | 1 {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return 0;
  switch (event.key.toLowerCase()) {
    case "arrowup": case "arrowleft": return -1;
    case "arrowdown": case "arrowright": return 1;
    default: return 0;
  }
}
