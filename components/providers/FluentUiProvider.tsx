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
  colorBrandBackground: "#d7192f",
  colorBrandBackgroundHover: "#c31429",
  colorBrandBackgroundPressed: "#b01225",
  colorBrandForeground1: "#cc1930",
  colorBrandForeground2: "#c91c2b",
  colorBrandBackground2: "#fff0f2",
  colorBrandBackground2Hover: "#ffe5e9",
  colorBrandStroke1: "#d7192f",
  colorNeutralBackground2: "#fafafa",
  colorNeutralStroke2: "#e6e7eb",
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
