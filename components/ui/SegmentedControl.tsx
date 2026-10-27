"use client";

import { makeStyles, mergeClasses, Radio, RadioGroup, radioClassNames, shorthands } from "@fluentui/react-components";

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
    borderRadius: "9px",
    backgroundColor: "#f0f1f3",
  },
  fullWidth: { display: "flex", width: "100%" },
  option: {
    display: "flex",
    minWidth: 0,
    borderRadius: "7px",
    ":focus-within": { outline: "2px solid #d7192f", outlineOffset: "1px" },
    "@media (forced-colors: active)": {
      ":focus-within": { outlineColor: "Highlight" },
    },
  },
  stretch: { flex: 1 },
  input: {
    width: "100%",
    height: "100%",
    ":enabled:checked": {
      [`& ~ .${radioClassNames.label}`]: { color: "#161616" },
    },
    ":enabled:not(:checked)": {
      [`& ~ .${radioClassNames.label}`]: { color: "#74747d" },
    },
  },
  indicator: { display: "none" },
  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "26px",
    minWidth: 0,
    margin: 0,
    padding: "0 10px",
    borderRadius: "7px",
    backgroundColor: "transparent",
    fontFamily: "inherit",
    fontSize: "11.5px",
    fontWeight: 700,
    lineHeight: "16px",
    whiteSpace: "nowrap",
  },
  selected: {
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,.08)",
    "@media (forced-colors: active)": { outline: "1px solid Highlight" },
  },
  chips: { padding: 0, gap: "6px", flexWrap: "wrap", backgroundColor: "transparent", borderRadius: 0 },
  chipOption: { borderRadius: "14px", height: "28px" },
  chipInput: {
    ":enabled:checked": {
      ["& ~ ." + radioClassNames.label]: { color: "#c91c2b" },
    },
    ":enabled:not(:checked)": {
      ["& ~ ." + radioClassNames.label]: { color: "#55585f" },
    },
  },
  chipLabel: {
    height: "28px", padding: "0 10px", border: "1px solid #dddde2",
    borderRadius: "14px", backgroundColor: "#fff", color: "#55585f", fontWeight: 650,
    boxSizing: "border-box",
  },
  chipSelected: { ...shorthands.borderColor("#d7192f"), backgroundColor: "#fff8f9", color: "#c91c2b", fontWeight: 800, boxShadow: "none" },
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
