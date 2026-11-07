"use client";

import {
  FluentProvider,
  SSRProvider,
} from "@fluentui/react-components";
import { dadamTheme } from "@/lib/ui/dadam-theme";
import {
  createDOMRenderer,
  RendererProvider,
  renderToStyleElements,
} from "@griffel/react";
import { useServerInsertedHTML } from "next/navigation";
import { useRef, useState } from "react";

interface FluentUiProviderProps {
  children: React.ReactNode;
}

export default function FluentUiProvider({
  children,
}: FluentUiProviderProps): React.ReactElement {
  const [renderer] = useState(() => createDOMRenderer());
  const didFlush = useRef(false);

  useServerInsertedHTML(() => {
    // 반복 flush 시 오래된 스타일이 클라이언트의 최신 스타일을 덮지 않도록 한다.
    if (didFlush.current) return null;
    didFlush.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider
          theme={dadamTheme}
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
      </SSRProvider>
    </RendererProvider>
  );
}
