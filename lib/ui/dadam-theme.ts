import { tokens, webLightTheme, type Theme } from "@fluentui/react-components";

export const DADAM_FONT_FAMILY = "var(--dadam-font-family)";

export const dadamTheme: Theme = {
  ...webLightTheme,
  fontFamilyBase: DADAM_FONT_FAMILY,
  fontFamilyNumeric: DADAM_FONT_FAMILY,
  fontWeightSemibold: 500,
};

export const dadamUi = {
  bodySize: tokens.fontSizeBase300,
  bodyLineHeight: tokens.lineHeightBase300,
  metaSize: tokens.fontSizeBase200,
  metaLineHeight: tokens.lineHeightBase200,
  titleSize: tokens.fontSizeBase400,
  titleLineHeight: "24px",
  controlRadius: tokens.borderRadiusMedium,
  cardRadius: tokens.borderRadiusLarge,
  surfaceRadius: "8px",
  controlHeight: "32px",
  smallControlHeight: "28px",
  cardPadding: "var(--layout-card-inset)",
  sectionGap: "var(--layout-section-gap)",
  popoverShadow: tokens.shadow8,
  dialogShadow: tokens.shadow16,
  pinShadow: "0 2px 6px rgba(15,108,189,.35)",
  pinSelectedRing: "0 0 0 4px rgba(15,108,189,.18)",
  focusRing: `2px solid ${tokens.colorBrandStroke1}`,
} as const;
