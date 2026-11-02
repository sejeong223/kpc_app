"use client";

import { Button, ProgressBar } from "@fluentui/react-components";
import { ArrowUpload20Regular, Sparkle20Regular } from "@fluentui/react-icons";
import { useId, useRef, useState } from "react";

import type { RfpFormPhase } from "@/lib/rfp/form";

interface RfpUploadZoneProps {
  phase: RfpFormPhase;
  error: string | null;
  onFiles(files: File[]): void; // 크기 검사는 reducer가 담당
  onSample(): void;
  onRestart(): void;
}

const COPY: Record<RfpFormPhase, { title: string; hint: string }> = {
  idle: { title: "RFP 파일을 놓으면 사업개요가 자동으로 채워집니다", hint: "PDF · HWP · DOCX · 파일당 50MB · 대표 RFP 300쪽 이하 권장" },
  analyzing: { title: "RFP를 분석하고 있어요…", hint: "사업명·발주처·예산·기간·마감일을 찾아 입력합니다" },
  extracted: { title: "AI가 사업개요를 채웠어요", hint: "강조 표시된 칸은 AI가 채운 값입니다. 원문 페이지와 다르면 바로 고치세요." },
};

export default function RfpUploadZone({ phase, error, onFiles, onSample, onRestart }: RfpUploadZoneProps): React.ReactElement {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = phase === "analyzing";
  const copy = COPY[phase];
  const accept = (files: FileList | null) => { if (!busy && files?.length) onFiles([...files]); };

  return <section aria-label="RFP 파일 업로드" data-rfp-dropzone data-over={over ? "true" : undefined}
    onDragOver={(event) => { event.preventDefault(); if (!busy) setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={(event) => { event.preventDefault(); setOver(false); accept(event.dataTransfer.files); }}
    className={"tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-section-gap) tw:rounded-lg tw:border tw:border-dashed tw:p-(--layout-card-inset) "
      + (over ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-(--kpc-line-strong) tw:bg-(--kpc-card)")}>
    <span aria-hidden="true" className="tw:flex tw:size-10 tw:flex-none tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--kpc-brand-soft) tw:text-(--kpc-brand)">
      {phase === "extracted" ? <Sparkle20Regular /> : <ArrowUpload20Regular />}
    </span>
    <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-(--layout-inline-gap)">
      <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{copy.title}</h2>
      <p className="tw:m-0 tw:text-[11px] tw:text-(--kpc-muted)">{copy.hint}</p>
      {busy && <ProgressBar aria-label="RFP 분석 진행" thickness="medium" />}
    </div>
    <div className="tw:flex tw:flex-wrap tw:gap-(--layout-control-gap)">
      {phase === "extracted"
        ? <Button onClick={onRestart}>다시 하기</Button>
        : <>
          <Button icon={<ArrowUpload20Regular />} disabled={busy} onClick={() => input.current?.click()}>파일 선택</Button>
          <Button appearance="primary" icon={<Sparkle20Regular />} disabled={busy} onClick={onSample}>샘플 RFP로 체험</Button>
        </>}
    </div>
    <input ref={input} id={inputId} type="file" multiple hidden accept=".pdf,.hwp,.hwpx,.doc,.docx" disabled={busy}
      onChange={(event) => { accept(event.currentTarget.files); event.currentTarget.value = ""; }} />
    {error && <p role="alert" className="tw:m-0 tw:w-full tw:text-[12px] tw:text-(--kpc-danger)">{error}</p>}
  </section>;
}
