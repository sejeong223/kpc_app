"use client";

import { makeStyles, mergeClasses, Switch, switchClassNames } from "@fluentui/react-components";
import { useId } from "react";

export interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
  className?: string;
}

const useStyles = makeStyles({
  root: {
    position: "relative",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: "20px",
    gap: "10px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    margin: 0,
    padding: 0,
    fontFamily: "inherit",
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: 700,
  },
  description: { color: "#74747d", fontSize: "10.5px", lineHeight: "16px", fontWeight: 400 },
  indicator: {
    display: "flex",
    alignItems: "center",
    width: "34px",
    height: "20px",
    padding: "2px",
    margin: 0,
    border: 0,
    borderRadius: "10px",
    backgroundColor: "#d4d6db",
    flexShrink: 0,
    transitionDuration: "150ms",
    transitionProperty: "background-color",
    "@media (prefers-reduced-motion: reduce)": { transitionDuration: "0ms" },
  },
  thumb: {
    display: "block",
    width: "16px",
    height: "16px",
    flexShrink: 0,
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,.2)",
    transform: "translateX(0)",
    transitionDuration: "150ms",
    transitionProperty: "transform",
    "@media (prefers-reduced-motion: reduce)": { transitionDuration: "0ms" },
    "@media (forced-colors: active)": { backgroundColor: "CanvasText" },
  },
  input: {
    left: "auto",
    right: 0,
    top: "50%",
    width: "34px",
    height: "20px",
    transform: "translateY(-50%)",
    ":checked": {
      [`& ~ .${switchClassNames.indicator} > *`]: { transform: "translateX(14px)" },
    },
    ':enabled:checked:not([aria-disabled="true"])': {
      [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "#d7192f" },
      ":hover": {
        [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "#c31429" },
      },
      ":hover:active": {
        [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "#b01225" },
      },
    },
    "@media (forced-colors: active)": {
      ':enabled:checked:not([aria-disabled="true"])': {
        [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "Highlight" },
        ":hover": {
          [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "Highlight" },
        },
        ":hover:active": {
          [`& ~ .${switchClassNames.indicator}`]: { backgroundColor: "Highlight" },
        },
      },
    },
  },
});

export default function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
}: ToggleSwitchProps): React.ReactElement {
  const styles = useStyles();
  const descriptionId = useId();

  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onChange={(_, data) => { if (!disabled) onChange(data.checked); }}
      labelPosition="before"
      aria-describedby={description ? descriptionId : undefined}
      className={mergeClasses(styles.root, className)}
      input={{ className: styles.input }}
      indicator={{ className: styles.indicator, children: <span className={styles.thumb} /> }}
      label={{
        className: styles.label,
        children: <><span>{label}</span>{description && <span id={descriptionId} className={styles.description}>{description}</span>}</>,
      }}
    />
  );
}
