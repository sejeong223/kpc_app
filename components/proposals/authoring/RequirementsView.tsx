"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckSquare,
  Edit3,
  FileText,
  Square,
  Trash2,
  User,
  X,
} from "lucide-react";
import { INITIAL_KPC_CHECKLIST } from "@/data/proposals/authoring";
import type { ChecklistRequirement, ProposalProject } from "@/types/proposals";

export function formatRfpPageOnly(source?: string, rfpPage?: number): string {
  if (rfpPage) return `p.${rfpPage}`;
  if (!source) return 'p.1';
  const match = source.match(/p\.\s*(\d+)/i) || source.match(/(\d+)\s*p/i) || source.match(/(\d+)\s*페이지/i);
  if (match && match[1]) return `p.${match[1]}`;
  const digits = source.replace(/[^\d]/g, '');
  if (digits) return `p.${digits}`;
  return source.split(' ')[0] || 'p.1';
}

export function formatProposalBodyPage(item: ChecklistRequirement): string {
  if (item.bodyPage) return item.bodyPage.startsWith('p.') ? item.bodyPage : `p.${item.bodyPage}`;
  return '-';
}

export interface RequirementsViewProps {
  activeProject?: ProposalProject | null;
  onNavigateToProjects?: () => void;
  onNavigateToProjectRoot?: () => void;
  onNavigateNext: () => void;
  onShowToast: (msg: string) => void;
  requirementsList?: ChecklistRequirement[];
  onUpdateRequirements?: (list: ChecklistRequirement[]) => void;
  currentUserName?: string;
}

export const RequirementsView: React.FC<RequirementsViewProps> = ({
  onShowToast,
  requirementsList,
  onUpdateRequirements,
  currentUserName = '정소담'
}) => {
  const [items, setItems] = useState<ChecklistRequirement[]>(
    requirementsList || INITIAL_KPC_CHECKLIST
  );


  // Modals & Active Item State
  const [citationModalItem, setCitationModalItem] = useState<ChecklistRequirement | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistRequirement | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ChecklistRequirement | null>(null);

  // Form State
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState<string>('제출기한/장소');
  const [formSource, setFormSource] = useState('RFP p.10 / 제출안내');
  const [formRfpQuote, setFormRfpQuote] = useState('');

  const syncItems = (newItems: ChecklistRequirement[]) => {
    setItems(newItems);
    if (onUpdateRequirements) {
      onUpdateRequirements(newItems);
    }
  };

  // Toggle Complete Check
  const handleToggleCheck = (id: string) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const next = items.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        const nextCompletedBy = nextChecked ? currentUserName : '-';
        const nextCompletedAt = nextChecked ? nowStr : undefined;

        if (nextChecked) {
          onShowToast(`'${item.text.slice(0, 20)}...' 항목을 완료 처리했습니다. (완료자: ${currentUserName})`);
        } else {
          onShowToast(`'${item.text.slice(0, 20)}...' 항목의 완료 상태를 해제했습니다.`);
        }

        return {
          ...item,
          checked: nextChecked,
          completedBy: nextCompletedBy,
          completedAt: nextCompletedAt
        };
      }
      return item;
    });
    syncItems(next);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormText('');
    setFormCategory('제출기한/장소');
    setFormSource('RFP p.10 / 제출안내');
    setFormRfpQuote('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ChecklistRequirement) => {
    setEditingItem(item);
    setFormText(item.text);
    setFormCategory(item.category || '제출기한/장소');
    setFormSource(item.source);
    setFormRfpQuote(item.rfpQuote || '');
    setIsAddModalOpen(true);
  };

  // Save Form (Add / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;

    if (editingItem) {
      const updated = items.map(it => it.id === editingItem.id ? {
        ...it,
        text: formText.trim(),
        category: formCategory,
        source: formSource.trim() || 'RFP 출처 미기재',
        rfpQuote: formRfpQuote.trim() || it.rfpQuote
      } : it);
      syncItems(updated);
      onShowToast('체크리스트 항목이 수정되었습니다.');
    } else {
      const count = items.length + 1;
      const newItem: ChecklistRequirement = {
        id: `CHK-${String(count).padStart(3, '0')}`,
        category: formCategory,
        text: formText.trim(),
        source: formSource.trim() || 'RFP 직접 추가',
        rfpQuote: formRfpQuote.trim() || undefined,
        checked: false,
        completedBy: '-',
        type: '체크사항'
      };
      syncItems([newItem, ...items]);
      onShowToast('새 제출 체크리스트 항목이 추가되었습니다.');
    }

    setIsAddModalOpen(false);
  };

  // Delete Item
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const updated = items.filter(it => it.id !== deleteConfirmItem.id);
    syncItems(updated);
    onShowToast(`'${deleteConfirmItem.text.slice(0, 20)}...' 항목이 삭제되었습니다.`);
    setDeleteConfirmItem(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F9FA] overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Main Checklist Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/70 border-b border-neutral-200 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">완료</th>
                  <th className="py-3 px-4">항목 내용</th>
                  <th className="py-3 px-4 w-48 sm:w-56">RFP 출처</th>
                  <th className="py-3 px-4 w-32">완료한 사람</th>
                  <th className="py-3 px-4 w-28 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400 bg-neutral-50/30">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-xs">제출 체크리스트 항목이 없습니다.</p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="mt-3 text-xs font-bold text-[#E60012] hover:underline cursor-pointer"
                      >
                        + 새 체크리스트 직접 추가하기
                      </button>
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const isDone = item.checked;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDone
                            ? 'bg-neutral-50/40 hover:bg-neutral-50/80 text-neutral-600'
                            : 'hover:bg-neutral-50/80 text-[#111111]'
                        }`}
                      >
                        {/* 1. 완료 체크박스 */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(item.id)}
                            className="p-1 rounded hover:bg-neutral-200/60 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title={isDone ? '완료 취소하기' : '완료 처리하기'}
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-[#E60012]" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-300 hover:text-neutral-500" />
                            )}
                          </button>
                        </td>

                        {/* 2. 항목 내용 */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className={`font-semibold leading-relaxed ${isDone ? 'opacity-70 font-normal' : 'text-[#111111] font-bold'}`}>
                            {item.text}
                          </span>
                        </td>

                        {/* 3. RFP 출처 (클릭 시 RFP 원문 뷰어/팝업 확인) */}
                        <td className="py-3.5 px-4 align-middle">
                          <button
                            type="button"
                            onClick={() => setCitationModalItem(item)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-[#E60012] bg-neutral-100 hover:bg-red-50/60 px-2.5 py-1 rounded-md border border-neutral-200/80 transition-colors cursor-pointer text-left truncate max-w-[220px]"
                            title="클릭하여 RFP 원문 근거 확인"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#E60012] shrink-0" />
                            <span className="truncate">{item.source}</span>
                          </button>
                        </td>

                        {/* 4. 완료한 사람 */}
                        <td className="py-3.5 px-4 align-middle text-neutral-600 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <User className={`w-3.5 h-3.5 ${isDone ? 'text-neutral-500' : 'text-neutral-300'}`} />
                            <span className={isDone ? 'font-bold text-[#111111]' : 'text-neutral-400'}>
                              {item.completedBy || '-'}
                            </span>
                          </div>
                        </td>

                        {/* 5. 작업 (수정 / 삭제) */}
                        <td className="py-3.5 px-4 text-center align-middle shrink-0">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                              title="항목 수정"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(item)}
                              className="p-1.5 text-neutral-400 hover:text-[#E60012] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="항목 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: RFP 원문 근거 뷰어 팝업 (Citation Reader Modal) */}
      {/* ============================================================ */}
      {citationModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E60012]" />
                <h3 className="text-sm font-black text-[#111111]">
                  RFP 원문 근거 및 출처 위치
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCitationModalItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 block mb-1">체크리스트 항목</span>
                <p className="font-bold text-[#111111] bg-neutral-50 p-3 rounded-xl border border-neutral-200 leading-relaxed">
                  [{citationModalItem.category}] {citationModalItem.text}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-400 block mb-1">추출 위치 및 RFP 출처</span>
                <p className="font-bold text-[#E60012] bg-red-50/50 p-2.5 rounded-lg border border-red-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#E60012] shrink-0" />
                  <span>{citationModalItem.source}</span>
                </p>
              </div>

              {citationModalItem.rfpQuote && (
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 block mb-1">RFP 원문 발췌 내용</span>
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl text-neutral-800 leading-relaxed font-mono text-[11px] relative">
                    <span className="absolute left-2 top-2 text-amber-400 text-lg">&quot;</span>
                    <p className="pl-3">{citationModalItem.rfpQuote}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCitationModalItem(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#111111] hover:bg-black rounded-xl transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: 체크리스트 추가 / 수정 모달 (Add / Edit Modal) */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveForm}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-neutral-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-sm font-black text-[#111111]">
                {editingItem ? '체크리스트 항목 수정' : '+ 새 체크리스트 추가'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111111] mb-1">
                  구분 카테고리 <span className="text-[#E60012]">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                >
                  <option value="제출기한/장소">제출기한/장소</option>
                  <option value="제출부수/매체">제출부수/매체</option>
                  <option value="서식/규격">서식/규격</option>
                  <option value="날인/밀봉">날인/밀봉</option>
                  <option value="증빙/별첨">증빙/별첨</option>
                  <option value="발표/기타">발표/기타</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">
                  체크리스트 내용 <span className="text-[#E60012]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="예: 제안서 원본 1부(법인인감 직인) 및 사본 9부 제출"
                  value={formText}
                  onChange={e => setFormText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#E60012] leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">
                  RFP 출처 위치 (선택/수정 가능)
                </label>
                <input
                  type="text"
                  placeholder="예: RFP p.42 / 7. 제안서 제출방법"
                  value={formSource}
                  onChange={e => setFormSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-600 mb-1">
                  RFP 원문 근거 문장 (선택 사항)
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 제안서 원본 1부 및 사본 9부를 기한 내 직접 방문하여 제출하여야 함"
                  value={formRfpQuote}
                  onChange={e => setFormRfpQuote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black text-white bg-[#E60012] hover:bg-[#CC0010] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {editingItem ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: 항목 삭제 확인 모달 (Delete Confirmation Modal) */}
      {/* ============================================================ */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-center gap-3 text-[#E60012]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-black text-[#111111]">
                체크리스트 항목 삭제 Confirm
              </h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              &quot;<span className="font-bold text-[#111111]">{deleteConfirmItem.text}</span>&quot;<br />
              항목을 체크리스트에서 삭제하시겠습니까? 삭제된 항목은 복구할 수 없습니다.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-black text-white bg-[#E60012] hover:bg-[#CC0010] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsView;
