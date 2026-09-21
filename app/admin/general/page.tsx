"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Image as ImageIcon,
  Languages,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const languages = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
  { value: "zh", label: "중국어" },
];

export default function AdminGeneralPage() {
  const [appName, setAppName] = useState("DARUDA");
  const [faviconUrl, setFaviconUrl] = useState("/favicon.ico");

  const [favLanguages, setFavLanguages] = useState([
    { id: 1, from: "ko", to: "en" },
    { id: 2, from: "en", to: "ko" },
    { id: 3, from: "ko", to: "ja" },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (section: string) => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    toast.success(`${section} 설정이 저장되었습니다.`);
  };

  const updateFavLanguage = (id: number, field: "from" | "to", value: string) => {
    setFavLanguages((prev) =>
      prev.map((lang) => (lang.id === id ? { ...lang, [field]: value } : lang))
    );
  };

  const addFavLanguage = () => {
    if (favLanguages.length >= 3) return;
    const newId = Math.max(...favLanguages.map(l => l.id), 0) + 1;
    setFavLanguages([...favLanguages, { id: newId, from: "ko", to: "en" }]);
  };

  const removeFavLanguage = (id: number) => {
    setFavLanguages(favLanguages.filter(lang => lang.id !== id));
  };

  return (
    <PageContainer maxWidth="full" className="p-4 lg:p-5">
      <PageHeader
        title="일반 설정"
        description="다루다(DARUDA) 시스템의 기본 정보 및 번역 환경을 설정합니다."
        className="mb-4"
      />

      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        {/* Basic Settings Section */}
        <div className="space-y-4">
          <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 rounded-lg">
                  <Globe className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">기본 정보</h3>
                </div>
              </div>
              <Button
                onClick={() => handleSave("기본 정보")}
                disabled={isSaving}
                className="bg-sky-600 hover:bg-sky-700 text-white gap-2 h-8 rounded-lg shadow-sm px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">저장</span>
              </Button>
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              {/* App Name */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <Label htmlFor="app-name" className="text-xs font-bold text-slate-600">앱 이름</Label>
                <div className="md:col-span-3">
                  <Input
                    id="app-name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="앱 이름을 입력하세요"
                    className="max-w-md h-9 border-slate-200 focus:ring-sky-500 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Favicon */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                <Label className="text-xs font-bold text-slate-600 mt-2">앱 파비콘</Label>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group hover:border-sky-300 transition-colors cursor-pointer">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-sky-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={faviconUrl}
                        onChange={(e) => setFaviconUrl(e.target.value)}
                        placeholder="파비콘 URL을 입력하세요"
                        className="h-8 border-slate-200 focus:ring-sky-500 rounded-lg text-xs"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 rounded-md text-[10px] font-bold border-slate-200 px-2.5">파일 업로드</Button>
                        <Button variant="ghost" size="sm" className="h-7 rounded-md text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2.5">초기화</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Translation Settings Section */}
          <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <Languages className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">번역 환경 설정</h3>
                </div>
              </div>
              <Button
                onClick={() => handleSave("번역 환경")}
                className="bg-sky-600 hover:bg-sky-700 text-white gap-2 h-8 rounded-lg shadow-sm px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">저장</span>
              </Button>
            </div>

            <div className="p-4 lg:p-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="w-8 italic">순위</span>
                  <span className="flex-1 text-center">원본 언어</span>
                  <span className="w-10"></span>
                  <span className="flex-1 text-center">대상 언어</span>
                  <span className="w-8"></span>
                </div>

                {favLanguages.map((lang, index) => (
                  <div key={lang.id} className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 transition-all hover:border-sky-200 hover:bg-white group">
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm group-hover:border-sky-200 group-hover:text-sky-600 transition-all shrink-0">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <Select
                        value={lang.from}
                        onValueChange={(val) => updateFavLanguage(lang.id, "from", val)}
                      >
                        <SelectTrigger className="h-8 w-full bg-white border-slate-200 rounded-lg focus:ring-sky-500 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-center p-1 bg-sky-50 rounded-full shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    </div>

                    <div className="flex-1">
                      <Select
                        value={lang.to}
                        onValueChange={(val) => updateFavLanguage(lang.id, "to", val)}
                      >
                        <SelectTrigger className="h-8 w-full bg-white border-slate-200 rounded-lg focus:ring-sky-500 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      onClick={() => removeFavLanguage(lang.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {favLanguages.length < 3 && (
                  <Button
                    variant="outline"
                    onClick={addFavLanguage}
                    className="w-full border-dashed border-slate-200 text-slate-400 hover:border-sky-200 hover:text-sky-600 hover:bg-sky-50/50 h-10 rounded-xl gap-2 font-medium text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새로운 언어 조합 추가</span>
                  </Button>
                )}

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50/50 border border-sky-100 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-sky-700 leading-tight">
                    설정한 언어 상위 3개 조합은 번역 메인 페이지의 <span className="font-bold underline italic">자주 쓰는 언어</span> 섹션에 우선적으로 노출됩니다.
                    <br />최대 3개까지 설정 가능하며, 설정된 언어가 없는 경우 기본 설정이 적용됩니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
