import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryTable } from "@/components/translation/HistoryTable";
import { Card } from "@/components/ui/card";

export default function TranslationHistoryPage() {
  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="번역 기록 조회"
        description="과거 번역 내역을 확인하고 관리하세요."
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <Card className="p-3 lg:p-6 gap-3 border-slate-100 shadow-sm rounded-2xl bg-white flex flex-col min-h-[500px] lg:min-h-0 lg:h-full overflow-hidden">
          <HistoryTable title="전체 번역 기록" />
        </Card>
      </div>
    </PageContainer>
  );
}
