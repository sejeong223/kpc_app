import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { RaccoonHero } from "@/components/translation/RaccoonHero";
import { LanguageSelector } from "@/components/translation/LanguageSelector";
import { FileUploader } from "@/components/translation/FileUploader";
import { HistoryTable } from "@/components/translation/HistoryTable";
import { Card } from "@/components/ui/card";

export default function DocumentTranslationPage() {
  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="문서 파일 번역"
        description="번역할 파일을 업로드하고 AI와 함께 고품질 번역을 시작하세요."
      />

      <div className="flex flex-col lg:flex-1 space-y-3 lg:space-y-4 lg:min-h-0">
        {/* Top Section: Hero and Controls */}
        <div className="flex flex-col space-y-3 lg:space-y-4 shrink-0">
          {/* Row 1: Controls - Specific 7.5:4.5 Ratio on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-[7.5fr_4.5fr] gap-3 lg:gap-4 lg:items-stretch">
            {/* Language Selection - 7.5 Ratio */}
            <Card className="p-2 md:p-2 xl:p-3 border-slate-100 shadow-sm rounded-xl bg-white lg:h-full flex flex-col justify-center">
              {/* Row 1: AI Advisor Hero */}
              <RaccoonHero />
              {/* Row 2: Language Selector */}
              <LanguageSelector />
            </Card>

            {/* File Upload Box - 4.5 Ratio */}
            <Card className="p-2.5 md:p-3 xl:p-4 border-slate-100 shadow-sm rounded-xl bg-white lg:h-full flex flex-col items-stretch">
              <FileUploader />
            </Card>
          </div>
        </div>

        {/* Bottom Row: History Table - Full Width & Prominent */}
        <div className="w-full lg:flex-1 lg:min-h-0 flex flex-col">
          <Card className="p-3 lg:p-6 gap-3 border-slate-100 shadow-sm rounded-2xl bg-white flex flex-col min-h-[500px] lg:min-h-0 lg:h-full overflow-hidden">
            <HistoryTable showPagination={false} maxItems={10} showFilter={false} showViewAll={true} />
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
