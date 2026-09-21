"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Languages,
  Copy,
  Check,
  ArrowRightLeft,
  Sparkles,
  Loader2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TextTranslationPage() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      toast.error("번역할 텍스트를 입력해주세요.");
      return;
    }

    setIsTranslating(true);
    // Mock translation delay
    setTimeout(() => {
      setTargetText(`[번역 결과] ${sourceText}\n\n이것은 AI에 의해 번역된 샘플 텍스트입니다. 웅장하고 아름다운 번역 결과가 여기에 표시됩니다.`);
      setIsTranslating(false);
      toast.success("번역이 완료되었습니다!");
    }, 2000);
  };

  const handleCopy = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText);
    setIsCopied(true);
    toast.success("클립보드에 복사되었습니다.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    setSourceText("");
    setTargetText("");
  };

  const swapLanguages = () => {
    if (sourceLang === "auto") return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="텍스트 번역"
        description="텍스트를 입력하여 번역하세요. 입력된 텍스트는 자동 언어 감지됩니다."
      />

      <div className="flex flex-col lg:flex-1 space-y-4 lg:min-h-0 mt-6 md:mt-8">
        {/* Languages Toolbar */}
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-2">
          <Select value={sourceLang} onValueChange={setSourceLang}>
            <SelectTrigger className="w-[140px] md:w-[180px] bg-white border-sky-100 shadow-sm rounded-xl h-11 font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-sky-500" />
                <SelectValue placeholder="출발 언어" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">언어 감지</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="en">영어</SelectItem>
              <SelectItem value="ja">일본어</SelectItem>
              <SelectItem value="zh">중국어</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={swapLanguages}
            disabled={sourceLang === "auto"}
            className="rounded-full hover:bg-sky-50 text-slate-400 hover:text-sky-600 h-10 w-10 shrink-0"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </Button>

          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[140px] md:w-[180px] bg-white border-sky-100 shadow-sm rounded-xl h-11 font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-sky-500" />
                <SelectValue placeholder="도착 언어" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="en">영어</SelectItem>
              <SelectItem value="ja">일본어</SelectItem>
              <SelectItem value="zh">중국어</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Translation Area */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 lg:min-h-0">
          {/* Input Card */}
          <Card className="flex-1 border-slate-100 shadow-md rounded-2xl overflow-hidden flex flex-col bg-white">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Text</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 gap-1.5 px-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">지우기</span>
              </Button>
            </div>
            <div className="relative flex-1 p-4 md:p-6 flex flex-col group">
              <Textarea
                placeholder="번역할 내용을 입력하세요..."
                className="flex-1 border-0 shadow-none focus-visible:ring-0 resize-none p-0 text-lg md:text-xl placeholder:text-slate-200 text-slate-700"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-medium">
                  {sourceText.length} / 5,000자
                </span>
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating || !sourceText.trim()}
                  className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-sky-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      번역 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      번역하기
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Output Card */}
          <Card className="flex-1 border-slate-100 shadow-md rounded-2xl overflow-hidden flex flex-col bg-white relative">
            {/* Translating Overlay Animation */}
            {isTranslating && (
              <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-scan" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
                </div>
              </div>
            )}

            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Translation Result</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!targetText || isTranslating}
                className={cn(
                  "h-8 gap-2 px-3 border-slate-200 rounded-lg transition-all",
                  isCopied ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "hover:border-sky-200 hover:bg-sky-50 text-slate-500"
                )}
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-bold">{isCopied ? "복사완료" : "Copy"}</span>
              </Button>
            </div>

            <div className="flex-1 p-4 md:p-6 bg-slate-50/10 whitespace-pre-wrap">
              {!targetText && !isTranslating ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 opacity-50">
                  <Languages className="w-12 h-12" />
                  <p className="text-sm font-medium italic">번역 결과가 여기에 표시됩니다.</p>
                </div>
              ) : (
                <div className={cn(
                  "text-lg md:text-xl text-slate-700 leading-relaxed transition-opacity duration-300",
                  isTranslating ? "opacity-30" : "opacity-100"
                )}>
                  {targetText}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .animate-scan {
          animation: scan linear infinite;
        }
      `}</style>
    </PageContainer>
  );
}
