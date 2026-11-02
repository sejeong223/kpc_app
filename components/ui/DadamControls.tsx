"use client";

import { forwardRef, type ComponentRef } from "react";
import {
  Button, Checkbox, Input, Select, Textarea,
  type ButtonProps, type CheckboxProps, type InputProps, type SelectProps, type TextareaProps,
  checkboxClassNames, inputClassNames, selectClassNames, textareaClassNames,
  makeStyles, mergeClasses, shorthands, tokens,
} from "@fluentui/react-components";
import { dadamControl as control } from "@/lib/ui/dadam-theme";

// Fluent 슬롯과 이벤트를 보존하고 표현만 공통화한다. 화면에서는 크기·동작만 지정한다.
const useStyles = makeStyles({
  base: {
    minWidth: 0, boxSizing: "border-box", borderRadius: control.radius,
    fontFamily: tokens.fontFamilyBase, fontSize: control.fontSize, lineHeight: control.lineHeight,
  },
  medium: { minHeight: control.height, "--dadam-current-control-height": control.height },
  small: { minHeight: control.compactHeight, fontSize: control.compactFontSize, "--dadam-current-control-height": control.compactHeight },
  large: { minHeight: control.largeHeight, "--dadam-current-control-height": control.largeHeight },
  field: {
    ...shorthands.border("1px", "solid", control.border),
    backgroundColor: control.surface, color: control.ink,
    "::after": { display: "none" },
    ":hover": { ...shorthands.borderColor(control.borderHover) },
    ":focus-within": { ...shorthands.borderColor(tokens.colorBrandStroke1), boxShadow: control.focusShadow },
    '&:has([aria-invalid="true"])': { ...shorthands.borderColor(tokens.colorPaletteRedBorder2) },
    // 비활성 option이 포함된 활성 select까지 비활성으로 표시하지 않는다.
    "&:has(input:disabled, select:disabled, textarea:disabled)": {
      ...shorthands.borderColor(control.border), backgroundColor: control.muted,
      color: control.disabled, cursor: "not-allowed", boxShadow: "none",
    },
    "@media (forced-colors: active)": {
      ...shorthands.borderColor("CanvasText"),
      ":focus-within": { outline: "2px solid Highlight", outlineOffset: "2px" },
      "&:has(input:disabled, select:disabled, textarea:disabled)": { ...shorthands.borderColor("GrayText"), color: "GrayText" },
    },
  },
  input: {
    paddingLeft: control.padding, paddingRight: control.padding,
    [`& .${inputClassNames.input}`]: {
      minWidth: 0, fontSize: "inherit", lineHeight: control.lineHeight, color: "inherit",
      "::placeholder": { color: control.placeholder, opacity: 1 },
      ":disabled": { color: control.disabled, cursor: "not-allowed" },
    },
  },
  select: {
    [`& .${selectClassNames.select}`]: {
      minHeight: "calc(var(--dadam-current-control-height) - 2px)", border: 0, borderRadius: "inherit", backgroundColor: "transparent",
      color: "inherit", fontSize: "inherit", paddingLeft: control.padding, paddingRight: "32px",
      ":focus-visible": { outline: "none" },
      ":disabled": { color: control.disabled, cursor: "not-allowed" },
    },
  },
  textarea: {
    [`& .${textareaClassNames.textarea}`]: {
      padding: `8px ${control.padding}`, fontSize: "inherit", lineHeight: control.lineHeight, color: "inherit",
      "::placeholder": { color: control.placeholder, opacity: 1 },
      ":disabled": { color: control.disabled, cursor: "not-allowed" },
    },
  },
  button: {
    fontWeight: 500, paddingLeft: control.padding, paddingRight: control.padding,
    ":focus-visible": { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: "2px" },
    '&[aria-pressed="true"]:not(:disabled):not([aria-disabled="true"])': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground1,
    },
    "@media (forced-colors: active)": {
      '&[aria-pressed="true"]': { outline: "2px solid Highlight" },
      ":focus-visible": { outlineColor: "Highlight" },
    },
  },
  iconButton: { minWidth: control.height, paddingLeft: "6px", paddingRight: "6px" },
  smallIconButton: { minWidth: control.compactHeight },
  largeIconButton: { minWidth: control.largeHeight },
  circularButton: { borderRadius: "50%" },
  squareButton: { borderRadius: 0 },
  checkbox: {
    minHeight: control.compactHeight, alignItems: "center", borderRadius: control.radius,
    color: control.ink, fontFamily: tokens.fontFamilyBase, fontSize: control.fontSize,
    [`& .${checkboxClassNames.indicator}`]: {
      width: "var(--dadam-checkbox-size)", height: "var(--dadam-checkbox-size)",
      borderRadius: "var(--dadam-checkbox-radius)", alignSelf: "center", margin: "7px 8px",
    },
    [`& .${checkboxClassNames.label}`]: {
      marginTop: 0, marginBottom: 0, paddingTop: "6px", paddingBottom: "6px",
      fontSize: "inherit", lineHeight: control.lineHeight, overflowWrap: "anywhere",
    },
    "&:has(:disabled)": { color: control.disabled, cursor: "not-allowed" },
    "@media (forced-colors: active)": { "&:has(:disabled)": { color: "GrayText" } },
  },
  checkboxTile: {
    width: "100%", maxWidth: "none", ...shorthands.border("1px", "solid", "transparent"),
    [`& .${checkboxClassNames.label}`]: { flexGrow: 1, minWidth: 0, alignSelf: "stretch", display: "flex", alignItems: "center" },
    ":hover": { backgroundColor: control.muted },
    "&:has(:checked), &:has(:indeterminate)": {
      backgroundColor: tokens.colorBrandBackground2, ...shorthands.borderColor(tokens.colorBrandStroke2),
    },
    "&:has(:disabled)": { backgroundColor: control.muted, ...shorthands.borderColor("transparent") },
    "@media (forced-colors: active)": {
      "&:has(:checked), &:has(:indeterminate)": { ...shorthands.borderColor("Highlight") },
    },
  },
});

export const DadamInput = forwardRef<HTMLInputElement, InputProps>(function DadamInput({ className, size = "medium", ...props }, ref) {
  const styles = useStyles();
  return <Input {...props} ref={ref} size={size} className={mergeClasses(styles.base, styles.field, styles.input, styles[size], className)} />;
});

export const DadamSelect = forwardRef<HTMLSelectElement, SelectProps>(function DadamSelect({ className, size = "medium", ...props }, ref) {
  const styles = useStyles();
  return <Select {...props} ref={ref} size={size} className={mergeClasses(styles.base, styles.field, styles.select, styles[size], className)} />;
});

export const DadamTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function DadamTextarea({ className, size = "medium", ...props }, ref) {
  const styles = useStyles();
  return <Textarea {...props} ref={ref} size={size} className={mergeClasses(styles.base, styles.field, styles.textarea, styles[size], className)} />;
});

export const DadamButton = forwardRef<ComponentRef<typeof Button>, ButtonProps>(function DadamButton({ className, size = "medium", ...props }, ref) {
  const styles = useStyles();
  const iconOnly = Boolean(props.icon && !props.children);
  return <Button {...props} ref={ref} size={size} className={mergeClasses(styles.base, styles.button, styles[size],
    iconOnly && styles.iconButton, iconOnly && size === "small" && styles.smallIconButton,
    iconOnly && size === "large" && styles.largeIconButton,
    props.shape === "circular" && styles.circularButton, props.shape === "square" && styles.squareButton, className)} />;
});

export type DadamCheckboxProps = CheckboxProps & { variant?: "plain" | "tile" };
export const DadamCheckbox = forwardRef<HTMLInputElement, DadamCheckboxProps>(function DadamCheckbox({ className, variant = "plain", ...props }, ref) {
  const styles = useStyles();
  return <Checkbox {...props} ref={ref} className={mergeClasses(styles.checkbox, variant === "tile" && styles.checkboxTile, className)} />;
});
