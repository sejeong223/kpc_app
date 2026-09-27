"use client";

import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  ShieldCheck,
  Copy,
  BookOpen,
  Sparkles
} from 'lucide-react';
import type { ProposalLibraryItem } from "@/types/proposals";

export interface DocumentPreviewModalProps {
  item: ProposalLibraryItem;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  item,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'toc' | 'metadata'>('content');

  const content = item.previewContent || {
    summary: item.description || '등록된 제안 참조 자료입니다.',
    keyHighlights: [
      'KPC 사내 자산화 승인 완료 문서',
      '조달청 및 공공기관 기술평가 기준 준수',
      '최신 공공 IT 입찰 규격 반영'
    ],
    sampleText: `[사내 자산 미리보기 - ${item.title}]\n\n본 문서는 ${item.department || '한국생산성본부'}에서 생성 및 관리하는 공식 제안 증빙 및 참조 자산입니다. 실제 제안서 작성 시 해당 본문 및 증빙 번호를 스토리보드 또는 근거자료 섹션에 바로 링크하여 활용할 수 있습니다.`,
    toc: ['1. 총괄 개요', '2. 세부 명세 및 증빙', '3. 공공 평가위원 착안사항'],
    metadata: {
      '소관부서': item.department || 'AI사업본부',
      '문서형식': item.fileFormat,
      '파일용량': item.size || '3.5 MB',
      '최종수정일': item.updatedAt || item.lastModified || '2026.09.01'
    }
  };

  const handleCopySample = () => {
    if (content.sampleText) {
      navigator.clipboard.writeText(content.sampleText);
      onShowToast('문서 발췌문이 클립보드에 복사되었습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#E60012] border border-[#E60012]/20 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-[#E60012] border border-[#E60012]/20">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {item.fileFormat} · {item.size}
                </span>
                {item.department && (
                  <span className="text-[10px] text-neutral-500 bg-neutral-200/70 px-1.5 py-0.5 rounded">
                    {item.department}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-[#111111] mt-0.5 line-clamp-1">
                {item.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShowToast(`'${item.title}' 다운로드가 시작되었습니다.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
              title="파일 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Nav Tabs */}
        <div className="px-6 border-b border-neutral-200 bg-white flex items-center gap-4 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'content'
                ? 'border-[#E60012] text-[#E60012] font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            핵심 내용 및 발췌문
          </button>
          {content.toc && content.toc.length > 0 && (
            <button
              onClick={() => setActiveTab('toc')}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'toc'
                  ? 'border-[#E60012] text-[#E60012] font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              목차 구조 ({content.toc.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'metadata'
                ? 'border-[#E60012] text-[#E60012] font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            문서 메타정보 & 인증
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs text-[#111111] bg-[#FAFAFA]">
          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* 요약 박스 */}
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                  <BookOpen className="w-4 h-4 text-[#E60012]" />
                  <span>문서 핵심 요약</span>
                </div>
                <p className="text-neutral-600 leading-relaxed text-xs">
                  {content.summary}
                </p>
              </div>

              {/* 핵심 강점 & 수주 포인트 */}
              {content.keyHighlights && content.keyHighlights.length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                    <Sparkles className="w-4 h-4 text-[#E60012]" />
                    <span>제안서 반영 핵심 소구점 (Key Highlights)</span>
                  </div>
                  <ul className="space-y-1.5">
                    {content.keyHighlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-neutral-700 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E60012] shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 본문 샘플 발췌문 */}
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                    <FileText className="w-4 h-4 text-neutral-600" />
                    <span>원문 샘플 본문 (실제 발췌문)</span>
                  </div>
                  <button
                    onClick={handleCopySample}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>발췌문 복사</span>
                  </button>
                </div>
                <div className="p-3.5 bg-[#F8F9FA] rounded-md border border-neutral-300 font-mono text-[11px] text-neutral-800 whitespace-pre-wrap leading-relaxed">
                  {content.sampleText}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'toc' && content.toc && (
            <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#111111]">
                {item.title} 목차 구성
              </h3>
              <div className="divide-y divide-neutral-100">
                {content.toc.map((chap, i) => (
                  <div key={i} className="py-2.5 flex items-center gap-3 text-neutral-700">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-medium text-xs">{chap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs space-y-3">
                <h3 className="font-bold text-xs text-[#111111] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>공공 입찰 적합성 및 소관 정보</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {content.metadata && Object.entries(content.metadata).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded bg-[#F8F9FA] border border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">{k}</span>
                      <strong className="text-neutral-800">{v}</strong>
                    </div>
                  ))}
                  <div className="p-2.5 rounded bg-[#F8F9FA] border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">사내 활용 횟수</span>
                    <strong className="text-[#E60012]">{item.useCount || 30}회 제안 인용</strong>
                  </div>
                  <div className="p-2.5 rounded bg-[#F8F9FA] border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">보안 등급</span>
                    <strong className="text-neutral-800">사내 수주자산 (열람자 제한 없음)</strong>
                  </div>
                </div>
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-2">
                    연관 분류 태그
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[11px] font-semibold">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-500">
            한국생산성본부(KPC) 제안 수주 지식 자산 저장소
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySample}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded text-xs font-semibold text-neutral-700 cursor-pointer"
            >
              내용 복사
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#111111] hover:bg-neutral-800 text-white rounded text-xs font-bold cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
