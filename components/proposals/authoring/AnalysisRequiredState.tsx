import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AnalysisRequiredStateProps {
  projectName: string;
  onOpenSetup(): void;
}

export default function AnalysisRequiredState({ projectName, onOpenSetup }: AnalysisRequiredStateProps): React.ReactElement {
  return <section className="flex min-h-full items-center justify-center bg-[#F8F9FA] p-6"><div className="max-w-md text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FFF1F2] text-kpc-red"><LockKeyhole className="size-5" /></span><h1 className="mt-4 text-lg font-bold">AI 분석이 필요합니다.</h1><p className="mt-2 text-sm leading-6 text-[#74757B]">{projectName}의 RFP 분석을 완료하면 이 단계의 내용을 확인할 수 있습니다.</p><Button className="mt-5 bg-kpc-red text-white hover:bg-[#CA0010]" onClick={onOpenSetup}>01 문서 설정으로 이동</Button></div></section>;
}