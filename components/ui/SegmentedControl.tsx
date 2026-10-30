"use client";

import { makeStyles, tokens, mergeClasses, Radio, RadioGroup, radioClassNames, shorthands } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  variant?: "segmented" | "chips";
}

const useStyles = makeStyles({
  root: {
    display: "inline-flex",
    minWidth: 0,
    padding: "3px",
    gap: "2px",
    borderRadius: dadamUi.cardRadius,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  fullWidth: { display: "flex", width: "100%" },
  option: {
    display: "flex",
    minWidth: 0,
    borderRadius: dadamUi.controlRadius,
    ":focus-within": { outline: dadamUi.focusRing, outlineOffset: "1px" },
    "@media (forced-colors: active)": {
      ":focus-within": { outlineColor: "Highlight" },
    },
  },
  stretch: { flex: 1 },
  input: {
    width: "100%",
    height: "100%",
    ":enabled:checked": {
      [`& ~ .${radioClassNames.label}`]: { color: tokens.colorNeutralForeground1 },
    },
    ":enabled:not(:checked)": {
      [`& ~ .${radioClassNames.label}`]: { color: tokens.colorNeutralForeground3 },
    },
  },
  indicator: { display: "none" },
  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: dadamUi.smallControlHeight,
    height: "auto",
    minWidth: 0,
    margin: 0,
    padding: "4px 8px",
    borderRadius: dadamUi.controlRadius,
    backgroundColor: "transparent",
    fontFamily: tokens.fontFamilyBase,
    fontSize: dadamUi.metaSize,
    fontWeight: 500,
    lineHeight: "16px",
    whiteSpace: "normal",
    textAlign: "center",
  },
  selected: {
    backgroundColor: tokens.colorNeutralBackground1,
    fontWeight: 700,
    boxShadow: tokens.shadow2,
    "@media (forced-colors: active)": { outline: "1px solid Highlight" },
  },
  chips: { padding: 0, gap: "6px", flexWrap: "wrap", backgroundColor: "transparent", borderRadius: 0 },
  chipOption: { borderRadius: "14px", minHeight: dadamUi.smallControlHeight, height: "auto" },
  chipInput: {
    ":enabled:checked": {
      ["& ~ ." + radioClassNames.label]: { color: tokens.colorBrandForeground2 },
    },
    ":enabled:not(:checked)": {
      ["& ~ ." + radioClassNames.label]: { color: tokens.colorNeutralForeground2 },
    },
  },
  chipLabel: {
    minHeight: dadamUi.smallControlHeight, height: "auto", padding: "0 10px", border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: "14px", backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground2, fontWeight: 500,
    boxSizing: "border-box",
  },
  chipSelected: { ...shorthands.borderColor(tokens.colorBrandStroke1), backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontWeight: 700, boxShadow: "none" },
});

export default function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
  fullWidth = false,
  className,
  variant = "segmented",
}: SegmentedControlProps<T>): React.ReactElement {
  const styles = useStyles();

  return (
    <RadioGroup
      aria-label={ariaLabel}
      layout="horizontal"
      value={value}
      disabled={disabled}
      className={mergeClasses(styles.root, variant === "chips" && styles.chips, fullWidth && styles.fullWidth, className)}
      onChange={(_, data) => {
        const option = options.find((item) => item.value === data.value);
        if (!disabled && option && !option.disabled) onChange(option.value);
      }}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          value={option.value}
          disabled={disabled || option.disabled}
          className={mergeClasses(styles.option, variant === "chips" && styles.chipOption, fullWidth && styles.stretch)}
          input={{ className: mergeClasses(styles.input, variant === "chips" && styles.chipInput) }}
          indicator={{ className: styles.indicator }}
          label={{
            children: option.label,
            className: mergeClasses(
              styles.label, value === option.value && styles.selected,
              variant === "chips" && styles.chipLabel,
              variant === "chips" && value === option.value && styles.chipSelected,
            ),
          }}
        />
      ))}
    </RadioGroup>
  );
}
