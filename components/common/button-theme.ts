import { tokens, type Theme } from "@fluentui/react-components";
import type { CSSProperties } from "react";

import { dadamTheme, dadamUi } from "@/lib/ui/dadam-theme";

export type ButtonThemeStyle = CSSProperties & {
  [name: `--common-button-${string}`]: string | number;
};

const themeKeys = [
  "fontFamilyBase",
  "fontSizeBase300",
  "lineHeightBase300",
  "fontWeightSemibold",
  "borderRadiusMedium",
  "strokeWidthThin",
  "durationFaster",
  "curveEasyEase",
  "colorNeutralBackground1",
  "colorNeutralBackground1Hover",
  "colorNeutralBackground1Pressed",
  "colorNeutralForeground2",
  "colorNeutralForeground2Hover",
  "colorNeutralForeground2Pressed",
  "colorNeutralStroke2",
  "colorNeutralStroke1Hover",
  "colorNeutralStroke1Pressed",
  "colorNeutralBackground2Hover",
  "colorNeutralBackground2Pressed",
  "colorNeutralBackgroundInverted",
  "colorNeutralBackgroundInvertedHover",
  "colorNeutralBackgroundInvertedPressed",
  "colorNeutralBackgroundInvertedSelected",
  "colorNeutralForegroundInverted",
  "colorNeutralForegroundOnBrand",
  "colorBrandBackground",
  "colorBrandBackgroundHover",
  "colorBrandBackgroundPressed",
  "colorBrandBackgroundSelected",
  "colorBrandBackground2",
  "colorBrandBackground2Hover",
  "colorBrandBackground2Pressed",
  "colorBrandForeground2",
  "colorBrandForeground2Hover",
  "colorBrandForeground2Pressed",
  "colorBrandStroke1",
  "colorBrandStroke2",
  "colorBrandStroke2Hover",
  "colorBrandStroke2Pressed",
  "colorStatusDangerBackground3",
  "colorStatusDangerBackground3Hover",
  "colorStatusDangerBackground3Pressed",
  "colorNeutralBackgroundDisabled",
  "colorNeutralForegroundDisabled",
  "colorNeutralStrokeDisabled",
] as const satisfies readonly (keyof Theme)[];

// Keep the existing dadam theme as the source, even inside a KPC-themed parent.
// Only custom properties are inline so caller utilities can override CSS rules.
export const DADAM_BUTTON_STYLE: Readonly<ButtonThemeStyle> = Object.freeze({
  ...Object.fromEntries(
    themeKeys.map((key) => [`--common-button-${key}`, dadamTheme[key]]),
  ),
  "--common-button-control-height": dadamUi.controlHeight,
  "--common-button-focus-ring": dadamUi.focusRing.replace(
    tokens.colorBrandStroke1,
    dadamTheme.colorBrandStroke1,
  ),
});
