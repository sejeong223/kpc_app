export interface ProductionPanelState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  mobilePanel: "slides" | "editor" | "sources";
}

export interface ProductionPanelLayout {
  mode: "mobile" | "compact" | "wide";
  leftOpen: boolean;
  rightOpen: boolean;
  left: number;
  right: number;
  leftRail: number;
  rightRail: number;
  leftSplitter: number;
  rightSplitter: number;
  center: number;
}

/** 표시 폭만 제한한다. 저장된 사용자의 패널 너비/열기 선택은 변경하지 않는다. */
export function resolveProductionPanelLayout(
  state: ProductionPanelState,
  measuredWidth: number,
  options: { compactRightOpen?: boolean } = {},
): ProductionPanelLayout {
  const width = Number.isFinite(measuredWidth) ? Math.max(0, measuredWidth) : 0;
  if (width <= 760) return {
    mode: "mobile", leftOpen: state.mobilePanel === "slides", rightOpen: state.mobilePanel === "sources",
    left: state.mobilePanel === "slides" ? width : 0,
    right: state.mobilePanel === "sources" ? width : 0,
    center: state.mobilePanel === "editor" ? width : 0,
    leftRail: 0, rightRail: 0, leftSplitter: 0, rightSplitter: 0,
  };
  const mode = width < 1180 ? "compact" : "wide";
  const rightOpen = state.rightOpen && (mode === "wide" || !!options.compactRightOpen);
  // 출처를 명시적으로 열었을 때 최소 320px의 편집 공간을 우선 확보한다.
  const leftOpen = state.leftOpen && !(rightOpen && width < 150 + 280 + 320 + 12);
  const leftRail = leftOpen ? 0 : 40, rightRail = rightOpen ? 0 : 40;
  const leftSplitter = leftOpen ? 6 : 0, rightSplitter = rightOpen ? 6 : 0;
  const budget = width - 320 - leftRail - rightRail - leftSplitter - rightSplitter;
  const left = leftOpen ? Math.min(state.leftWidth, budget - (rightOpen ? 280 : 0)) : 0;
  const right = rightOpen ? Math.min(state.rightWidth, budget - left) : 0;
  return {
    mode, leftOpen, rightOpen, left, right, leftRail, rightRail, leftSplitter, rightSplitter,
    center: width - left - right - leftRail - rightRail - leftSplitter - rightSplitter,
  };
}
