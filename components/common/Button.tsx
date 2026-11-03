"use client";

import { makeStaticStyles } from "@griffel/react";
import { tokens } from "@fluentui/react-components";
import type { ComponentPropsWithRef, ReactElement } from "react";

import { dadamTheme, dadamUi } from "@/lib/ui/dadam-theme";

// Register once per renderer; keep defaults below caller tw: utilities.
const useButtonStyles = makeStaticStyles(`
@layer theme, base, components, utilities;

@layer components {
  .kpc-common-button {
    --_button-bg: ${dadamTheme.colorNeutralBackground1};
    --_button-fg: ${dadamTheme.colorNeutralForeground2};
    --_button-border: ${dadamTheme.colorNeutralStroke2};
    --_button-hover-bg: ${dadamTheme.colorNeutralBackground1Hover};
    --_button-hover-fg: ${dadamTheme.colorNeutralForeground2Hover};
    --_button-hover-border: ${dadamTheme.colorNeutralStroke1Hover};
    --_button-pressed-bg: ${dadamTheme.colorNeutralBackground1Pressed};
    --_button-pressed-fg: ${dadamTheme.colorNeutralForeground2Pressed};
    --_button-pressed-border: ${dadamTheme.colorNeutralStroke1Pressed};
    --_button-selected-bg: ${dadamTheme.colorBrandBackground2};
    --_button-selected-fg: ${dadamTheme.colorBrandForeground2};
    --_button-selected-border: ${dadamTheme.colorBrandStroke1};

    appearance: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    flex-shrink: 0;
    width: auto;
    height: ${dadamUi.controlHeight};
    min-width: 0;
    min-height: 0;
    margin: 0;
    padding: 0 var(--layout-card-inset);
    gap: var(--layout-inline-gap);
    border-width: ${dadamTheme.strokeWidthThin};
    border-style: solid;
    border-color: var(--_button-border);
    border-radius: ${dadamTheme.borderRadiusMedium};
    background-color: var(--_button-bg);
    color: var(--_button-fg);
    font-family: ${dadamTheme.fontFamilyBase};
    font-size: ${dadamTheme.fontSizeBase300};
    line-height: ${dadamTheme.lineHeightBase300};
    font-weight: ${dadamTheme.fontWeightSemibold};
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    box-shadow: none;
    transition-property: background-color, border-color, color;
    transition-duration: ${dadamTheme.durationFaster};
    transition-timing-function: ${dadamTheme.curveEasyEase};
  }

  .kpc-common-button.primary {
    --_button-bg: ${dadamTheme.colorBrandBackground};
    --_button-fg: ${dadamTheme.colorNeutralForegroundOnBrand};
    --_button-border: var(--_button-bg);
    --_button-hover-bg: ${dadamTheme.colorBrandBackgroundHover};
    --_button-hover-fg: var(--_button-fg);
    --_button-hover-border: var(--_button-hover-bg);
    --_button-pressed-bg: ${dadamTheme.colorBrandBackgroundPressed};
    --_button-pressed-fg: var(--_button-fg);
    --_button-pressed-border: var(--_button-pressed-bg);
    --_button-selected-bg: ${dadamTheme.colorBrandBackgroundSelected};
    --_button-selected-fg: var(--_button-fg);
    --_button-selected-border: var(--_button-selected-bg);
  }

  .kpc-common-button.ghost {
    --_button-bg: transparent;
    --_button-border: transparent;
    --_button-hover-bg: ${dadamTheme.colorNeutralBackground2Hover};
    --_button-hover-border: transparent;
    --_button-pressed-bg: ${dadamTheme.colorNeutralBackground2Pressed};
    --_button-pressed-border: transparent;
  }

  .kpc-common-button.soft {
    --_button-bg: ${dadamTheme.colorBrandBackground2};
    --_button-fg: ${dadamTheme.colorBrandForeground2};
    --_button-border: ${dadamTheme.colorBrandStroke2};
    --_button-hover-bg: ${dadamTheme.colorBrandBackground2Hover};
    --_button-hover-fg: ${dadamTheme.colorBrandForeground2Hover};
    --_button-hover-border: ${dadamTheme.colorBrandStroke2Hover};
    --_button-pressed-bg: ${dadamTheme.colorBrandBackground2Pressed};
    --_button-pressed-fg: ${dadamTheme.colorBrandForeground2Pressed};
    --_button-pressed-border: ${dadamTheme.colorBrandStroke2Pressed};
    --_button-selected-bg: ${dadamTheme.colorBrandBackground2Hover};
  }

  .kpc-common-button.dark {
    --_button-bg: ${dadamTheme.colorNeutralBackgroundInverted};
    --_button-fg: ${dadamTheme.colorNeutralForegroundInverted};
    --_button-border: var(--_button-bg);
    --_button-hover-bg: ${dadamTheme.colorNeutralBackgroundInvertedHover};
    --_button-hover-fg: var(--_button-fg);
    --_button-hover-border: var(--_button-hover-bg);
    --_button-pressed-bg: ${dadamTheme.colorNeutralBackgroundInvertedPressed};
    --_button-pressed-fg: var(--_button-fg);
    --_button-pressed-border: var(--_button-pressed-bg);
    --_button-selected-bg: ${dadamTheme.colorNeutralBackgroundInvertedSelected};
    --_button-selected-fg: var(--_button-fg);
    --_button-selected-border: var(--_button-selected-bg);
  }

  .kpc-common-button.danger {
    --_button-bg: ${dadamTheme.colorStatusDangerBackground3};
    --_button-fg: ${dadamTheme.colorNeutralForegroundOnBrand};
    --_button-border: var(--_button-bg);
    --_button-hover-bg: ${dadamTheme.colorStatusDangerBackground3Hover};
    --_button-hover-fg: var(--_button-fg);
    --_button-hover-border: var(--_button-hover-bg);
    --_button-pressed-bg: ${dadamTheme.colorStatusDangerBackground3Pressed};
    --_button-pressed-fg: var(--_button-fg);
    --_button-pressed-border: var(--_button-pressed-bg);
    --_button-selected-bg: var(--_button-pressed-bg);
    --_button-selected-fg: var(--_button-fg);
    --_button-selected-border: var(--_button-selected-bg);
  }

  .kpc-common-button:enabled:hover {
    background-color: var(--_button-hover-bg);
    color: var(--_button-hover-fg);
    border-color: var(--_button-hover-border);
  }

  .kpc-common-button.active:enabled {
    background-color: var(--_button-selected-bg);
    color: var(--_button-selected-fg);
    border-color: var(--_button-selected-border);
    box-shadow: inset 0 0 0 ${dadamTheme.strokeWidthThin} currentColor;
  }

  .kpc-common-button:enabled:active {
    background-color: var(--_button-pressed-bg);
    color: var(--_button-pressed-fg);
    border-color: var(--_button-pressed-border);
  }

  .kpc-common-button:focus-visible {
    outline: ${dadamUi.focusRing.replace(tokens.colorBrandStroke1, dadamTheme.colorBrandStroke1)};
    outline-offset: 2px;
  }

  .kpc-common-button:disabled {
    background-color: ${dadamTheme.colorNeutralBackgroundDisabled};
    color: ${dadamTheme.colorNeutralForegroundDisabled};
    border-color: ${dadamTheme.colorNeutralStrokeDisabled};
    opacity: 1;
    box-shadow: none;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .kpc-common-button { transition: none; }
  }

  @media (forced-colors: active) {
    .kpc-common-button,
    .kpc-common-button:enabled:hover,
    .kpc-common-button.active:enabled,
    .kpc-common-button:enabled:active {
      forced-color-adjust: auto;
      background-color: ButtonFace;
      color: ButtonText;
      border-color: ButtonText;
      box-shadow: none;
    }

    .kpc-common-button.active:enabled {
      border-color: Highlight;
      outline: 1px solid Highlight;
      outline-offset: -3px;
    }

    .kpc-common-button:disabled {
      color: GrayText;
      background-color: ButtonFace;
      border-color: GrayText;
    }

    .kpc-common-button:focus-visible,
    .kpc-common-button.active:enabled:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }
  }
}
`);

export type ButtonProps = ComponentPropsWithRef<"button">;

export default function Button({
  type = "button",
  className,
  ...props
}: ButtonProps): ReactElement {
  useButtonStyles();

  return (
    <button
      {...props}
      type={type}
      className={className ? `kpc-common-button ${className}` : "kpc-common-button"}
      data-common-button=""
    />
  );
}
