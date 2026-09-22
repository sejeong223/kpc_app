import { FileText } from "lucide-react";

interface ProposalPlaceholderProps {
  title: string;
  description?: string;
}

export default function ProposalPlaceholder({
  title,
  description = "다음 Task에서 구현 예정입니다.",
}: ProposalPlaceholderProps): React.ReactElement {
  return (
    <section className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-2xl border border-black/8 bg-white px-8 py-12 text-center shadow-[0_12px_40px_rgba(20,20,20,0.05)]">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#F7F7F8] text-[#6B6B70]">
          <FileText className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-[#1F1F22]">{title}</h1>
        <p className="mt-2 text-sm text-[#7B7B80]">{description}</p>
      </div>
    </section>
  );
}
