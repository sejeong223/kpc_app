"use client";
import type { CSSProperties } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import { useProductionPanels } from "@/hooks/workspace/use-production-panels";
export default function ProductionPanels({
  namespace,
  left,
  center,
  right,
}: {
  namespace: string;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  const { state: s, update, resize, reset } = useProductionPanels(namespace);
  const splitter = (side: "left" | "right") => (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={(side === "left" ? "슬라이드" : "출처") + " 패널 크기"}
      aria-valuenow={side === "left" ? s.leftWidth : s.rightWidth}
      aria-valuemin={side === "left" ? 200 : 280}
      aria-valuemax={side === "left" ? 320 : 420}
      className="tw:hidden tw:w-2 tw:cursor-col-resize tw:rounded tw:bg-(--kpc-line) tw:@min-[1180px]:block tw:focus-visible:outline-2"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          resize(
            side,
            (e.key === "ArrowRight" ? 10 : -10) * (side === "left" ? 1 : -1),
          );
        }
        if (e.key === "Home") reset();
      }}
      onPointerDown={(e) => {
        const node = e.currentTarget;
        node.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          resize(side, e.movementX * (side === "left" ? 1 : -1));
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
    />
  );
  return (
    <div className="tw:@container">
      <div className="tw:flex tw:flex-wrap tw:gap-1">
        <div className="tw:flex tw:gap-1 tw:@min-[761px]:hidden">
          {(["slides", "editor", "sources"] as const).map((panel, i) => (
            <DadamButton
              key={panel}
              aria-pressed={s.mobilePanel === panel}
              onClick={() => update({ mobilePanel: panel })}
            >
              {["슬라이드", "편집", "출처·의견"][i]}
            </DadamButton>
          ))}
        </div>
        <div className="tw:hidden tw:gap-1 tw:@min-[761px]:flex">
          <DadamButton
            aria-pressed={s.leftOpen}
            onClick={() => update({ leftOpen: !s.leftOpen })}
          >
            슬라이드 목록
          </DadamButton>
          <DadamButton
            aria-pressed={s.rightOpen}
            onClick={() => update({ rightOpen: !s.rightOpen })}
          >
            출처·의견
          </DadamButton>
          <DadamButton onClick={reset}>기본 배치</DadamButton>
        </div>
      </div>
      <div
        className="tw:relative tw:flex tw:min-w-0 tw:items-start tw:gap-(--layout-section-gap)"
        style={
          {
            "--production-left": s.leftWidth + "px",
            "--production-right": s.rightWidth + "px",
          } as CSSProperties
        }
      >
        <aside
          aria-label="슬라이드 목록"
          className={
            (s.mobilePanel === "slides" ? "tw:block" : "tw:hidden") +
            " " +
            (s.leftOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") +
            " tw:w-full tw:min-w-0 tw:shrink-0 tw:@min-[761px]:w-(--production-left)"
          }
        >
          {left}
        </aside>
        {s.leftOpen && splitter("left")}
        <section
          aria-label="슬라이드 편집"
          className={
            (s.mobilePanel === "editor" ? "tw:block" : "tw:hidden") +
            " tw:min-w-0 tw:flex-1 tw:@min-[761px]:block tw:@min-[1180px]:min-w-[420px]"
          }
        >
          {center}
        </section>
        {s.rightOpen && splitter("right")}
        <aside
          aria-label="출처와 의견"
          className={
            (s.mobilePanel === "sources" ? "tw:block" : "tw:hidden") +
            " " +
            (s.rightOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") +
            " tw:w-full tw:min-w-0 tw:shrink-0 tw:@min-[761px]:absolute tw:@min-[761px]:right-0 tw:@min-[761px]:top-0 tw:@min-[761px]:z-10 tw:@min-[761px]:max-h-[70vh] tw:@min-[761px]:w-(--production-right) tw:@min-[761px]:overflow-auto tw:@min-[761px]:shadow-xl tw:@min-[1180px]:static tw:@min-[1180px]:max-h-none tw:@min-[1180px]:shadow-none"
          }
        >
          {right}
        </aside>
      </div>
    </div>
  );
}
