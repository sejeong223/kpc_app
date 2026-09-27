"use client";

import React from "react";
import { ArrowLeft, BookOpen, ChevronRight, Layers, Lock, Settings } from "lucide-react";

import type {
  Department,
  ProjectSubTab,
  ProposalLnbTab,
  ProposalProject,
  UserRole,
} from "@/types/proposals";

export interface ProposalSidebarProps {
  currentLnb?: ProposalLnbTab | string;
  activeTab?: ProposalLnbTab | string;
  onLnbChange?: (tab: ProposalLnbTab | string) => void;
  onSelectTab?: (tab: ProposalLnbTab | string) => void;
  selectedDepartment?: Department;
  onSelectDepartment?: (dept: Department) => void;
  activeProject?: ProposalProject | null;
  projects?: { id: string; title: string; agency?: string; dDay?: number }[];
  onSelectProject?: (project: ProposalProject) => void;
  onExitProject?: () => void;
  currentProjectTab?: ProjectSubTab | string;
  onProjectTabChange?: (tab: ProjectSubTab | string) => void;
  userRole?: UserRole;
  onShowToast?: (msg: string) => void;
}

const ProposalSidebar: React.FC<ProposalSidebarProps> = ({
  currentLnb,
  activeTab,
  onLnbChange,
  onSelectTab,
  activeProject,
  onExitProject,
  currentProjectTab,
  onProjectTabChange,
  onShowToast
}) => {
  const activeLnbKey = currentLnb || activeTab || 'project_list';
  const activeSubKey = currentProjectTab || activeTab || 'rfp_upload';

  const handleStepClick = (stepId: string) => {
    if (typeof onProjectTabChange === 'function') {
      onProjectTabChange(stepId);
    }
    if (typeof onSelectTab === 'function') {
      onSelectTab(stepId);
    }
    if (typeof onLnbChange === 'function') {
      onLnbChange(stepId);
    }
  };

  const handleLnbClick = (tabId: ProposalLnbTab | string) => {
    if (typeof onLnbChange === 'function') {
      onLnbChange(tabId);
    }
    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    }
    if (typeof onProjectTabChange === 'function') {
      onProjectTabChange(tabId);
    }
  };

  return (
    <aside className="w-52 border-r border-neutral-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* CASE 1: INSIDE AN ACTIVE PROJECT */}
      {activeProject ? (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Back to Project List */}
          <div className="p-2.5 border-b border-neutral-200 bg-neutral-50/70">
            <button
              id="back-to-all-projects-btn"
              onClick={onExitProject}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-neutral-600 hover:text-[#E60012] hover:bg-white border border-transparent hover:border-neutral-200 transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>전체 프로젝트</span>
            </button>
            <div className="mt-2 px-0.5">
              <h2 className="text-xs font-black text-[#111111] line-clamp-1 mt-0.5" title={activeProject.title}>
                {activeProject.title}
              </h2>
              {activeProject.agency && (
                <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                  {activeProject.agency}
                </p>
              )}
            </div>
          </div>

          {/* Core Steps */}
          {(() => {
            const isUnlocked = activeProject.analysisStatus === '분석 완료';

            const handleLockedClick = (subKey: string) => {
              if (!isUnlocked) {
                if (onShowToast) {
                  onShowToast('01. 기본설정에서 [RFP 분석 시작]을 완료해야 2~5단계로 이동할 수 있습니다.');
                }
                return;
              }
              handleStepClick(subKey);
            };

            return (
              <div className="p-2 space-y-1">
                {/* STEP 1: 기본설정 */}
                <button
                  onClick={() => handleStepClick('rfp_upload')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeSubKey === 'rfp_upload' || activeSubKey === 'setup' || activeSubKey === 'rfp-docs'
                      ? 'bg-[#E60012]/10 text-[#E60012] font-black'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      activeSubKey === 'rfp_upload' || activeSubKey === 'setup' || activeSubKey === 'rfp-docs'
                        ? 'bg-[#E60012] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      01
                    </span>
                    <span className="truncate">
                      기본설정
                    </span>
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                </button>

                {/* STEP 2: 분석 */}
                <button
                  onClick={() => handleLockedClick('ai_analysis')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    !isUnlocked
                      ? 'opacity-60 text-neutral-400 bg-neutral-50/50 hover:bg-neutral-100 cursor-not-allowed'
                      : activeSubKey === 'ai_analysis' || activeSubKey === 'ai-analysis'
                      ? 'bg-[#E60012]/10 text-[#E60012] font-black cursor-pointer'
                      : 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  }`}
                  title={!isUnlocked ? '01. 기본설정에서 [RFP 분석 시작] 버튼을 눌러 분석을 진행해 주세요.' : ''}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      !isUnlocked
                        ? 'bg-neutral-200 text-neutral-400'
                        : activeSubKey === 'ai_analysis' || activeSubKey === 'ai-analysis'
                        ? 'bg-[#E60012] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      02
                    </span>
                    <span className="truncate">분석</span>
                  </div>
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                  )}
                </button>

                {/* STEP 3: 체크리스트 */}
                <button
                  onClick={() => handleLockedClick('requirements')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    !isUnlocked
                      ? 'opacity-60 text-neutral-400 bg-neutral-50/50 hover:bg-neutral-100 cursor-not-allowed'
                      : activeSubKey === 'requirements'
                      ? 'bg-[#E60012]/10 text-[#E60012] font-black cursor-pointer'
                      : 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  }`}
                  title={!isUnlocked ? '01. 기본설정에서 [RFP 분석 시작] 버튼을 눌러 분석을 진행해 주세요.' : ''}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      !isUnlocked
                        ? 'bg-neutral-200 text-neutral-400'
                        : activeSubKey === 'requirements'
                        ? 'bg-[#E60012] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      03
                    </span>
                    <span className="truncate">체크리스트</span>
                  </div>
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                  )}
                </button>

                {/* STEP 4: 작성 */}
                <button
                  onClick={() => handleLockedClick('editor')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    !isUnlocked
                      ? 'opacity-60 text-neutral-400 bg-neutral-50/50 hover:bg-neutral-100 cursor-not-allowed'
                      : activeSubKey === 'editor' || activeSubKey === 'structure' || activeSubKey === 'tasks'
                      ? 'bg-[#E60012]/10 text-[#E60012] font-black cursor-pointer'
                      : 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  }`}
                  title={!isUnlocked ? '01. 기본설정에서 [RFP 분석 시작] 버튼을 눌러 분석을 진행해 주세요.' : ''}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      !isUnlocked
                        ? 'bg-neutral-200 text-neutral-400'
                        : activeSubKey === 'editor' || activeSubKey === 'structure' || activeSubKey === 'tasks'
                        ? 'bg-[#E60012] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      04
                    </span>
                    <span className="truncate">작성</span>
                  </div>
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                  )}
                </button>

                {/* STEP 5: 검토 */}
                <button
                  onClick={() => handleLockedClick('matrix')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    !isUnlocked
                      ? 'opacity-60 text-neutral-400 bg-neutral-50/50 hover:bg-neutral-100 cursor-not-allowed'
                      : activeSubKey === 'matrix'
                      ? 'bg-[#E60012]/10 text-[#E60012] font-black cursor-pointer'
                      : 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  }`}
                  title={!isUnlocked ? '01. 기본설정에서 [RFP 분석 시작] 버튼을 눌러 분석을 진행해 주세요.' : ''}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      !isUnlocked
                        ? 'bg-neutral-200 text-neutral-400'
                        : activeSubKey === 'matrix'
                        ? 'bg-[#E60012] text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      05
                    </span>
                    <span className="truncate">검토</span>
                  </div>
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                  )}
                </button>
              </div>
            );
          })()}

          {/* Divider */}
          <div className="px-3 my-1.5">
            <div className="border-t border-neutral-200" />
          </div>

          {/* Extra Project Menu */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => handleStepClick('proj-settings')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubKey === 'proj-settings' || activeSubKey === 'settings'
                  ? 'bg-neutral-100 text-[#111111]'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">프로젝트 설정</span>
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: MAIN PROPOSALS PIPELINE / GENERAL VIEW */
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          <div className="p-3 border-b border-neutral-200">
            <h2 className="text-[11px] font-black text-[#111111] uppercase tracking-wider">
              제안서 생성
            </h2>
          </div>

          <div className="p-2 space-y-1">
            <button
              id="lnb-pipeline-btn"
              onClick={() => handleLnbClick('pipeline')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLnbKey === 'pipeline'
                  ? 'bg-[#E60012]/10 text-[#E60012] font-black'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">제안 목록</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
            </button>

            <button
              id="lnb-library-btn"
              onClick={() => handleLnbClick('library')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLnbKey === 'library'
                  ? 'bg-[#E60012]/10 text-[#E60012] font-black'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">자료 라이브러리</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
            </button>

            <button
              id="lnb-settings-btn"
              onClick={() => handleLnbClick('settings')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLnbKey === 'settings'
                  ? 'bg-[#E60012]/10 text-[#E60012] font-black'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">제안 설정</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ProposalSidebar;
