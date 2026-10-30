"use client";

import { FluentProvider, makeStyles, tokens } from "@fluentui/react-components";
import { dadamTheme, dadamUi } from "@/lib/ui/dadam-theme";

const useStyles = makeStyles({
  root: {
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: dadamUi.bodySize,
    lineHeight: dadamUi.bodyLineHeight,
    fontWeight: 400,
  },
});

export interface DadamThemeScopeProps { children: React.ReactNode }

export default function DadamThemeScope({ children }: DadamThemeScopeProps): React.ReactElement {
  const styles = useStyles();
  return (
    <FluentProvider
      theme={dadamTheme}
      applyStylesToPortals
      className={styles.root}
      // Portal mounts inherit classes, so keep the layout override inline.
      style={{ display: "contents" }}
      data-dadam-theme="basic"
    >
      {children}
    </FluentProvider>
  );
}
