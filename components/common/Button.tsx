"use client";

import type { ComponentPropsWithRef, ReactElement } from "react";

import { DADAM_BUTTON_STYLE } from "./button-theme";
import styles from "./Button.module.css";

export type ButtonProps = ComponentPropsWithRef<"button">;

export default function Button({
  type = "button",
  className,
  style,
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      {...props}
      type={type}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={style ? { ...DADAM_BUTTON_STYLE, ...style } : DADAM_BUTTON_STYLE}
      data-common-button=""
    />
  );
}
