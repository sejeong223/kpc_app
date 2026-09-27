"use client";

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Edit3, 
  Search, 
  ChevronUp,
  ChevronDown,
  AlertCircle, 
  ChevronRight,
  User,
  X,
  ShieldAlert
} from 'lucide-react';
import type { ProposalProject, UploadedProposalFile } from '@/types/proposals';
import { ProposalSectionItem, INITIAL_PROPOSAL_SECTIONS } from '@/components/proposals/editor/EditorView';
import RfpAnalysisRequiredState from '@/components/proposals/authoring/RfpAnalysisRequiredState';
import { FactCheckModal } from './FactCheckModal';

export interface RequirementsMatrixProps {
  activeProject?: ProposalProject | null;
  sections?: ProposalSectionItem[];
  uploadedFiles?: UploadedProposalFile[];
  onUpdateSections?: (sections: ProposalSectionItem[]) => void;
  onNavigateToProjects?: () => void;
  onNavigateToProjectRoot?: () => void;
  onShowToast: (msg: string) => void;
  onOpenEditorSection?: (sectionId: string) => void;
}

export const RequirementsMatrix: React.FC<RequirementsMatrixProps> = (props) => {
  const { activeProject, uploadedFiles, onNavigateToProjectRoot } = props;

  if (activeProject && ((uploadedFiles && uploadedFiles.length === 0) || (activeProject.analysisStatus && activeProject.analysisStatus !== '분석 완료'))) {
    return (
      <RfpAnalysisRequiredState
        stepNumber="05"
        stepTitle="검토 및 완성"
        projectName={activeProject.title}
        onNavigateToStep1={() => {
          if (onNavigateToProjectRoot) onNavigateToProjectRoot();
        }}
      />
    );
  }

  return <RequirementsMatrixContent {...props} />;
};

const RequirementsMatrixContent: React.FC<RequirementsMatrixProps> = ({
  activeProject,
  sections: externalSections,
  onUpdateSections,
  onNavigateToProjects,
  onNavigateToProjectRoot,
  onShowToast,
  onOpenEditorSection
}) => {
  const sections = externalSections || INITIAL_PROPOSAL_SECTIONS;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode] = useState<'all' | 'written' | 'unwritten'>('all');
  const [exporting, setExporting] = useState(false);
  const [showFactCheckModal, setShowFactCheckModal] = useState(false);

  // Quick Fact Check Issues Count for Badge
  const factCheckIssuesCount = useMemo(() => {
    const errorPattern = /한국생산성진흥회|한국생산성진흥원|생산성연구원|한국생산본부|KPA\b|삼성SDS|LG CNS|SK C&C|A사 컨소시엄|OO공사|노규성\s*회장|안완기\s*이사장|안원기\s*회장|김회장\b|구현모\s*대표|구현모\s*대표이사|황창규\s*회장|2024년도\s*AI\s*선도사업|2024년도|8개월\s*이내|8개월간/g;
    let count = 0;
    sections.forEach(s => {
      const txt = `${s.title} ${s.content || ''}`;
      const matches = txt.match(errorPattern);
      if (matches) count += matches.length;
    });
    return count;
  }, [sections]);

  // Match Navigation State
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  // Search Match Items
  const matchList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const items: { sectionId: string; title: string }[] = [];

    sections.forEach(sec => {
      const inTitle = (sec.title || '').toLowerCase().includes(query);
      const inContent = (sec.content || '').toLowerCase().includes(query);
      if (inTitle || inContent) {
        items.push({ sectionId: sec.id, title: sec.title });
      }
    });
    return items;
  }, [sections, searchQuery]);

  const handleNextMatch = () => {
    if (matchList.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchList.length;
    setCurrentMatchIndex(nextIdx);
    const targetEl = document.getElementById(`section-${matchList[nextIdx].sectionId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePrevMatch = () => {
    if (matchList.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchList.length) % matchList.length;
    setCurrentMatchIndex(prevIdx);
    const targetEl = document.getElementById(`section-${matchList[prevIdx].sectionId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Search Results Counter Helper
  const totalMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const query = searchQuery.toLowerCase();
    let count = 0;
    sections.forEach(sec => {
      // Helper function to count exact, non-overlapping matches
      const countMatches = (text: string) => {
        if (!text) return 0;
        let pos = 0;
        let occurrences = 0;
        const lowerText = text.toLowerCase();
        while (true) {
          pos = lowerText.indexOf(query, pos);
          if (pos !== -1) {
            occurrences++;
            pos += query.length;
          } else {
            break;
          }
        }
        return occurrences;
      };
      count += countMatches(sec.title || '');
      count += countMatches(sec.content || '');
    });
    return count;
  }, [sections, searchQuery]);

  // Keyword Highlighter Helper
  const highlightText = (text: string, query: string) => {
    if (!query || !query.trim() || !text) return text;
    const cleanQuery = query.trim();
    // Escape regex characters
    const escapedQuery = cleanQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === cleanQuery.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-[#E60012] font-black border-b-2 border-[#E60012] px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Full Export Modal State (Migrated from EditorView)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDocType, setExportDocType] = useState<'default_word' | 'template_word'>('default_word');
  const [selectedTemplateName, setSelectedTemplateName] = useState('KPC_표준_제안서_템플릿.dotx');
  const [exportOptions, setExportOptions] = useState({
    includeCover: true,
    autoToc: true,
    pageNumber: true,
    headerFooter: true,
    excludeRfpQuote: false
  });

  // Statistics
  const stats = useMemo(() => {
    const total = sections.length;
    const completed = sections.filter(s => s.status === '완료').length;
    const inProgress = sections.filter(s => s.status === '작성 중' || s.status === '검토 중' || s.status === '검토 대기').length;
    const notStarted = sections.filter(s => s.status === '시작 전' || !s.content.trim()).length;
    const totalChars = sections.reduce((acc, s) => acc + (s.content ? s.content.length : 0), 0);
    const targetChars = sections.reduce((acc, s) => acc + (s.charLimit || 3000), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, notStarted, totalChars, targetChars, completionRate };
  }, [sections]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter(sec => {
      const hasContent = sec.content && sec.content.trim().length > 0;
      if (filterMode === 'written' && !hasContent) return false;
      if (filterMode === 'unwritten' && hasContent) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (sec.title || '').toLowerCase().includes(query) ||
        (sec.sectionNumber || '').toLowerCase().includes(query) ||
        (sec.content && sec.content.toLowerCase().includes(query)) ||
        (sec.author && sec.author.toLowerCase().includes(query))
      );
    });
  }, [sections, filterMode, searchQuery]);

  // Full Export Modal Execution Handler
  const handleExportProposal = (format: 'Word' | 'PDF') => {
    setShowExportModal(false);
    setExporting(true);
    const templateMsg = exportDocType === 'template_word' ? ` (적용 서식: ${selectedTemplateName})` : '';
    onShowToast(`KPC 제안서 전체 완본(${format}${templateMsg}) 생성을 시작합니다...`);
    setTimeout(() => {
      setExporting(false);
      onShowToast(`'${activeProject?.title || 'KPC 제안서'}' ${format} 완본 문서 생성이 완료되었습니다.`);
      if (format === 'PDF') {
        window.print();
      }
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA] select-text">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <button 
                onClick={onNavigateToProjects}
                className="hover:text-[#E60012] transition-colors cursor-pointer"
              >
                전체 프로젝트
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              <button 
                onClick={onNavigateToProjectRoot}
                className="hover:text-[#E60012] transition-colors cursor-pointer truncate max-w-xs"
              >
                {activeProject?.title || '제안 사업'}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-bold text-[#E60012]">05 검토 및 완성</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-[#E60012] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-black text-[#111111]">
                    제안서 현재 상황 전체보기
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Fact Check Button (사실관계검증) - 내보내기 왼쪽 */}
            <button
              onClick={() => setShowFactCheckModal(true)}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 hover:border-neutral-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer group"
              title="발주처 기관명, 회장/대표자 성함, 연도 등 사실관계 오류 전수 검증"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#E60012] transition-transform group-hover:scale-110" />
              <span>사실관계검증</span>
              {factCheckIssuesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#E60012] text-white text-[10px] font-mono font-bold animate-pulse">
                  {factCheckIssuesCount}
                </span>
              )}
            </button>

            {/* Direct Export Modal Button */}
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:shadow cursor-pointer disabled:opacity-60"
              title="제안서 완본 내보내기 (Word / PDF)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{exporting ? '생성 중...' : '내보내기'}</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">작성 진척도:</span>
              <span className="font-mono font-bold text-neutral-900">
                {stats.completed} / {stats.total} 완료 ({stats.completionRate}%)
              </span>
              <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#E60012] rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="h-3 w-px bg-neutral-200 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">총 집필 글자 수:</span>
              <span className="font-mono font-bold text-[#E60012]">
                {stats.totalChars.toLocaleString()}자
              </span>
              <span className="text-neutral-400">/ 목표 {stats.targetChars.toLocaleString()}자</span>
            </div>

            <div className="h-3 w-px bg-neutral-200 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                완료 {stats.completed}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                작성 중 {stats.inProgress}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-100 text-neutral-600 font-bold border border-neutral-200">
                작성 전 {stats.notStarted}
              </span>
            </div>
          </div>

          {/* Search Input on the right end with Forward/Backward Nav Controls */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {searchQuery.trim() !== '' && (
              <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-lg px-2 py-1 shadow-2xs animate-in fade-in shrink-0">
                <span className="text-[11px] font-mono font-bold text-neutral-700 px-1">
                  {matchList.length > 0 ? `${currentMatchIndex + 1}/${matchList.length}` : '0/0'}
                </span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={matchList.length === 0}
                  className="p-1 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                  title="이전 검색결과 위치로 이동 (Up)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={matchList.length === 0}
                  className="p-1 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                  title="다음 검색결과 위치로 이동 (Down)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="제안서 본문 내용, 섹션 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                }}
                className="w-full bg-[#F8F9FA] pl-8 pr-20 py-1.5 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
              />
              {searchQuery.trim() && (
                <span className="absolute right-2 top-1.5 text-[10px] bg-red-50 text-[#E60012] border border-red-200 font-extrabold px-1.5 py-0.5 rounded-md animate-pulse">
                  {totalMatchCount}개 찾음
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Left TOC + Right Unified Document Sheet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left TOC Outline Sidebar */}
        <aside className="w-72 border-r border-neutral-200 bg-white p-4 overflow-y-auto shrink-0 hidden lg:block select-none">
          <div className="space-y-1">
            {filteredSections.map(sec => {
              const charCount = sec.content ? sec.content.length : 0;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    const el = document.getElementById(`full-sec-${sec.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2 cursor-pointer hover:bg-neutral-100 group ${
                    sec.level === 2 ? 'pl-5 text-neutral-600 bg-neutral-50/50' : 'font-bold text-neutral-800'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0 mt-0.5">
                    {sec.sectionNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs group-hover:text-[#E60012] transition-colors">
                      {highlightText(sec.title, searchQuery)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        sec.status === '완료' ? 'bg-emerald-100 text-emerald-700' :
                        sec.status === '작성 중' ? 'bg-blue-100 text-blue-700' :
                        sec.status === '검토 대기' ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {sec.status}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {charCount.toLocaleString()}자
                      </span>
                      {sec.author && (
                        <span className="text-[9px] text-neutral-400 truncate">
                          · {sec.author}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Document Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-100/70 flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            {/* Unified Document Official Cover / Header Box */}
            <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-6 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E60012]" />

              <div className="flex items-start justify-between gap-4 pb-6 border-b border-neutral-200">
                <div>
                  <span className="text-[11px] font-black text-[#E60012] uppercase tracking-wider">
                    Official Proposal Document (통합 제안서)
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111] mt-1.5 leading-snug">
                    {activeProject?.title || '2026 한국생산성본부 맞춤형 생성형 AI 플랫폼 구축 제안서'}
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                    발주기관: {activeProject?.agency || '한국생산성본부 (KPC)'} · 사업기간: 착수일로부터 6개월
                  </p>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[11px] text-neutral-400 font-mono">제출 관리번호</div>
                  <div className="text-xs font-bold text-neutral-800 font-mono mt-0.5">KPC-2026-AI-PROP</div>
                  <div className="text-[11px] text-neutral-400 mt-2">제출일자: 2026. 09. 25</div>
                  <div className="text-xs font-black text-[#111111] mt-0.5">(주)생산성AX컨소시엄</div>
                </div>
              </div>
            </div>

            {/* A4 Continuous Document Paper */}
            <div className="bg-white rounded-xl shadow-xs border border-neutral-200 divide-y divide-neutral-200 overflow-hidden">
              {filteredSections.map(sec => {
                const hasContent = sec.content && sec.content.trim().length > 0;
                const charCount = sec.content ? sec.content.length : 0;

                return (
                  <article
                    key={sec.id}
                    id={`full-sec-${sec.id}`}
                    className="p-6 sm:p-10 transition-colors hover:bg-neutral-50/40 scroll-mt-6"
                  >
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#E60012]">
                            섹션 {sec.sectionNumber}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            sec.status === '완료' ? 'bg-emerald-100 text-emerald-700' :
                            sec.status === '작성 중' ? 'bg-blue-100 text-blue-700' :
                            sec.status === '검토 대기' ? 'bg-amber-100 text-amber-700' :
                            'bg-neutral-100 text-neutral-500'
                          }`}>
                            {sec.status}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {charCount.toLocaleString()}자 / 목표 {sec.charLimit || 3000}자
                          </span>
                        </div>

                        <h2 className={`${
                          sec.level === 1 
                            ? 'text-lg sm:text-xl font-black text-neutral-900 border-l-4 border-[#E60012] pl-3' 
                            : 'text-base sm:text-lg font-bold text-neutral-800 pl-3'
                        }`}>
                          {highlightText(sec.title, searchQuery)}
                        </h2>
                      </div>

                      {/* Action Buttons: Section Copy & Section Edit (Icon only) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sec.content || '');
                            onShowToast(`'${sec.title}' 섹션 본문이 클립보드에 복사되었습니다.`);
                          }}
                          className="p-2 rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="이 섹션 내용 복사"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenEditorSection && onOpenEditorSection(sec.id)}
                          className="p-2 rounded-lg border border-neutral-300 hover:border-[#E60012] bg-white hover:bg-red-50/50 text-neutral-600 hover:text-[#E60012] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="이 섹션 편집 (04 제안서 작성으로 이동)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Author & Reviewer meta bar */}
                    <div className="flex items-center gap-4 text-[11px] text-neutral-500 mb-5 pb-3 border-b border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>작성 담당: <strong className="text-neutral-800">{sec.author || '미지정'}</strong></span>
                      </div>
                      <div className="h-3 w-px bg-neutral-200" />
                      <div>
                        <span>검토자: <strong className="text-neutral-800">{sec.reviewer || '미지정'}</strong></span>
                      </div>
                      <div className="h-3 w-px bg-neutral-200" />
                      <div>
                        <span>최종 업데이트: {sec.updatedAt || '26.09.14'}</span>
                      </div>
                    </div>

                    {/* Section Body */}
                    {hasContent ? (
                      <div className="text-sm text-neutral-800 leading-relaxed space-y-3 whitespace-pre-line font-normal">
                        {highlightText(sec.content, searchQuery)}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-center space-y-2">
                        <AlertCircle className="w-6 h-6 text-neutral-400 mx-auto" />
                        <p className="text-xs text-neutral-500">
                          본 섹션은 아직 본문이 작성되지 않았습니다.
                        </p>
                        <button
                          onClick={() => onOpenEditorSection && onOpenEditorSection(sec.id)}
                          className="px-4 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>지금 작성 시작하기</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {filteredSections.length === 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400 text-xs">
                검색 조건에 맞는 섹션이 없습니다.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL: 제안서 완본 내보내기 (Export Modal) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111111]">제안서 완본 내보내기</h3>
                  <p className="text-[11px] text-neutral-400">Word(.docx) 및 PDF 공식 서식 문서로 일괄 생성합니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Export Format Mode */}
              <div>
                <label className="block font-bold text-neutral-700 mb-2">내보내기 서식 선택</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setExportDocType('default_word')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      exportDocType === 'default_word'
                        ? 'border-[#E60012] bg-[#E60012]/5 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="block text-neutral-900">기본 Word 문서</span>
                    <span className="text-[11px] text-neutral-500 font-normal">표준 서식 및 스타일로 자동 생성</span>
                  </div>

                  <div
                    onClick={() => setExportDocType('template_word')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      exportDocType === 'template_word'
                        ? 'border-[#E60012] bg-[#E60012]/5 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="block text-neutral-900">템플릿을 사용하여 내보내기</span>
                    <span className="text-[11px] text-neutral-500 font-normal">KPC 공식 템플릿 또는 등록 서식 적용</span>
                  </div>
                </div>
              </div>

              {/* Template Select (If template mode) */}
              {exportDocType === 'template_word' && (
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
                  <label className="block font-bold text-neutral-700">적용 템플릿 파일</label>
                  <select
                    value={selectedTemplateName}
                    onChange={e => setSelectedTemplateName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-medium text-xs focus:outline-none focus:border-[#E60012]"
                  >
                    <option value="KPC_표준_제안서_템플릿.dotx">KPC 표준 제안서 템플릿 (Red Theme)</option>
                    <option value="공공기관_입찰_표준양식.dotx">공공기관 입찰 표준양식 (기술평가본)</option>
                  </select>
                </div>
              )}

              {/* Options Checkboxes */}
              <div>
                <label className="block font-bold text-neutral-700 mb-2">포함 옵션 설정</label>
                <div className="space-y-2 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCover}
                      onChange={e => setExportOptions(p => ({ ...p, includeCover: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>표지 포함</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.autoToc}
                      onChange={e => setExportOptions(p => ({ ...p, autoToc: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>목차 자동 생성</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.pageNumber}
                      onChange={e => setExportOptions(p => ({ ...p, pageNumber: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>페이지 번호 자동 삽입</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.headerFooter}
                      onChange={e => setExportOptions(p => ({ ...p, headerFooter: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>머리말 / 꼬리말 포함</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.excludeRfpQuote}
                      onChange={e => setExportOptions(p => ({ ...p, excludeRfpQuote: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>RFP 출처 주석 제외 (최종 제출본용)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleExportProposal('PDF')}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-900 cursor-pointer"
              >
                PDF 출력
              </button>
              <button
                type="button"
                onClick={() => handleExportProposal('Word')}
                className="px-4 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs cursor-pointer"
              >
                Word 문서 내보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 사실관계검증 (Fact-Check Modal) */}
      <FactCheckModal
        isOpen={showFactCheckModal}
        onClose={() => setShowFactCheckModal(false)}
        sections={sections}
        onUpdateSections={onUpdateSections}
        onOpenEditorSection={onOpenEditorSection}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default RequirementsMatrix;
