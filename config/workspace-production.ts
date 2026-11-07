export const WORKSPACE_LIMITS = {
  chapters: 50,
  sections: 200,
  slides: 200,
  blocks: 100,
  title: 200,
  lead: 1000,
  text: 20000,
  editorPrompt: 20000,
  listItems: 100,
  itemText: 2000,
  columns: 20,
  rows: 100,
  comment: 5000,
  undoMs: 15000,
  imageBytes: 10 * 1024 * 1024,
  imageDimension: 8192,
  imagePixels: 32000000,
} as const;
export const PROJECT_PERMISSIONS = [
  "outline",
  "assign",
  "setup",
  "complete",
  "rework",
] as const;
export const PROJECT_PERMISSION_LABELS = {
  outline: "목차 구조 변경",
  assign: "담당 지정",
  setup: "제작 설정",
  complete: "완성",
  rework: "재작업",
} as const;
