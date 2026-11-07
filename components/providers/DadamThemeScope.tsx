"use client";

import { FluentProvider, makeStyles, tokens } from "@fluentui/react-components";
import { DADAM_FONT_FAMILY, dadamTheme, dadamUi } from "@/lib/ui/dadam-theme";

const useStyles = makeStyles({
  root: {
    // Tailwind의 font-sans를 쓰는 보관 초안·출처 미리보기도 같은 글꼴을 사용한다.
    "--tw-font-sans": DADAM_FONT_FAMILY,
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
