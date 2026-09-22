"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Eye, FileUp, Sparkles, Trash2 } from "lucide-react";

import ProposalDocumentPreviewDialog from "@/components/proposals/review/ProposalDocumentPreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_PROPOSAL_REVIEW_CRITERIA } from "@/data/proposals/mock-data";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type {
  ProposalDepartment,
  ProposalDocument,
  ProposalProject,
  ProposalRegistrationDraft,
} from "@/types/proposals";

interface ProposalRegistrationViewProps {
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
}

type DraftError = Partial<Record<keyof ProposalRegistrationDraft | "primaryRfp", string>>;

const departments: Exclude<ProposalDepartment, "전체">[] = [
  "AI산업본부",
  "AI사업본부",
  "컨설팅본부",
  "교육사업본부",
  "생산성본부",
  "CX본부",
  "자격사업본부",
];

const initialDraft: ProposalRegistrationDraft = {
  title: "",
  agency: "",
  department: "AI사업본부",
  budget: 0,
  deadline: "",
  manager: "",
  summary: "",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ProposalRegistrationView({
  dispatch,
}: ProposalRegistrationViewProps): React.ReactElement {
  const [draft, setDraft] = useState(initialDraft);
  const [document, setDocument] = useState<ProposalDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<DraftError>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const agencyRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);
  const managerRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateDraft = <Key extends keyof ProposalRegistrationDraft>(
    key: Key,
    value: ProposalRegistrationDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const loadSample = () => {
    setDraft({
      title: "KPC Enterprise AI 플랫폼 구축",
      agency: "한국생산성본부",
      department: "AI사업본부",
      budget: 480_000_000,
      deadline: "2026-10-16",
      manager: "김세정",
      summary: "사내 지식과 업무 데이터를 연결하는 생성형 AI 업무 플랫폼 구축",
    });
    setDocument({
      id: "draft-sample-rfp",
      projectId: "draft",
      name: "KPC_Enterprise_AI_플랫폼_RFP.pdf",
      kind: "RFP",
      size: "4.8 MB",
      pageCount: 86,
      status: "업로드 완료",
      isPrimary: true,
    });
    setErrors({});
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: DraftError = {};
    if (!draft.title.trim()) nextErrors.title = "프로젝트명을 입력하세요.";
    if (!draft.agency.trim()) nextErrors.agency = "발주처를 입력하세요.";
    if (!draft.deadline) nextErrors.deadline = "마감일을 선택하세요.";
    if (!draft.manager.trim()) nextErrors.manager = "담당자를 입력하세요.";
    if (!document) nextErrors.primaryRfp = "주 RFP 문서를 선택하세요.";

    const firstError = Object.keys(nextErrors)[0] as keyof DraftError | undefined;
    if (firstError) {
      setErrors(nextErrors);
      const refs = {
        title: titleRef,
        agency: agencyRef,
        deadline: deadlineRef,
        manager: managerRef,
        primaryRfp: fileRef,
      };
      refs[firstError as keyof typeof refs]?.current?.focus();
      return;
    }

    const projectId = `project-${Date.now()}`;
    const pWin = Math.round(
      MOCK_PROPOSAL_REVIEW_CRITERIA.reduce((total, criterion) => total + criterion.score, 0),
    );
    const deadlineDate = new Date(`${draft.deadline}T00:00:00`);
    const dDay = Math.max(
      0,
      Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    const project: ProposalProject = {
      id: projectId,
      ...draft,
      title: draft.title.trim(),
      agency: draft.agency.trim(),
      manager: draft.manager.trim(),
      summary: draft.summary.trim(),
      stage: "검토 대기",
      dDay,
      teamMembers: [draft.manager.trim()],
      pWin,
      progress: 0,
      activeStep: "setup",
      workflowMode: "requirements",
      analysisStatus: "분석 전",
      lastModified: new Date().toLocaleString("ko-KR"),
      primaryRfpFileName: document!.name,
    };
    const projectDocument: ProposalDocument = {
      ...document!,
      id: `document-${projectId}`,
      projectId,
    };

    dispatch({ type: "add-project", project, documents: [projectDocument] });
    dispatch({ type: "navigate", view: "pipeline" });
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2 -ml-3" onClick={() => dispatch({ type: "navigate", view: "pipeline" })}>
              <ArrowLeft className="size-4" /> 제안 목록
            </Button>
            <h1 className="text-2xl font-bold text-[#202124]">새 프로젝트 등록</h1>
            <p className="mt-1 text-sm text-[#77787E]">RFP 기본 정보와 주 문서를 등록합니다.</p>
          </div>
          <Button variant="outline" onClick={loadSample}>
            <Sparkles className="size-4" /> 샘플 데이터 불러오기
          </Button>
        </header>

        <form className="mt-6 space-y-5 rounded-lg border bg-white p-5 lg:p-7" onSubmit={submit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="프로젝트명" error={errors.title} className="sm:col-span-2">
              <Input ref={titleRef} value={draft.title} aria-invalid={Boolean(errors.title)} onChange={(event) => updateDraft("title", event.target.value)} />
            </Field>
            <Field label="발주처" error={errors.agency}>
              <Input ref={agencyRef} value={draft.agency} aria-invalid={Boolean(errors.agency)} onChange={(event) => updateDraft("agency", event.target.value)} />
            </Field>
            <Field label="담당 본부">
              <Select value={draft.department} onValueChange={(value) => updateDraft("department", value as ProposalRegistrationDraft["department"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="사업 예산 (원)">
              <Input type="number" min={0} value={draft.budget || ""} onChange={(event) => updateDraft("budget", Number(event.target.value))} />
            </Field>
            <Field label="제안 마감일" error={errors.deadline}>
              <Input ref={deadlineRef} type="date" value={draft.deadline} aria-invalid={Boolean(errors.deadline)} onChange={(event) => updateDraft("deadline", event.target.value)} />
            </Field>
            <Field label="담당자" error={errors.manager}>
              <Input ref={managerRef} value={draft.manager} aria-invalid={Boolean(errors.manager)} onChange={(event) => updateDraft("manager", event.target.value)} />
            </Field>
            <Field label="사업 요약" className="sm:col-span-2">
              <Textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} />
            </Field>
          </div>

          <div>
            <Label htmlFor="primary-rfp">주 RFP 문서</Label>
            <input
              ref={fileRef}
              id="primary-rfp"
              type="file"
              accept=".pdf,.doc,.docx,.hwp"
              className="mt-2 block w-full rounded-md border bg-[#FAFAFB] p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#EEEFF1] file:px-3 file:py-2 file:font-medium"
              aria-invalid={Boolean(errors.primaryRfp)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setDocument({ id: "draft-rfp", projectId: "draft", name: file.name, kind: "RFP", size: formatFileSize(file.size), status: "업로드 완료", isPrimary: true });
                setErrors((current) => ({ ...current, primaryRfp: undefined }));
              }}
            />
            {errors.primaryRfp && <p className="mt-1 text-xs text-kpc-red">{errors.primaryRfp}</p>}
            {document && (
              <div className="mt-3 flex items-center justify-between rounded-md border bg-[#FAFAFB] px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{document.name}</p><p className="text-xs text-[#85868B]">{document.size} · 주 RFP</p></div>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" title="문서 미리보기" aria-label="문서 미리보기" onClick={() => setPreviewOpen(true)}><Eye className="size-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" title="문서 제거" aria-label="문서 제거" onClick={() => setDocument(null)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={() => dispatch({ type: "navigate", view: "pipeline" })}>취소</Button>
            <Button type="submit" className="bg-kpc-red text-white hover:bg-[#CA0010]"><FileUp className="size-4" /> 프로젝트 등록</Button>
          </div>
        </form>
      </div>
      <ProposalDocumentPreviewDialog document={document} open={previewOpen} onOpenChange={setPreviewOpen} />
    </section>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }): React.ReactElement {
  return <div className={className}><Label>{label}</Label><div className="mt-2">{children}</div>{error && <p className="mt-1 text-xs text-kpc-red">{error}</p>}</div>;
}