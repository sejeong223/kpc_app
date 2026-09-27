"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  ZoomIn,
  ZoomOut,
  Check,
  AlertTriangle,
  Sparkles,
  Coins,
  Calendar,
  Building2,
  User,
  FileCheck,
  Layers,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  Shield,
  Clock,
  ArrowRight,
  X,
  BookOpen
} from 'lucide-react';
import type {
  PipelineStage,
  ProposalProject,
  PWinEvaluationItem,
  UserRole,
} from "@/types/proposals";
import {
  DEFAULT_PWIN_ITEMS,
  REJECTION_REASONS,
  SAMPLE_RFP_PAGES,
  type RejectionReasonType,
} from "@/data/proposals/pwin";

export interface ProjectReviewDetailProps {
  userRole?: UserRole;
  project: ProposalProject;
  onBack: () => void;
  onUpdateProjectStage?: (projectId: string, newStage: PipelineStage, extraData?: Partial<ProposalProject>) => void;
  onUpdateProject?: (updatedProject: ProposalProject) => void;
  onStartProposalWriting?: (project: ProposalProject) => void;
  onStartProposal?: () => void;
  onShowToast: (msg: string) => void;
}

interface DocumentSearchResult {
  page: number;
  title: string;
  text: string;
}

function searchRfpPages(query: string): DocumentSearchResult[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const results: DocumentSearchResult[] = [];

  Object.entries(SAMPLE_RFP_PAGES).forEach(([pageText, data]) => {
    const page = Number.parseInt(pageText, 10);
    const title = data.title.toLowerCase();
    const text = data.text.toLowerCase();
    if (!title.includes(normalizedQuery) && !text.includes(normalizedQuery)) return;

    const occurrences = Math.max(
      1,
      title.split(normalizedQuery).length - 1 + text.split(normalizedQuery).length - 1,
    );
    for (let index = 0; index < occurrences; index += 1) {
      results.push({ page, title: data.title, text: data.text });
    }
  });

  return results.sort((first, second) => first.page - second.page);
}

export const ProjectReviewDetail: React.FC<ProjectReviewDetailProps> = ({
  userRole = 'admin',
  project,
  onBack,
  onUpdateProjectStage,
  onUpdateProject,
  onStartProposalWriting,
  onStartProposal,
  onShowToast
}) => {
  // Current stage local tracker
  const currentStage = (project.stage as PipelineStage) || '검토 대기';

  // Safe stage update helper
  const handleStageUpdate = useCallback((
    newStage: PipelineStage,
    extraData?: Partial<ProposalProject>,
  ) => {
    if (typeof onUpdateProjectStage === 'function') {
      onUpdateProjectStage(project.id, newStage, extraData);
    }
    if (typeof onUpdateProject === 'function') {
      onUpdateProject({
        ...project,
        stage: newStage,
        status: newStage,
        ...extraData
      });
    }
  }, [onUpdateProject, onUpdateProjectStage, project]);

  // Auto-transition from '검토 대기' to '검토 중' when review detail is opened
  useEffect(() => {
    if (currentStage === '검토 대기' && userRole === 'admin') {
      handleStageUpdate('검토 중');
      onShowToast(`'${project.title}' 프로젝트 상태가 '검토중'으로 전환되었습니다.`);
    }
  }, [currentStage, handleStageUpdate, onShowToast, project.title, userRole]);

  const handleStartWriting = () => {
    if (typeof onStartProposalWriting === 'function') {
      onStartProposalWriting(project);
    } else if (typeof onStartProposal === 'function') {
      onStartProposal();
    }
  };

  // Left Column Viewer State
  const [selectedDocName, setSelectedDocName] = useState<string>(
    project.primaryRfpFileName || '2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf'
  );
  const [currentPage, setCurrentPage] = useState<number>(18);
  const totalPages = 64;
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [highlightedPageSection, setHighlightedPageSection] = useState<string | null>(null);
  const [pageViewMode, setPageViewMode] = useState<'single' | 'double'>('single');

  // Search State & Match Navigation (Ctrl+F style)
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  // Calculate search results across all document pages
  const searchResults = useMemo(() => searchRfpPages(searchQuery), [searchQuery]);

  const handleSearchChange = (query: string) => {
    const results = searchRfpPages(query);
    setSearchQuery(query);
    setCurrentMatchIndex(0);
    if (results[0]) setCurrentPage(results[0].page);
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    setCurrentPage(searchResults[nextIdx].page);
    if (typeof onShowToast === 'function') {
      onShowToast(`[Page ${searchResults[nextIdx].page}] '${searchQuery}' 검색 결과 (${nextIdx + 1}/${searchResults.length}) 위치로 이동했습니다.`);
    }
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    setCurrentPage(searchResults[prevIdx].page);
    if (typeof onShowToast === 'function') {
      onShowToast(`[Page ${searchResults[prevIdx].page}] '${searchQuery}' 검색 결과 (${prevIdx + 1}/${searchResults.length}) 위치로 이동했습니다.`);
    }
  };

  // Helper function to render text with highlighted keywords
  const renderHighlightedText = (text: string) => {
    if (!searchQuery || !searchQuery.trim()) return text;
    const q = searchQuery.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

    return (
      <>
        {parts.map((part, idx) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={idx}
              className="bg-amber-300 text-[#111111] font-black px-1 py-0.5 rounded shadow-2xs border border-amber-400 animate-pulse inline-block my-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Right Column Admin Review State
  const [adminOpinion, setAdminOpinion] = useState<string>(
    project.adminOpinion || 'AI 특화 역량 및 KPC의 공공 도메인 실적이 우수하므로, 망연계 게이트웨이 보안 요건을 기술 제안서에 중점 반영하여 수주 추진을 권고함.'
  );
  const [isSavedOpinion, setIsSavedOpinion] = useState(true);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<RejectionReasonType>('경쟁환경 불리');
  const [customRejectionNote, setCustomRejectionNote] = useState('');

  // PWin Items
  const pwinItems = project.pwinBreakdown && project.pwinBreakdown.length > 0
    ? project.pwinBreakdown
    : DEFAULT_PWIN_ITEMS;

  const pwinScore = project.pWin || 74;

  // Jump to citation page in RFP viewer tab
  const handleJumpToCitation = (item: PWinEvaluationItem) => {
    setActiveTab('rfp');
    setCurrentPage(item.rfpPage || 18);
    setHighlightedPageSection(item.rfpCitationLocation);
    onShowToast(`RFP [${item.rfpCitationLocation}] 위치(p.${item.rfpPage})로 이동했습니다.`);
  };

  const handleSaveAdminOpinion = () => {
    handleStageUpdate(currentStage, {
      adminOpinion
    });
    setIsSavedOpinion(true);
    onShowToast('관리자 검토 의견이 저장되었습니다.');
  };

  // Stage Transitions
  const handleStartReview = () => {
    handleStageUpdate('검토 중');
    onShowToast(`'${project.title}' 프로젝트 상태가 '검토중'으로 변경되었습니다.`);
  };

  const handleApproveProject = () => {
    handleStageUpdate('진행', {
      adminOpinion
    });
    onShowToast(`'${project.title}' 프로젝트의 [진행 결정]이 승인되었습니다. 제안서 작성이 활성화됩니다.`);
    onBack();
  };

  const handleConfirmReject = () => {
    handleStageUpdate('진행 안 함', {
      rejectionReason: selectedRejectionReason,
      rejectionNote: customRejectionNote,
      adminOpinion
    });
    setIsRejectModalOpen(false);
    onShowToast(`'${project.title}' 프로젝트가 '진행안함' 상태로 처리되었습니다.`);
    onBack();
  };

  // Page Content for Left Viewer
  const getPageData = (pageNum: number) => {
    return (
      SAMPLE_RFP_PAGES[pageNum] || {
        title: `제3장 제안 요구사항 - 세부 명세서 (Page ${pageNum})`,
        text: `본 페이지는 [${selectedDocName}]의 제${pageNum}쪽 원문입니다.\n\n공공 클라우드 CSAP 보안 인증 요구사항 및 국산 프라이빗 LLM 연동 아키텍처 규격에 따라, 사업자는 데이터 전송 암호화, 역할 기반 권한 관리(RBAC), 비정형 문서 RAG 파이프라인의 실시간 임베딩 색인 규격을 엄격히 준수하여야 합니다.\n\n- 요구사항 ID: REQ-${pageNum}-01\n- 중요도: 필수 (High)\n- 검증 방법: 현장 실증 테스트 및 기능 적합성 평가`,
        highlights: ['CSAP 보안 인증', 'RAG 파이프라인']
      }
    );
  };

  // State for Tab Switching (사업개요 / RFP / PWin 평가결과 / 검토 정보)
  const [activeTab, setActiveTab] = useState<'overview' | 'rfp' | 'pwin' | 'review'>('overview');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA]">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
              title="제안 목록으로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>제안 목록</span>
                <span>&gt;</span>
                <span>{project.agency}</span>
                <span>&gt;</span>
                <span className="text-[#111111] font-bold truncate">{project.title}</span>
              </div>
            </div>
          </div>

          {/* Header Quick Decision Buttons */}
          <div className="flex items-center gap-2">
            {currentStage === '검토 대기' && userRole === 'admin' && (
              <button
                type="button"
                onClick={handleStartReview}
                className="px-4 py-2 bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-black rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>검토시작</span>
              </button>
            )}

            {currentStage === '검토 중' && userRole === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-3.5 py-2 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-neutral-500" />
                  <span>진행안함</span>
                </button>
                <button
                  type="button"
                  onClick={handleApproveProject}
                  className="px-4 py-2 bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-black rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>진행</span>
                </button>
              </>
            )}

            {currentStage === '진행' && (
              <button
                type="button"
                onClick={handleStartWriting}
                className="px-5 py-2 bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-black rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer shadow-red-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>작성시작</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStage === '진행 안 함' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded-md">
                  진행안함 (사유: {project.rejectionReason || '경쟁환경 불리'})
                </span>
                <button
                  type="button"
                  onClick={handleStartReview}
                  className="px-3 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-[#111111] rounded-md transition-colors cursor-pointer"
                >
                  재검토하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integrated Tab Area (Section 8) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Tab Navigation Header */}
        <div className="flex items-center border-b border-neutral-200 bg-neutral-50 px-6 pt-2 shrink-0 gap-1.5">
          <button
            id="tab-overview-btn"
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#E60012] text-[#E60012] bg-white rounded-t-lg shadow-2xs font-black'
                : 'border-transparent text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 rounded-t-lg'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>사업개요</span>
          </button>

          <button
            id="tab-rfp-btn"
            type="button"
            onClick={() => setActiveTab('rfp')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rfp'
                ? 'border-[#E60012] text-[#E60012] bg-white rounded-t-lg shadow-2xs font-black'
                : 'border-transparent text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 rounded-t-lg'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>RFP</span>
          </button>

          <button
            id="tab-pwin-btn"
            type="button"
            onClick={() => setActiveTab('pwin')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'pwin'
                ? 'border-[#E60012] text-[#E60012] bg-white rounded-t-lg shadow-2xs font-black'
                : 'border-transparent text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 rounded-t-lg'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>PWin 평가결과</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              activeTab === 'pwin'
                ? 'bg-red-50 text-[#E60012] border border-red-200'
                : 'bg-neutral-200 text-neutral-600'
            }`}>
              {pwinScore}점
            </span>
          </button>

          <button
            id="tab-review-btn"
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'review'
                ? 'border-[#E60012] text-[#E60012] bg-white rounded-t-lg shadow-2xs font-black'
                : 'border-transparent text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 rounded-t-lg'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>검토 정보</span>
          </button>
        </div>

        {/* Tab Content Area */}
        {activeTab === 'rfp' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Viewer Toolbar */}
            <div className="p-3 border-b border-neutral-200 bg-[#F8F9FA] flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0 px-6">
              {/* Left Group: Document Selector + 1장/2장 보기 선택 버튼 */}
              <div className="flex items-center gap-3 min-w-0 flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-2 min-w-0 max-w-sm flex-1">
                  <span className="text-xs font-bold text-neutral-600 shrink-0">문서 선택:</span>
                  <select
                    value={selectedDocName}
                    onChange={e => setSelectedDocName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012] truncate w-full shadow-2xs cursor-pointer"
                  >
                    <option value="2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf">
                      [대표 RFP] 2026_공공기관_생성형AI_RFP.pdf
                    </option>
                    <option value="과업지시서_세부과업내역서_v1.0.docx">
                      과업지시서_세부과업내역서_v1.0.docx
                    </option>
                    <option value="KPC_공공기관_AI구축_유사수행실적증명원.pdf">
                      KPC_공공기관_AI구축_유사수행실적증명원.pdf
                    </option>
                  </select>
                </div>

                {/* 문서선택 드롭다운 오른쪽: 1장 / 2장 보기 선택 버튼 */}
                <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs shrink-0">
                  <button
                    id="view-single-page-btn"
                    type="button"
                    onClick={() => setPageViewMode('single')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      pageViewMode === 'single'
                        ? 'bg-[#E60012] text-white shadow-2xs font-black'
                        : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100'
                    }`}
                    title="문서 한 장씩 보기"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>한 장 보기</span>
                  </button>
                  <button
                    id="view-double-page-btn"
                    type="button"
                    onClick={() => setPageViewMode('double')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      pageViewMode === 'double'
                        ? 'bg-[#E60012] text-white shadow-2xs font-black'
                        : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100'
                    }`}
                    title="문서 두 장씩 나란히 보기"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>두 장 보기</span>
                  </button>
                </div>
              </div>

              {/* Right Group: Search Box, Page Navigation, Zoom Controls */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end w-full lg:w-auto">
                {/* Search Box & Controls */}
                {searchQuery.trim() !== '' && (
                  <div className="flex items-center gap-0.5 bg-white border border-neutral-300 rounded-md px-1.5 py-0.5 shadow-2xs shrink-0">
                    <span className="text-[11px] font-mono font-bold text-neutral-700 px-0.5 shrink-0">
                      {searchResults.length > 0 ? `${currentMatchIndex + 1}/${searchResults.length}` : '0/0'}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      disabled={searchResults.length === 0}
                      className="p-0.5 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                      title="이전 위치로 이동 (Up / Shift+Enter)"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      disabled={searchResults.length === 0}
                      className="p-0.5 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                      title="다음 위치로 이동 (Down / Enter)"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="RFP 원문 검색..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
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
                    className="pl-8 pr-7 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-[#111111] w-48 sm:w-56 focus:outline-none focus:border-[#E60012] shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      title="검색 지우기"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Page Nav */}
                <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-lg px-1.5 py-0.5 shadow-2xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, pageViewMode === 'double' ? p - 2 : p - 1))}
                    className="p-1 text-neutral-500 hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    title="이전 페이지"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-[#111111] px-1.5">
                    {pageViewMode === 'double'
                      ? `${currentPage}-${Math.min(totalPages, currentPage + 1)} / ${totalPages}`
                      : `${currentPage} / ${totalPages}`}
                  </span>
                  <button
                    type="button"
                    disabled={pageViewMode === 'double' ? currentPage + 1 >= totalPages : currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, pageViewMode === 'double' ? p + 2 : p + 1))}
                    className="p-1 text-neutral-500 hover:text-[#111111] disabled:opacity-30 cursor-pointer"
                    title="다음 페이지"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-lg px-1.5 py-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.max(70, z - 10))}
                    className="p-1 text-neutral-500 hover:text-[#111111] cursor-pointer"
                    title="축소"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-neutral-600 px-0.5">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
                    className="p-1 text-neutral-500 hover:text-[#111111] cursor-pointer"
                    title="확대"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Viewer Canvas Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-neutral-100 flex justify-center">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className={`transition-transform duration-100 ${
                  pageViewMode === 'double' ? 'w-full max-w-7xl' : 'w-full max-w-3xl'
                }`}
              >
                {/* Helper sub-card renderer */}
                {(() => {
                  const renderPageCard = (pageNum: number) => {
                    const pData = getPageData(pageNum);
                    const isHighlighted = highlightedPageSection && currentPage === pageNum;

                    return (
                      <div className="bg-white shadow-md border border-neutral-300 w-full min-h-[820px] p-8 sm:p-10 flex flex-col justify-between rounded-sm">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 text-xs text-neutral-400 font-mono">
                            <span>[공공입찰 RFP 원문] {selectedDocName}</span>
                            <span>PAGE {pageNum} / {totalPages}</span>
                          </div>

                          {isHighlighted && (
                            <div className="my-4 p-3 bg-red-50 border-l-4 border-[#E60012] rounded-r text-xs text-[#E60012] flex items-center justify-between animate-in fade-in">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI 평가 근거 위치: {highlightedPageSection}</span>
                              </div>
                              <button
                                onClick={() => setHighlightedPageSection(null)}
                                className="text-neutral-400 hover:text-[#111111]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <h2 className="text-lg font-black text-[#111111] mt-6 mb-4">
                            {renderHighlightedText(pData.title)}
                          </h2>

                          <div className="text-xs text-neutral-800 leading-relaxed font-normal whitespace-pre-line space-y-3 font-serif">
                            {renderHighlightedText(pData.text)}
                          </div>

                          {(pageNum === 18 || pageNum === 12) && (
                            <div className="mt-6 border border-neutral-300 rounded overflow-hidden text-xs font-sans">
                              <div className="bg-neutral-100 px-3 py-2 font-bold text-[#111111] border-b border-neutral-300">
                                기술 규격 충족 검증표 (KPC 매핑 확인)
                              </div>
                              <table className="w-full text-left">
                                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                                  <tr>
                                    <th className="p-2.5 w-24">요구코드</th>
                                    <th className="p-2.5">요구내용</th>
                                    <th className="p-2.5 w-28 text-center">적합 여부</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                  <tr>
                                    <td className="p-2.5 font-mono font-bold">SFR-001</td>
                                    <td className="p-2.5">비정형 공공문서 RAG 하이브리드 검색</td>
                                    <td className="p-2.5 text-center text-[#E60012] font-bold">100% 충족</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-mono font-bold">SFR-002</td>
                                    <td className="p-2.5">국산 멀티 파운데이션 LLM 오케스트레이션</td>
                                    <td className="p-2.5 text-center text-[#E60012] font-bold">100% 충족</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-mono font-bold">ECR-001</td>
                                    <td className="p-2.5">공공 클라우드 CSAP 보안 인증 인프라</td>
                                    <td className="p-2.5 text-center text-[#111111] font-bold">파트너십 충족</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="pt-6 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-400">
                          <span>한국생산성본부(KPC) 제안 준비 전용 문서</span>
                          <span className="font-mono">- {pageNum} -</span>
                        </div>
                      </div>
                    );
                  };

                  if (pageViewMode === 'double') {
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
                        {renderPageCard(currentPage)}
                        {currentPage + 1 <= totalPages ? (
                          renderPageCard(currentPage + 1)
                        ) : (
                          <div className="bg-white/70 border-2 border-dashed border-neutral-300 rounded-sm min-h-[820px] flex flex-col items-center justify-center p-8 text-neutral-400 text-xs">
                            <FileText className="w-12 h-12 mb-3 text-neutral-300" />
                            <span className="font-bold text-neutral-500">문서의 마지막 페이지입니다.</span>
                            <span className="text-[11px] text-neutral-400 mt-1">(총 {totalPages}쪽 구성)</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return renderPageCard(currentPage);
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F8F9FA]">
            <div className="w-full max-w-7xl mx-auto space-y-6">
              {/* TAB 1: 사업개요 (전체 화면에 최적화된 와이드 대시보드) */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top 4 KPI Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-neutral-500">
                        <span className="text-xs font-semibold">사업예산 (추정가격)</span>
                        <Coins className="w-4 h-4 text-[#E60012]" />
                      </div>
                      <div className="text-2xl font-black text-[#E60012]">
                        {project.budget ? `${(project.budget / 100000000).toFixed(1)}억원` : '12.0억원'}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono block">
                        VAT 포함 (₩{project.budget?.toLocaleString() || '1,200,000,000'})
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-neutral-500">
                        <span className="text-xs font-semibold">제안 마감일</span>
                        <Calendar className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="text-2xl font-black text-[#111111]">
                        {project.deadline}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-red-50 text-[#E60012] font-black text-[11px] border border-red-100">
                          D-28
                        </span>
                        <span className="text-[11px] text-neutral-500">17:00 전자입찰 마감</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-neutral-500">
                        <span className="text-xs font-semibold">수주 가능성 (P-Win)</span>
                        <Sparkles className="w-4 h-4 text-[#E60012]" />
                      </div>
                      <div className="text-2xl font-black text-[#111111] flex items-baseline gap-1.5">
                        <span>{pwinScore}</span>
                        <span className="text-sm font-normal text-neutral-400">/ 100점</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                          수주 유망
                        </span>
                        <span className="text-[11px] text-neutral-500">8개 평가항목 우수</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-neutral-500">
                        <span className="text-xs font-semibold">사업기간 및 담당자</span>
                        <User className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="text-base font-black text-[#111111] truncate mt-1">
                        {project.manager || '정소담'} 수석
                      </div>
                      <div className="text-xs text-neutral-500">
                        AI산업본부 · {project.businessPeriod || '2026.10 ~ 2027.04 (6개월)'}
                      </div>
                    </div>
                  </div>

                  {/* Main Split: Left Spec Table & Right Scope/Strategy */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (7 Col): Detailed Project Specs */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                        <Building2 className="w-4 h-4 text-[#E60012]" />
                        <h3 className="text-sm font-black text-[#111111]">사업 기본 정보 및 입찰 개요</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">공고 사업명</span>
                          <span className="font-bold text-[#111111] text-xs leading-snug block">
                            {project.title}
                          </span>
                        </div>

                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">발주기관 / 수요기관</span>
                          <span className="font-bold text-[#111111] text-xs leading-snug block">
                            {project.agency}
                          </span>
                        </div>

                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">입찰 및 계약 방식</span>
                          <span className="font-semibold text-neutral-800 text-xs block">
                            일반경쟁입찰 / 협상에 의한 계약 (조달청 나라장터)
                          </span>
                        </div>

                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">낙찰자 결정 방식</span>
                          <span className="font-semibold text-[#E60012] text-xs block">
                            기술능력평가 (90%) + 입찰가격평가 (10%)
                          </span>
                        </div>

                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">사업 추진 기간</span>
                          <span className="font-semibold text-neutral-800 text-xs block">
                            계약체결일로부터 180일 (약 6개월)
                          </span>
                        </div>

                        <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1">입찰 참가 자격</span>
                          <span className="font-semibold text-neutral-800 text-xs block">
                            소프트웨어사업자(컴퓨터관련서비스사업) 신고 업체
                          </span>
                        </div>
                      </div>

                      {/* Summary text */}
                      <div className="pt-2">
                        <span className="text-xs font-bold text-neutral-700 block mb-1.5">사업 배경 및 목적 요약</span>
                        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs text-neutral-700 leading-relaxed space-y-1.5">
                          <p>
                            {project.businessSummary || '공공기관 맞춤형 생성형 AI 기반 업무혁신 플랫폼 구축 및 지능형 RAG 사내 지식검색 구축, 보안 가이드라인 준수 망연계 시스템 구현.'}
                          </p>
                          <p className="text-neutral-500 text-[11px]">
                            * 본 사업은 행정업무 생산성 극대화 및 공공 데이터 보안성 확보를 목표로 추진되며, KPC의 공공 도메인 전문성과 표준 생성형 AI 프레임워크가 강력한 수주 우위를 가집니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (5 Col): Scope & Key Work Tasks */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                          <Layers className="w-4 h-4 text-[#E60012]" />
                          <h3 className="text-sm font-black text-[#111111]">3대 핵심 과업 범위 및 추진 전략</h3>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-[#E60012] font-black text-[11px] flex items-center justify-center shrink-0">
                                1
                              </span>
                              <span className="text-xs font-bold text-[#111111]">
                                비정형 행정문서 지능형 RAG 검색 체계
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 pl-7 leading-relaxed">
                              PDF, 한글(HWPX), 워드 등 공공문서의 표/서식/도표를 고정밀 청킹하여 의미 기반 하이브리드 검색 구현
                            </p>
                          </div>

                          <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-[#E60012] font-black text-[11px] flex items-center justify-center shrink-0">
                                2
                              </span>
                              <span className="text-xs font-bold text-[#111111]">
                                Multi-LLM 기반 전사 행정서식 자동 초안 작성
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 pl-7 leading-relaxed">
                              국산 파운데이션 LLM 연동으로 기안서, 보도자료, 회의록 요약 등 12종 행정 서식 원클릭 자동 초안 완성
                            </p>
                          </div>

                          <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-[#E60012] font-black text-[11px] flex items-center justify-center shrink-0">
                                3
                              </span>
                              <span className="text-xs font-bold text-[#111111]">
                                공공보안 가이드라인 준수 CSAP 망연계 게이트웨이
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 pl-7 leading-relaxed">
                              국정원 보안성 검토 기준 충족, 비식별화 필터링 및 공공 클라우드 CSAP 보안 인증 인프라 연동
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Link to RFP */}
                      <div className="pt-3 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setActiveTab('rfp')}
                          className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#E60012]" />
                          <span>RFP 원문 세부 규격서 열람하기</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PWin 평가결과 (전체 화면에 최적화된 와이드 대시보드) */}
              {activeTab === 'pwin' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top 3 Analytical Banners */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Score Overview Card */}
                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-600">PWin 종합 수주 확률</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          수주 유망권
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[#E60012]">{pwinScore}</span>
                        <span className="text-sm font-semibold text-neutral-400">/ 100점 만점</span>
                      </div>

                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#E60012] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pwinScore}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        * 8개 핵심 항목 평가 결과 평균 7.4점 기록. 기술 배점 90% 비중 환경에서 KPC 실적 및 아키텍처 우위 확보.
                      </p>
                    </div>

                    {/* Strengths Card */}
                    <div className="bg-red-50/50 border border-red-200 p-5 rounded-xl shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#E60012]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>핵심 수주 강점 (Strengths)</span>
                      </div>
                      <ul className="text-xs text-neutral-700 leading-relaxed space-y-1.5 list-disc list-inside">
                        <li>전년도 디지털 전환 사전 컨설팅 수행으로 고객 신뢰 및 과제 이해도 최고 수준</li>
                        <li>최근 3개년 유사 공공 레퍼런스 4건 보유 (정량 실적 20점 만점 충족)</li>
                        <li>Multi-LLM 표준 프레임워크 90% 이상 일치하여 구현 신뢰성 탁월</li>
                      </ul>
                    </div>

                    {/* Risks & Mitigation Card */}
                    <div className="bg-white border border-neutral-200 p-5 rounded-xl shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>주요 위험 요인 및 대응 방안 (Risks)</span>
                      </div>
                      <ul className="text-xs text-neutral-600 leading-relaxed space-y-1.5 list-disc list-inside">
                        <li>행정망 분리 테스트베드 구축 일정 촉박 → 클라우드 보안 파트너 사전 협의</li>
                        <li>IT 서비스 대기업 컨소시엄 경쟁 가능성 → 공공 AI 전문성과 전담팀 밀착 지원 차별화</li>
                        <li>고객사 레거시 연동 지연 리스크 → 사전 표준 API 규격 사전 제시로 대응</li>
                      </ul>
                    </div>
                  </div>

                  {/* 8 Itemized Evaluation Cards in 2-Column Wide Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#E60012]" />
                        <h3 className="text-xs font-bold text-neutral-800">
                          8개 세부 평가 항목 분석 (RFP 근거 클릭 시 해당 페이지로 즉시 이동)
                        </h3>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        총 8개 항목 심사 완료
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pwinItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all text-xs space-y-3 shadow-2xs flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-neutral-400">
                                  0{idx + 1}
                                </span>
                                <span className="font-bold text-[#111111] text-sm">
                                  {item.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  {item.resultLabel}
                                </span>
                                <span className="font-mono font-black text-[#111111] text-sm">
                                  {item.score}/10
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-neutral-700 leading-relaxed">
                              {item.rationale}
                            </p>

                            {item.aiExplanation && (
                              <div className="p-2.5 bg-neutral-50 rounded-lg text-[11px] text-neutral-500 border border-neutral-200/60 leading-relaxed">
                                <span className="font-bold text-neutral-600 block mb-0.5">AI 전략적 분석 제언:</span>
                                {item.aiExplanation}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                            <span className="text-[11px] text-neutral-400 font-mono">
                              인용: {item.rfpCitationLocation}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleJumpToCitation(item)}
                              className="inline-flex items-center gap-1.5 text-[#E60012] font-bold hover:underline bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md border border-red-100 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>원문 확인 (p.{item.rfpPage})</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 검토 정보 (전체 화면에 최적화된 와이드 대시보드) */}
              {activeTab === 'review' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (7 Col): Pre-analysis & Requirements & Feasibility Checklist */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Requirements Card */}
                      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                          <FileCheck className="w-4 h-4 text-[#E60012]" />
                          <h3 className="font-bold text-neutral-800 text-sm">핵심 요구사항 기술 분석</h3>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-neutral-700 leading-relaxed text-xs space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#E60012] shrink-0">1)</span>
                            <span>CSAP 인증 공공 클라우드 및 국산 프라이빗 Multi-LLM 하이브리드 연동 아키텍처 구현</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#E60012] shrink-0">2)</span>
                            <span>행정 문서 지능형 검색 체계 구축 및 기안서·서식 12종 자동 초안 작성 파이프라인 연계</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#E60012] shrink-0">3)</span>
                            <span>국가정보보안기본지침 준수, 망분리 구간 연계 게이트웨이 및 개인정보 실시간 비식별화 필터링</span>
                          </div>
                        </div>
                      </div>

                      {/* Specialist Opinion Card */}
                      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#E60012]" />
                            <h3 className="font-bold text-neutral-800 text-sm">
                              사전 분석 담당자 의견 ({project.manager || '정소담 수석'})
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            수주 추진 적극 권유
                          </span>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-neutral-700 leading-relaxed text-xs">
                          &quot;전년도 사전 컨설팅 수행 경험을 바탕으로 사업 범위를 명확히 파악하고 있으며, 기술 배점 90% 구조에서 KPC의 생성형 AI 지식 아키텍처가 차별화된 경쟁력을 발휘할 수 있습니다. 수주 추진을 적극 권유합니다.&quot;
                        </div>
                      </div>

                      {/* Feasibility Checklist */}
                      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                          <Shield className="w-4 h-4 text-[#E60012]" />
                          <h3 className="font-bold text-neutral-800 text-sm">입찰 타당성 점검 체크리스트</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                            <span className="text-[11px] text-neutral-400 block">입찰 참가 자격</span>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>100% 충족</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 block">소프트웨어사업자 신고 필</span>
                          </div>

                          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                            <span className="text-[11px] text-neutral-400 block">사업 수익성</span>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>적정 (영업이익률 14%)</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 block">인건비 및 기술료 확보</span>
                          </div>

                          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                            <span className="text-[11px] text-neutral-400 block">수행 인력 가용성</span>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>12명 즉시 투입 가능</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 block">AI 엔지니어 및 도메인 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (5 Col): Admin Opinion Input & Stage Actions */}
                    <div className="lg:col-span-5 space-y-5">
                      {/* Admin Review Opinion Input */}
                      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                          <label className="font-bold text-[#111111] text-sm flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-[#E60012]" />
                            <span>관리자 검토 의견</span>
                            <span className="text-xs text-[#E60012] font-semibold">(직접 입력 가능)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSaveAdminOpinion}
                            className="text-xs font-bold text-[#E60012] hover:underline flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md border border-red-100 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>의견 저장</span>
                          </button>
                        </div>

                        <textarea
                          rows={8}
                          value={adminOpinion}
                          onChange={e => {
                            setAdminOpinion(e.target.value);
                            setIsSavedOpinion(false);
                          }}
                          placeholder="관리자 검토 의견을 입력하세요 (예: 기술 요건 타당성 검토 결과 수주 추진 결정 등)"
                          className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs text-[#111111] leading-relaxed focus:outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/10 bg-white"
                        />

                        {!isSavedOpinion && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>수정된 의견이 저장되지 않았습니다. 상단 [의견 저장]을 누르세요.</span>
                          </div>
                        )}

                        <div className="text-[11px] text-neutral-400">
                          * 입력된 관리자 검토 의견은 제안서 생성 단계의 전략 방향성 프롬프트로 자동 반영됩니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal (Section 9) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-[#111111]">
                <XCircle className="w-5 h-5 text-neutral-500" />
                <h3 className="text-sm font-black">
                  프로젝트 진행안함 결정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              본 프로젝트를 수주 추진 대상에서 제외합니다. 사유를 선택해 주세요. 프로젝트 정보, RFP, PWin 평가 기록은 안전하게 보관됩니다.
            </p>

            {/* Rejection Reason Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#111111]">
                진행안함 사유 선택 <span className="text-[#E60012]">*</span>
              </label>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map(reason => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      selectedRejectionReason === reason
                        ? 'border-[#111111] bg-neutral-100 text-[#111111]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason}
                      checked={selectedRejectionReason === reason}
                      onChange={() => setSelectedRejectionReason(reason)}
                      className="text-[#111111]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom note */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                상세 사유 및 메모 (선택 사항)
              </label>
              <textarea
                rows={2}
                placeholder="추가 세부 사유를 입력하세요."
                value={customRejectionNote}
                onChange={e => setCustomRejectionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-black text-white bg-[#111111] hover:bg-black rounded-lg transition-colors cursor-pointer"
              >
                진행안함 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectReviewDetail;
