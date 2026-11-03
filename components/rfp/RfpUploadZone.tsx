"use client";

import { makeStyles, ProgressBar, progressBarClassNames } from "@fluentui/react-components";
import { ArrowUpload16Regular, ArrowUpload24Regular, Checkmark24Regular, Sparkle16Regular } from "@fluentui/react-icons";
import { useId, useRef, useState } from "react";

import Button from "@/components/common/Button";
import type { RfpFormPhase } from "@/lib/rfp/form";

interface RfpUploadZoneProps {
  phase: RfpFormPhase;
  onFiles(files: File[]): void; // 크기 검사는 reducer가 담당, 거절 문구는 호출부 알림으로 표시
  onSample(): void;
  onRestart(): void;
}

const COPY: Record<RfpFormPhase, { title: string; hint: string }> = {
  idle: { title: "RFP 파일을 여기에 놓으면 사업개요가 자동으로 채워집니다", hint: "PDF · HWP · DOCX · 파일당 50MB · 대표 RFP 300쪽 이하 권장" },
  analyzing: { title: "RFP를 분석하고 있어요…", hint: "사업명·발주처·예산·기간·마감일을 찾아 입력합니다" },
  extracted: { title: "AI가 사업개요를 채웠어요", hint: "노란색 칸은 AI가 채운 값입니다. 원문 페이지와 다르면 바로 고치세요." },
};

// 레퍼런스 4px 진행바. Fluent 기본 두께·색을 덮어쓴다.
const useStyles = makeStyles({
  bar: {
    height: "4px", borderRadius: "2px", backgroundColor: "#eef0f2",
    [`& .${progressBarClassNames.bar}`]: { height: "4px", borderRadius: "2px", backgroundColor: "var(--kpc-brand)" },
  },
});

export default function RfpUploadZone({ phase, onFiles, onSample, onRestart }: RfpUploadZoneProps): React.ReactElement {
  const styles = useStyles();
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
    className={"tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-4 tw:rounded-[14px] tw:border-[1.5px] tw:border-dashed tw:p-[22px] tw:min-[761px]:flex-nowrap "
      + (over ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-[#d3d5db] tw:bg-(--kpc-card)")}>
    <span aria-hidden="true" className="tw:flex tw:size-[46px] tw:flex-none tw:items-center tw:justify-center tw:rounded-[12px] tw:bg-(--kpc-brand-soft) tw:text-(--kpc-brand)">
      {phase === "extracted" ? <Checkmark24Regular style={{ width: 22, height: 22 }} /> : <ArrowUpload24Regular style={{ width: 22, height: 22 }} />}
    </span>
    <div className="tw:min-w-0 tw:flex-1">
      <h2 className="tw:m-0 tw:text-[12px] tw:font-extrabold tw:text-(--kpc-ink)">{copy.title}</h2>
      <p className={"tw:text-[11px] tw:text-(--kpc-muted) " + (busy ? "tw:mx-0 tw:mt-1 tw:mb-2" : "tw:mx-0 tw:mt-[3px] tw:mb-0")}>{copy.hint}</p>
      {busy && <ProgressBar aria-label="RFP 분석 진행" className={styles.bar} />}
    </div>
    <div className="tw:flex tw:flex-none tw:flex-wrap tw:gap-2">
      {phase === "extracted"
        ? <Button className="tw:h-(--dadam-control-height-compact) tw:text-[12px]" onClick={onRestart}>다시 하기</Button>
        : <>
          <Button disabled={busy} onClick={() => input.current?.click()}><ArrowUpload16Regular aria-hidden="true" />파일 선택</Button>
          <Button className="primary" disabled={busy} onClick={onSample}><Sparkle16Regular aria-hidden="true" />샘플 RFP로 체험</Button>
        </>}
    </div>
    <input ref={input} id={inputId} type="file" multiple hidden accept=".pdf,.hwp,.hwpx,.doc,.docx" disabled={busy}
      onChange={(event) => { accept(event.currentTarget.files); event.currentTarget.value = ""; }} />
  </section>;
}
