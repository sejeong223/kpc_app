import React from 'react';
import { ArrowRight, Lock, Sparkles } from "lucide-react";

export interface RfpAnalysisRequiredStateProps {
  stepTitle?: string;
  stepNumber?: number | string;
  onNavigateToStep1: () => void;
  projectName?: string;
}

export const RfpAnalysisRequiredState: React.FC<RfpAnalysisRequiredStateProps> = ({
  stepTitle = '해당 단계',
  stepNumber,
  onNavigateToStep1,
  projectName
}) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F8F9FA] p-6 min-h-[500px]">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Top Icon Badge */}
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
            <Lock className="w-8 h-8 text-neutral-500 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E60012] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
            !
          </div>
        </div>

        {/* Step Badge */}
        {stepNumber && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-semibold mb-3">
            <span>{stepNumber}단계 {stepTitle}</span>
            <span className="text-neutral-400">·</span>
            <span className="text-amber-600 font-bold">잠금 상태</span>
          </div>
        )}

        {/* Headline */}
        <h2 className="text-xl font-black text-[#111111] tracking-tight mb-2">
          RFP 분석이 필요합니다
        </h2>

        {/* Description */}
        <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto mb-6">
          프로젝트의 RFP를 등록하고 분석을 시작하면 해당 기능을 사용할 수 있습니다.
          {projectName && (
            <span className="block text-xs text-neutral-400 mt-2 font-mono truncate">
              대상 프로젝트: {projectName}
            </span>
          )}
        </p>

        {/* Workflow Info Box */}
        <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 text-left mb-6 text-xs text-neutral-600 space-y-2">
          <div className="font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E60012]" />
            <span>단계별 진행 프로세스 안내</span>
          </div>
          <div className="grid grid-cols-5 gap-1 pt-1 text-[11px] text-center font-medium">
            <div className="bg-red-50 text-[#E60012] font-bold border border-red-200 py-1.5 rounded">
              01 업로드
            </div>
            <div className="bg-neutral-200/70 text-neutral-400 py-1.5 rounded flex items-center justify-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 02 분석
            </div>
            <div className="bg-neutral-200/70 text-neutral-400 py-1.5 rounded flex items-center justify-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 03 체크리스트
            </div>
            <div className="bg-neutral-200/70 text-neutral-400 py-1.5 rounded flex items-center justify-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 04 작성
            </div>
            <div className="bg-neutral-200/70 text-neutral-400 py-1.5 rounded flex items-center justify-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 05 완성
            </div>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            * 1단계에서 RFP 문서를 등록한 후 <strong className="text-neutral-800">[RFP 분석 시작]</strong>을 실행하면 모든 다음 단계가 즉시 활성화됩니다.
          </p>
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={onNavigateToStep1}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <span>RFP 등록 및 분석 시작</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RfpAnalysisRequiredState;
