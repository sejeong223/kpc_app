"use client";

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Settings,
  Check,
  X,
  Building2,
  UserCheck,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { ProposalSectionItem } from '@/components/proposals/editor/EditorView';
import {
  applyAllFactCheckIssues,
  applyFactCheckIssue,
  collectPassedFacts,
  createFactCheckRules,
  DEFAULT_FACT_BASELINE,
  detectFactCheckIssues,
  type FactBaseline,
  type FactCheckIssue,
} from '@/lib/proposals/review';

export type {
  FactCheckIssue,
  FactCheckRule,
  FactPassedItem,
} from '@/lib/proposals/review';

export interface FactCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ProposalSectionItem[];
  onUpdateSections?: (sections: ProposalSectionItem[]) => void;
  onOpenEditorSection?: (sectionId: string) => void;
  onShowToast: (msg: string) => void;
}

export const FactCheckModal: React.FC<FactCheckModalProps> = ({
  isOpen,
  onClose,
  sections,
  onUpdateSections,
  onOpenEditorSection,
  onShowToast
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'person' | 'project' | 'passed'>('all');
  const [showSettings, setShowSettings] = useState(false);

  // 검증 기준값 (사용자가 직접 수정 가능)
  const [baseline, setBaseline] = useState<FactBaseline>({ ...DEFAULT_FACT_BASELINE });

  // 팩트체크 기본 규칙 목록 (동적 기준값 연동)
  const rules = useMemo(() => createFactCheckRules(baseline), [baseline]);

  // 섹션 본문 전수 스캔하여 이슈 추출
  const detectedIssues = useMemo(
    () => detectFactCheckIssues(sections, rules),
    [rules, sections]
  );

  // 정상 일치(통과) 팩트 통계
  const passedFacts = useMemo(() => collectPassedFacts(sections), [sections]);

  // 필터된 이슈 목록
  const filteredIssues = useMemo(() => {
    if (activeTab === 'all') return detectedIssues;
    if (activeTab === 'passed') return [];
    return detectedIssues.filter(iss => iss.category === activeTab);
  }, [detectedIssues, activeTab]);

  // 재검증 스캔 트리거
  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onShowToast('제안서 본문 사실관계 검증이 완료되었습니다.');
    }, 600);
  };

  // 단일 이슈 원클릭 교체
  const handleQuickFixSingle = (issue: FactCheckIssue) => {
    if (!onUpdateSections) {
      onShowToast('섹션 업데이트 권한이 없습니다.');
      return;
    }

    onUpdateSections(applyFactCheckIssue(sections, issue));
    onShowToast(`'${issue.wrongText}'을(를) '${issue.correctText}'(으)로 즉시 교체했습니다.`);
  };

  // 전체 오류 항목 일괄 교체
  const handleQuickFixAll = () => {
    if (!onUpdateSections) {
      onShowToast('섹션 업데이트 권한이 없습니다.');
      return;
    }

    if (detectedIssues.length === 0) {
      onShowToast('수정할 사실관계 오류가 없습니다.');
      return;
    }

    onUpdateSections(applyAllFactCheckIssues(sections, detectedIssues));
    onShowToast(`발견된 총 ${detectedIssues.length}건의 사실관계 오류를 올바른 명칭으로 일괄 교체했습니다.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-neutral-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#E60012] flex items-center justify-center shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#111111]">제안서 사실관계검증 (Fact-Check)</h3>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#E60012] text-[10px] font-bold">
                  AI 팩트체커
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                발주처 기관명, 제안사명, 회장/대표자 성함, 사업 기간 등 주요 사실관계 오류를 전수 대조합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className={`p-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showSettings 
                  ? 'bg-neutral-800 text-white border-neutral-800' 
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="검증 기준값 설정"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">기준값 설정</span>
            </button>
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="p-2 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="재검증 실행"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#E60012]' : ''}`} />
              <span className="hidden sm:inline">다시 검증</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fact Baseline Settings Drawer (Collapsible) */}
        {showSettings && (
          <div className="bg-neutral-50 border-b border-neutral-200 p-4 shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#111111] flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5 text-[#E60012]" />
                  공식 사실관계 검증 기준값 (Baseline Facts)
                </span>
                <span className="text-[10px] text-neutral-500">
                  RFP 공고 및 제안 기준 정보를 입력하면 실시간으로 오기를 찾아냅니다.
                </span>
              </div>
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleRescan();
                }}
                className="px-2.5 py-1 rounded bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] cursor-pointer"
              >
                기준값 적용 및 재검증
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  발주처 공식 명칭
                </label>
                <input
                  type="text"
                  value={baseline.clientName}
                  onChange={e => setBaseline({ ...baseline, clientName: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-md px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  발주처 회장/기관장 성함
                </label>
                <input
                  type="text"
                  value={baseline.clientLeader}
                  onChange={e => setBaseline({ ...baseline, clientLeader: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-md px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  제안사 공식 명칭
                </label>
                <input
                  type="text"
                  value={baseline.vendorName}
                  onChange={e => setBaseline({ ...baseline, vendorName: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-md px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  제안사 대표이사 성함
                </label>
                <input
                  type="text"
                  value={baseline.vendorLeader}
                  onChange={e => setBaseline({ ...baseline, vendorLeader: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-md px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats Strip & Quick Fix Banner */}
        <div className="bg-white border-b border-neutral-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">확인 필요(오류/주의):</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                detectedIssues.length > 0 ? 'bg-red-100 text-[#E60012]' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {detectedIssues.length}건
              </span>
            </div>
            <div className="h-3 w-px bg-neutral-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">정상 일치 팩트:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {passedFacts.length}개 항목
              </span>
            </div>
            <div className="h-3 w-px bg-neutral-200" />
            <div className="text-neutral-500">
              전체 검토 섹션: <strong className="text-neutral-800 font-mono">{sections.length}개 파트</strong>
            </div>
          </div>

          {detectedIssues.length > 0 && (
            <button
              onClick={handleQuickFixAll}
              className="px-3.5 py-1.5 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>발견된 오류 전체 일괄 교체 ({detectedIssues.length}건)</span>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="px-6 border-b border-neutral-200 bg-neutral-50 flex items-center gap-1 shrink-0 overflow-x-auto">
          {[
            { key: 'all', label: '전체 오류', count: detectedIssues.length },
            { key: 'company', label: '회사/기관명', count: detectedIssues.filter(i => i.category === 'company').length, icon: Building2 },
            { key: 'person', label: '회장/대표자/직책', count: detectedIssues.filter(i => i.category === 'person').length, icon: UserCheck },
            { key: 'project', label: '사업명/연도/기간', count: detectedIssues.filter(i => i.category === 'project').length, icon: Calendar },
            { key: 'passed', label: '정상 일치 팩트', count: passedFacts.length, icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#E60012] text-[#E60012] bg-white'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive 
                    ? 'bg-red-50 text-[#E60012]' 
                    : tab.key === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Issues List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-[#F8F9FA]">
          {isScanning ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#E60012] animate-spin mx-auto" />
              <p className="text-sm font-bold text-neutral-800">제안서 전 섹션 사실관계 전수 검증 중...</p>
              <p className="text-xs text-neutral-500">발주처 기관명, 회장님 성함, 제안사명, 입찰 연도 일치 여부를 대조하고 있습니다.</p>
            </div>
          ) : activeTab === 'passed' ? (
            /* 정상 일치 항목 리스트 */
            <div className="space-y-2.5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>아래 항목들은 제안서 본문 내에서 공식 명칭 및 기준 팩트에 부합하게 기재되어 있습니다.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {passedFacts.map(pf => (
                  <div key={pf.id} className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                        {pf.categoryLabel}
                      </span>
                      <span className="text-[11px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        본문 {pf.matchCount}회 일치
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#111111]">{pf.title}</h4>
                    <p className="text-[11px] text-neutral-500">{pf.description}</p>
                    <div className="pt-1.5 border-t border-neutral-100 text-[11px] font-mono text-neutral-700">
                      확인된 정식 팩트: <strong className="text-emerald-700 font-bold">&quot;{pf.matchedText}&quot;</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredIssues.length === 0 ? (
            /* 오류 없음 상태 */
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-neutral-200 p-8 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900">발견된 사실관계 오류가 없습니다!</h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                회사명, 발주처 기관명, 회장님 성함 및 사업 주요 사실이 공식 기준에 완벽하게 일치합니다.
              </p>
            </div>
          ) : (
            /* 발견된 오류 카드 리스트 */
            <div className="space-y-3">
              {filteredIssues.map(issue => (
                <div 
                  key={issue.id}
                  className="bg-white rounded-xl p-4 border border-neutral-200 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        issue.severity === 'critical'
                          ? 'bg-red-100 text-[#E60012]'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {issue.severity === 'critical' ? '심각한 팩트 오류' : '주의 및 확인'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                        {issue.categoryLabel}
                      </span>
                      <h4 className="text-xs font-black text-[#111111]">
                        {issue.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-neutral-400 font-mono text-[11px]">발생 위치:</span>
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenEditorSection) onOpenEditorSection(issue.sectionId);
                        }}
                        className="font-bold text-neutral-800 hover:text-[#E60012] flex items-center gap-1 transition-colors cursor-pointer"
                        title="이 섹션 편집기로 이동"
                      >
                        <span>Sec {issue.sectionNumber} {issue.sectionTitle}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400" />
                      </button>
                    </div>
                  </div>

                  {/* Fact Contrast Box (틀린 표현 vs 올바른 정식 표기) */}
                  <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 block">발견된 오류 표기</span>
                        <span className="inline-block px-2 py-1 rounded bg-red-50 text-red-700 font-bold border border-red-200 line-through">
                          {issue.wrongText}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 mt-3" />

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-600 block">올바른 권장 팩트</span>
                        <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 font-mono">
                          {issue.correctText}
                        </span>
                      </div>
                    </div>

                    {/* Quick Fix Button */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleQuickFixSingle(issue)}
                        className="px-3 py-1.5 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>즉시 교체</span>
                      </button>
                    </div>
                  </div>

                  {/* Snippet & Analysis Reason */}
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-mono leading-relaxed border border-neutral-200/70">
                      <span className="text-neutral-400 font-sans block text-[10px] mb-0.5 font-bold">본문 문맥:</span>
                      {issue.contextSnippet.split(issue.wrongText).map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className="bg-red-200 text-red-900 font-bold px-1 rounded">
                              {issue.wrongText}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-normal pl-1">
                      💡 <strong>검증 의견:</strong> {issue.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500">
            {detectedIssues.length > 0 ? (
              <span className="text-[#E60012] font-bold">
                ⚠️ 총 {detectedIssues.length}건의 사실관계 불일치가 감지되었습니다.
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                모든 사실관계가 공식 기준과 일치합니다.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              닫기
            </button>
            {detectedIssues.length > 0 && (
              <button
                type="button"
                onClick={handleQuickFixAll}
                className="px-4 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>일괄 교체 반영</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FactCheckModal;
