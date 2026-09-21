"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ArrowRight, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "../ui/separator";

const languageCombos = [
  { id: "ko-en", from: "한국어", to: "영어", fromCode: "ko", toCode: "en" },
  { id: "en-ko", from: "영어", to: "한국어", fromCode: "en", toCode: "ko" },
  { id: "ko-ja", from: "한국어", to: "일본어", fromCode: "ko", toCode: "ja" },
  { id: "ko-zh", from: "한국어", to: "중국어", fromCode: "ko", toCode: "zh" },
];

export function LanguageSelector() {
  const [selectedCombo, setSelectedCombo] = useState("ko-en");
  const [sourceLang, setSourceLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("en");
  const [isManualMode, setIsManualMode] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* Frequently Used Section */}
      <div className="flex flex-col space-y-1.5 shrink-0 ">
        <div className="flex items-center gap-1.5 ml-0.5">
          <Languages className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">자주 쓰는 언어</span>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {languageCombos.map((combo) => (
            <Button
              key={combo.id}
              variant={!isManualMode && selectedCombo === combo.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsManualMode(false);
                setSelectedCombo(combo.id);
                setSourceLang(combo.fromCode);
                setTargetLang(combo.toCode);
              }}
              className={cn(
                "rounded-full px-3 py-0 h-6 xl:h-7 text-[10px] xl:text-xs transition-colors border-sky-100/50 border",
                !isManualMode && selectedCombo === combo.id
                  ? "bg-sky-600 hover:bg-sky-700 shadow-sm border-transparent"
                  : "border-sky-100/50 text-slate-600 hover:bg-sky-50 bg-white"
              )}
            >
              {combo.from} <ArrowRight className="mx-1 w-2.5 h-2.5 opacity-50" /> {combo.to}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="hidden lg:block h-10 bg-sky-100" />

      {/* Manual Selection Mode Gated by Switch */}
      <div className="flex-1 flex flex-row space-y-1.5 items-start gap-8">
        <div className="flex items-center gap-2 ml-0.5">
          <span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">직접 선택</span>
          <Switch
            id="manual-mode"
            checked={isManualMode}
            onCheckedChange={setIsManualMode}
          />
        </div>

        <div className={cn(
          "flex items-center gap-2 xl:gap-3 p-1.5 rounded-lg border min-h-[58px] xl:min-h-[64px] w-full",
          isManualMode
            ? "border-slate-200 bg-white shadow-sm"
            : "border-slate-100/50 bg-slate-50/50 opacity-60"
        )}>
          <div className="flex-1 flex flex-col space-y-0.5 min-w-0 w-full">
            <label className="text-[9px] xl:text-[10px] font-bold text-slate-400 ml-0.5 truncate">원본</label>
            <Select
              disabled={!isManualMode}
              value={sourceLang}
              onValueChange={(val) => {
                setSourceLang(val);
                setSelectedCombo("");
              }}
            >
              <SelectTrigger className="h-6 w-full xl:h-7 bg-white border-slate-200 rounded-md focus:ring-sky-500 text-[10px] xl:text-xs text-slate-700 px-2 shadow-sm">
                <SelectValue placeholder="원본" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">영어</SelectItem>
                <SelectItem value="ja">일본어</SelectItem>
                <SelectItem value="zh">중국어</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="self-end pb-1.5">
            <ArrowRight className="text-slate-300 w-3 h-3" />
          </div>

          <div className="flex-1 flex flex-col space-y-0.5 min-w-0 w-full">
            <label className="text-[9px] xl:text-[10px] font-bold text-slate-400 ml-0.5 truncate">번역</label>
            <Select
              disabled={!isManualMode}
              value={targetLang}
              onValueChange={(val) => {
                setTargetLang(val);
                setSelectedCombo("");
              }}
            >
              <SelectTrigger className="h-6 w-full xl:h-7 bg-white border-slate-200 rounded-md focus:ring-sky-500 text-[10px] xl:text-xs text-slate-700 px-2 shadow-sm">
                <SelectValue placeholder="번역" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">영어</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="ja">일본어</SelectItem>
                <SelectItem value="zh">중국어</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
