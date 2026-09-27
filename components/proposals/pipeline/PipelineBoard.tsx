"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  LayoutGrid,
  List,
  Sparkles,
  Star,
  User,
} from "lucide-react";

import { SAMPLE_RFPS } from "@/data/proposals/projects";
import type {
  Department,
  PipelineStage,
  ProposalProject,
  RfpItem,
  UserRole,
} from "@/types/proposals";

export interface PipelineBoardProps {
  userRole?: UserRole;
  rfpList?: RfpItem[];
  projects?: ProposalProject[];
  selectedDepartment?: Department;
  onSelectDepartment?: (dept: Department) => void;
  onUpdateStage?: (rfpId: string, newStage: PipelineStage) => void;
  onOpenRfpDetail?: (rfp: RfpItem) => void;
  onSelectProject?: (proj: ProposalProject) => void;
  onStartProposalProcess?: (rfp: RfpItem) => void;
  onOpenProjectRegister?: () => void;
  onShowToast: (msg: string) => void;
}

export const STAGES: { stage: PipelineStage; label: string; dotColor: string }[] = [
  { stage: '검토 대기', label: '검토대기', dotColor: 'bg-amber-500' },
  { stage: '검토 중', label: '검토중', dotColor: 'bg-blue-600' },
  { stage: '진행', label: '진행', dotColor: 'bg-[#E60012]' },
  { stage: '진행 안 함', label: '진행안함', dotColor: 'bg-neutral-400' }
];

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  userRole = 'admin',
  rfpList = SAMPLE_RFPS,
  projects,
  selectedDepartment = '전체',
  onSelectDepartment,
  onUpdateStage,
  onOpenRfpDetail,
  onSelectProject,
  onStartProposalProcess,
  onOpenProjectRegister,
  onShowToast
}) => {
  const [internalDept, setInternalDept] = useState<Department>(selectedDepartment || '전체');
  const [internalList, setInternalList] = useState<RfpItem[]>(rfpList || SAMPLE_RFPS);
  const [draggedRfpId, setDraggedRfpId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  const [activeStageDropdownId, setActiveStageDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveStageDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const currentDept = selectedDepartment || internalDept;
  const listToUse = (rfpList && rfpList.length > 0) ? rfpList : internalList;

  const filteredList = listToUse.filter(item => {
    if (currentDept === '전체') return true;
    return item.department === currentDept;
  });

  const getStageItems = (stage: PipelineStage) => {
    return filteredList.filter(item => item.stage === stage);
  };

  const handleDeptSelect = (dept: Department) => {
    setInternalDept(dept);
    if (onSelectDepartment) {
      onSelectDepartment(dept);
    }
  };

  const handleCardClick = (rfp: RfpItem) => {
    if (onOpenRfpDetail) {
      onOpenRfpDetail(rfp);
    } else if (onSelectProject && projects) {
      const matched = projects.find(p => p.rfpId === rfp.id) || projects[0];
      if (matched) onSelectProject(matched);
    }
  };

  const handleStartProcess = (rfp: RfpItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onStartProposalProcess) {
      onStartProposalProcess(rfp);
    } else if (onSelectProject && projects) {
      const matched = projects.find(p => p.rfpId === rfp.id) || {
        id: `proj-${rfp.id}`,
        title: rfp.title,
        agency: rfp.agency,
        budget: rfp.budget,
        deadline: rfp.deadline,
        dDay: 28,
        status: '진행',
        stage: '진행',
        manager: rfp.assignee || '정소담',
        teamMembers: rfp.participants || ['정소담'],
        pWin: rfp.pwin || 74,
        rfpId: rfp.id,
        primaryRfpFileName: rfp.primaryRfpFileName || `${rfp.title}_RFP.pdf`
      };
      onSelectProject(matched as ProposalProject);
    }
  };

  const handleQuickStageChange = (rfpId: string, targetStage: PipelineStage) => {
    if (onUpdateStage) {
      onUpdateStage(rfpId, targetStage);
    } else {
      setInternalList(prev => prev.map(r => r.id === rfpId ? { ...r, stage: targetStage } : r));
    }
    setActiveStageDropdownId(null);
    const movedItem = listToUse.find(r => r.id === rfpId);
    onShowToast(`'${movedItem?.title.slice(0, 15) || rfpId}...'이(가) [${targetStage}] 단계로 변경되었습니다.`);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedRfpId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedRfpId;
    if (id) {
      handleQuickStageChange(id, targetStage);
    }
    setDraggedRfpId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA] p-6">
      {/* Top Header Controls (Section 2 & 7: Dept Filter, View Mode, [+ 프로젝트 등록]) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3 shrink-0">
        {/* Quick Dept Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 shadow-2xs overflow-x-auto">
          {(['전체', 'AI산업본부', 'AI사업본부', '컨설팅본부', '교육사업본부', '생산성본부', 'CX본부'] as Department[]).map(dept => (
            <button
              key={dept}
              id={`dept-tab-${dept}`}
              onClick={() => handleDeptSelect(dept)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                currentDept === dept
                  ? 'bg-[#111111] text-white shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">

          {/* View Mode Toggle (칸반 / 목록) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 shadow-2xs">
            <button
              id="pipeline-view-kanban-btn"
              onClick={() => setViewType('kanban')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewType === 'kanban'
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-[#111111] hover:bg-neutral-100'
              }`}
              title="칸반 형태로 보기"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="pipeline-view-list-btn"
              onClick={() => setViewType('list')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewType === 'list'
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-[#111111] hover:bg-neutral-100'
              }`}
              title="목록 형태로 보기"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent [프로젝트 등록] Button (Section 2) */}
          <button
            id="register-project-main-btn"
            onClick={onOpenProjectRegister}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E60012] hover:bg-[#CC0010] text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer shadow-red-200"
          >
            <span>프로젝트 등록</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD VIEW (4 Stages: 검토대기 → 검토중 → 진행 → 진행안함) */}
      {viewType === 'kanban' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pt-4 min-h-0">
          {STAGES.map(({ stage, label, dotColor }) => {
            const stageItems = getStageItems(stage);
            const isProceedStage = stage === '진행';
            const isPendingStage = stage === '검토 대기';
            const isReviewingStage = stage === '검토 중';
            const isRejectedStage = stage === '진행 안 함';

            return (
              <div
                key={stage}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, stage)}
                className="flex flex-col bg-neutral-100/80 rounded-2xl border border-neutral-200/90 p-3.5 h-full overflow-hidden shadow-2xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    <span className="text-xs font-black text-[#111111] tracking-tight">
                      {label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-600 bg-white px-2.5 py-0.5 rounded-full border border-neutral-200 font-mono">
                    {stageItems.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageItems.map(rfp => (
                    <div
                      key={rfp.id}
                      draggable
                      onDragStart={e => handleDragStart(e, rfp.id)}
                      onClick={() => handleCardClick(rfp)}
                      className="bg-white rounded-xl p-4 border border-neutral-200 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group space-y-2.5"
                    >
                      {/* Department & PWin score */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                          {rfp.department || 'AI산업본부'}
                        </span>
                        <span className="text-[11px] font-black text-[#E60012] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          PWin {rfp.pwin || 74}점
                        </span>
                      </div>

                      {/* Project Title */}
                      <h2 className="text-xs font-black text-[#111111] group-hover:text-[#E60012] transition-colors line-clamp-2 leading-snug">
                        {rfp.title}
                      </h2>

                      {/* Agency, Budget, Deadline */}
                      <div className="space-y-1 text-[11px] text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate font-semibold">{rfp.agency}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="font-bold text-[#E60012]">
                            {(rfp.budget / 100000000).toFixed(1)}억원
                          </span>
                          <span className="text-neutral-400">·</span>
                          <span>마감: {rfp.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>담당자: {rfp.assignee || '정소담'}</span>
                        </div>
                      </div>

                      {/* Registration Date */}
                      <div className="pt-2 border-t border-neutral-100 text-[10px] font-mono text-neutral-400">
                        <span>등록일: {rfp.announcementDate || '2026.09.18'}</span>
                      </div>

                      {/* Contextual Action Button (Section 7) */}
                      {isProceedStage && (
                        <button
                          type="button"
                          onClick={e => handleStartProcess(rfp, e)}
                          className="w-full mt-2 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer shadow-red-200"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>작성시작</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isPendingStage && userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleCardClick(rfp);
                          }}
                          className="w-full mt-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>검토시작</span>
                        </button>
                      )}

                      {isReviewingStage && userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleCardClick(rfp);
                          }}
                          className="w-full mt-2 py-1.5 rounded-lg border border-[#111111] text-[#111111] hover:bg-neutral-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>검토재개</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {isRejectedStage && (
                        <div className="w-full mt-2 py-1 px-2 rounded bg-neutral-100 text-neutral-600 text-[10px] font-medium text-center">
                          사유: {rfp.rejectionReason || '경쟁환경 불리 (보관됨)'}
                        </div>
                      )}
                    </div>
                  ))}

                  {stageItems.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-neutral-300 rounded-xl flex items-center justify-center text-xs text-neutral-400 font-medium">
                      해당 단계 프로젝트 없음
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: LIST / TABLE VIEW */
        <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden mt-4 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-bold">
                  <th className="py-3 px-4 w-12 text-center">번호</th>
                  <th className="py-3 px-4 min-w-[260px]">프로젝트명 / 발주처</th>
                  <th className="py-3 px-3 w-28 text-center">담당부서</th>
                  <th className="py-3 px-3 w-24 text-right">사업예산</th>
                  <th className="py-3 px-3 w-28 text-center">제안마감일</th>
                  <th className="py-3 px-3 w-36 text-center">대표 RFP 여부</th>
                  <th className="py-3 px-3 w-20 text-center">PWin</th>
                  <th className="py-3 px-3 w-32 text-center">상태 (단계)</th>
                  <th className="py-3 px-3 w-24 text-center">담당자</th>
                  <th className="py-3 px-4 w-32 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredList.map((rfp, idx) => (
                  <tr
                    key={rfp.id}
                    onClick={() => handleCardClick(rfp)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center text-neutral-400 font-mono font-medium">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#111111] hover:text-[#E60012] transition-colors leading-snug">
                        {rfp.title}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1">
                        <Building2 className="w-3 h-3 text-neutral-400" />
                        <span>{rfp.agency}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {rfp.department || 'AI산업본부'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#E60012]">
                      {(rfp.budget / 100000000).toFixed(1)}억원
                    </td>

                    <td className="py-3.5 px-3 text-center text-neutral-600 font-mono">
                      {rfp.deadline}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#111111] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        <Star className="w-3 h-3 fill-[#E60012] text-[#E60012]" />
                        <span>등록 완료</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-black text-[#E60012]">
                      {rfp.pwin || 74}점
                    </td>

                    <td className="py-3.5 px-3 text-center relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setActiveStageDropdownId(prev => prev === rfp.id ? null : rfp.id);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          rfp.stage === '진행'
                            ? 'bg-red-50 text-[#E60012] border-[#E60012]/40 hover:bg-red-100'
                            : rfp.stage === '검토 중'
                            ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                            : rfp.stage === '검토 대기'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                        }`}
                        title="클릭하여 수주 단계 변경"
                      >
                        <span>{rfp.stage || '검토 대기'}</span>
                        <ChevronRight className="w-3 h-3 rotate-90 opacity-60" />
                      </button>

                      {activeStageDropdownId === rfp.id && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="absolute left-1/2 -translate-x-1/2 mt-1 w-32 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 z-50 animate-in fade-in duration-100 text-left"
                        >
                          {STAGES.map(({ stage: st, label: lb }) => (
                            <button
                              key={st}
                              onClick={() => handleQuickStageChange(rfp.id, st)}
                              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                                rfp.stage === st
                                  ? 'bg-red-50 text-[#E60012]'
                                  : 'text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              <span>{lb}</span>
                              {rfp.stage === st && <CheckCircle2 className="w-3.5 h-3.5 text-[#E60012]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center text-neutral-700 font-medium">
                      {rfp.assignee || '정소담'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {rfp.stage === '진행' ? (
                        <button
                          type="button"
                          onClick={e => handleStartProcess(rfp, e)}
                          className="px-2.5 py-1 bg-[#E60012] hover:bg-[#CC0010] text-white rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          작성시작
                        </button>
                      ) : userRole === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => handleCardClick(rfp)}
                          className="px-2.5 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 text-[#111111] rounded text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          {rfp.stage === '검토 중' ? '검토재개' : '검토시작'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
