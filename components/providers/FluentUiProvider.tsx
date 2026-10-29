"use client";

import {
  FluentProvider,
  type Theme,
  webLightTheme,
} from "@fluentui/react-components";
import {
  createDOMRenderer,
  RendererProvider,
  renderToStyleElements,
} from "@griffel/react";
import { useServerInsertedHTML } from "next/navigation";
import { useRef, useState } from "react";

const workspaceTheme: Theme = {
  ...webLightTheme,
  colorBrandBackground: "var(--kpc-brand)",
  colorBrandBackgroundHover: "var(--kpc-brand-hover)",
  colorBrandBackgroundPressed: "var(--kpc-brand-pressed)",
  colorBrandForeground1: "var(--kpc-brand-foreground)",
  colorBrandForeground2: "var(--kpc-brand-ink)",
  colorBrandBackground2: "var(--kpc-brand-soft)",
  colorBrandBackground2Hover: "var(--kpc-brand-soft-hover)",
  colorBrandStroke1: "var(--kpc-brand)",
  colorNeutralBackground2: "var(--kpc-neutral-subtle)",
  colorNeutralStroke2: "var(--kpc-line)",
};

interface FluentUiProviderProps {
  children: React.ReactNode;
}

export default function FluentUiProvider({
  children,
}: FluentUiProviderProps): React.ReactElement {
  const [renderer] = useState(() => createDOMRenderer());
  const didFlush = useRef(false);

  useServerInsertedHTML(() => {
    // App Router can flush repeatedly. Re-emitting the full sheet leaves stale
    // body styles that override Griffel's later client-side updates.
    if (didFlush.current) return null;
    didFlush.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <FluentProvider
        theme={workspaceTheme}
        style={{
          minHeight: "100svh",
          backgroundColor: "transparent",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          color: "inherit",
        }}
      >
        {children}
      </FluentProvider>
    </RendererProvider>
  );
}
