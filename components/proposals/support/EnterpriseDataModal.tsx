"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Database,
  Plus,
  Eye,
  Check,
  Building2,
  FolderArchive,
  Folder,
  FolderOpen,
  FolderTree,
  ChevronRight
} from 'lucide-react';
import { ENTERPRISE_KNOWLEDGE_BASE } from '@/data/proposals/library';
import type { ProposalLibraryItem, ProposalProject } from '@/types/proposals';

export interface EnterpriseDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: ProposalProject;
  existingItemIds?: string[];
  onImportItems?: (selectedItems: ProposalLibraryItem[]) => void;
  onShowToast?: (msg: string) => void;
  onPreviewItem?: (item: ProposalLibraryItem) => void;
}

export const EnterpriseDataModal: React.FC<EnterpriseDataModalProps> = ({
  isOpen,
  onClose,
  existingItemIds = [],
  onImportItems = () => {},
  onPreviewItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderCategory, setSelectedFolderCategory] = useState('전체');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internalPreviewItem, setInternalPreviewItem] = useState<ProposalLibraryItem | null>(null);

  const handlePreviewClick = (item: ProposalLibraryItem) => {
    if (onPreviewItem) {
      onPreviewItem(item);
    }
    setInternalPreviewItem(item);
  };

  const folderCategories = [
    { id: 'all', name: '전체' },
    { id: 'proposals', name: '기존 제안서' },
    { id: 'tech', name: '기술역량' },
    { id: 'method', name: '방법론' },
    { id: 'cases', name: '수행 사례' },
    { id: 'certs', name: '인증 및 증빙' },
  ];

  const departments = [
    '전체',
    'AI사업본부',
    '기술보안팀',
    '컨설팅본부',
    '경영지원본부',
    '교육혁신본부'
  ];

  // 사내 데이터 필터링 (전체 폴더 기반)
  const filteredList = useMemo(() => {
    return ENTERPRISE_KNOWLEDGE_BASE.filter(item => {
      // 카테고리 폴더 필터
      if (selectedFolderCategory !== '전체' && item.category !== selectedFolderCategory) {
        return false;
      }
      // 부서별 폴더 필터
      if (selectedDepartment !== '전체' && item.department !== selectedDepartment) {
        return false;
      }
      // 검색어 필터
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(query);
        const matchDesc = (item.description || '').toLowerCase().includes(query);
        const matchDept = (item.department || '').toLowerCase().includes(query);
        const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchDept && !matchTags) {
          return false;
        }
      }
      return true;
    });
  }, [selectedFolderCategory, selectedDepartment, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const unimportedVisible = filteredList
      .filter(i => !existingItemIds.includes(i.id))
      .map(i => i.id);

    if (selectedIds.length === unimportedVisible.length && unimportedVisible.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unimportedVisible);
    }
  };

  const handleConfirmImport = () => {
    if (selectedIds.length === 0) return;
    const itemsToImport = ENTERPRISE_KNOWLEDGE_BASE.filter(item => selectedIds.includes(item.id));
    onImportItems(itemsToImport);
    setSelectedIds([]);
    onClose();
  };

  // 현재 폴더 경로 브레드크럼
  const currentPath = useMemo(() => {
    const parts = ['사내 저장소'];
    if (selectedFolderCategory !== '전체') {
      parts.push(selectedFolderCategory);
    }
    if (selectedDepartment !== '전체') {
      parts.push(selectedDepartment);
    }
    if (parts.length === 1) {
      parts.push('전체 폴더');
    }
    return parts;
  }, [selectedFolderCategory, selectedDepartment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold shadow-xs">
              <FolderArchive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black text-[#111111]">
                  사내 자료 저장소 (전체 폴더)
                </h2>
                <span className="text-[11px] font-mono font-bold bg-neutral-200/80 text-neutral-700 px-2 py-0.5 rounded">
                  총 {ENTERPRISE_KNOWLEDGE_BASE.length}건 보관
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">
                사내 중앙 저장소의 폴더를 탐색하여 필요한 제안서, 기술역량, 방법론, 실적 증빙 문서를 선택하고 프로젝트에 등록합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Explorer: Left Folder Directory / Right Document Browser */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Directory Navigation */}
          <div className="w-56 border-r border-neutral-200 bg-[#FBFBFB] flex flex-col shrink-0 select-none">
            <div className="p-3 border-b border-neutral-200 text-xs font-bold text-neutral-600 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-neutral-700" />
                <span>폴더 디렉터리</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
              {/* 자료 유형별 폴더 */}
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  자료 유형별 폴더
                </div>
                <div className="space-y-0.5 mt-1">
                  {folderCategories.map(cat => {
                    const count = cat.name === '전체'
                      ? ENTERPRISE_KNOWLEDGE_BASE.length
                      : ENTERPRISE_KNOWLEDGE_BASE.filter(i => i.category === cat.name).length;
                    const isSelected = selectedFolderCategory === cat.name;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedFolderCategory(cat.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-2xs'
                            : 'text-neutral-700 hover:bg-neutral-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{cat.name === '전체' ? '전체 폴더' : cat.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-200/80 text-neutral-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 담당 부서별 폴더 */}
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  담당 부서별 폴더
                </div>
                <div className="space-y-0.5 mt-1">
                  {departments.map(dept => {
                    const count = dept === '전체'
                      ? ENTERPRISE_KNOWLEDGE_BASE.length
                      : ENTERPRISE_KNOWLEDGE_BASE.filter(i => i.department === dept).length;
                    const isSelected = selectedDepartment === dept;

                    return (
                      <button
                        key={dept}
                        onClick={() => setSelectedDepartment(dept)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#E60012] text-white shadow-2xs'
                            : 'text-neutral-700 hover:bg-neutral-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                          <span className="truncate">{dept === '전체' ? '전체 부서' : dept}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-200/80 text-neutral-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Folder Status Footer */}
            <div className="p-2.5 border-t border-neutral-200 bg-neutral-100/60 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>선택 폴더 파일:</span>
              <strong className="font-mono text-neutral-800">{filteredList.length}개</strong>
            </div>
          </div>

          {/* Right Document Browser */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Top Toolbar: Path Breadcrumbs & Search */}
            <div className="p-3.5 border-b border-neutral-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Breadcrumbs Path */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                <Database className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                {currentPath.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-neutral-400" />}
                    <span className={idx === currentPath.length - 1 ? 'font-bold text-[#111111]' : 'text-neutral-500'}>
                      {segment}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="파일명, 본문 키워드, 태그 검색..."
                  className="w-full bg-white pl-8 pr-3 py-1.5 rounded-md border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>

            {/* Selection & Batch Action Toolbar */}
            <div className="px-4 py-2.5 border-b border-neutral-200 bg-white flex items-center justify-between text-xs text-neutral-600 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-xs font-bold text-neutral-800 hover:text-[#E60012] cursor-pointer flex items-center gap-1.5"
                >
                  <span>현재 폴더 항목 전체 선택</span>
                </button>
                <span>·</span>
                <span>
                  선택됨: <strong className="text-[#E60012]">{selectedIds.length}건</strong>
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                목록의 [샘플 미리보기]로 원문 발췌문과 목차를 열람할 수 있습니다.
              </span>
            </div>

            {/* Document Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FA]">
              {filteredList.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-lg border border-neutral-200">
                  <FolderArchive className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-neutral-700">해당 폴더에 일치하는 자료가 없습니다.</p>
                  <p className="text-[11px] text-neutral-400 mt-1">좌측 다른 폴더를 선택하거나 검색어를 초기화해보세요.</p>
                </div>
              ) : (
                filteredList.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const isAlreadyImported = existingItemIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-lg border transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isAlreadyImported
                          ? 'border-neutral-200 opacity-60 bg-neutral-50'
                          : isSelected
                          ? 'border-[#E60012] ring-1 ring-[#E60012]/30 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-400 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            disabled={isAlreadyImported}
                            checked={isSelected || isAlreadyImported}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded text-[#E60012] focus:ring-[#E60012] cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 font-bold">
                              {item.fileFormat} · {item.size}
                            </span>
                            {item.department && (
                              <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-neutral-400" />
                                <span>{item.department}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {item.updatedAt}
                            </span>
                            {isAlreadyImported && (
                              <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded">
                                이미 등록됨
                              </span>
                            )}
                          </div>

                          <h3 className="text-xs font-bold text-[#111111] leading-snug">
                            {item.title}
                          </h3>

                          <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.tags?.map(t => (
                              <span key={t} className="text-[9px] text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions Right */}
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-100">
                        <button
                          type="button"
                          onClick={() => handlePreviewClick(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span>샘플 미리보기</span>
                        </button>

                        <button
                          type="button"
                          disabled={isAlreadyImported}
                          onClick={() => toggleSelect(item.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                            isAlreadyImported
                              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#111111] text-white'
                              : 'bg-red-50 hover:bg-red-100 text-[#E60012] border border-[#E60012]/30'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>선택 해제</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>가져오기 선택</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-600">
            총 <strong>{selectedIds.length}개</strong>의 사내 자료가 선택되었습니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E60012] hover:bg-[#CC0010] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>선택한 자료 프로젝트에 등록하기 ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Internal Document Preview Overlay Modal */}
      {internalPreviewItem && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-white">
                  {internalPreviewItem.category}
                </span>
                <h3 className="text-sm font-bold text-[#111111] truncate max-w-md">
                  {internalPreviewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setInternalPreviewItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-700 leading-relaxed">
              <div className="flex flex-wrap gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-neutral-400">부서: </span>
                  <strong className="text-neutral-800">{internalPreviewItem.department || '사내 공통'}</strong>
                </div>
                <div>
                  <span className="text-neutral-400">포맷: </span>
                  <strong className="text-neutral-800 font-mono">{internalPreviewItem.fileFormat} ({internalPreviewItem.size})</strong>
                </div>
                <div>
                  <span className="text-neutral-400">최종 수정: </span>
                  <strong className="text-neutral-800 font-mono">{internalPreviewItem.updatedAt}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#111111] mb-1">문서 개요</h4>
                <p className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 leading-relaxed text-neutral-800">
                  {internalPreviewItem.description}
                </p>
              </div>

              {internalPreviewItem.previewContent?.sampleText && (
                <div>
                  <h4 className="font-bold text-[#111111] mb-1">원문 주요 발췌</h4>
                  <div className="p-3 bg-neutral-900 text-neutral-200 font-mono text-[11px] rounded-lg leading-relaxed whitespace-pre-wrap">
                    {internalPreviewItem.previewContent.sampleText}
                  </div>
                </div>
              )}

              {internalPreviewItem.previewContent?.toc && internalPreviewItem.previewContent.toc.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#111111] mb-1">목차 구성</h4>
                  <ul className="list-disc list-inside space-y-0.5 p-3 bg-neutral-50 rounded-lg border border-neutral-200 font-mono text-[11px]">
                    {internalPreviewItem.previewContent.toc.map((toc, i) => (
                      <li key={i} className="text-neutral-700">{toc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-neutral-200 bg-[#F8F9FA] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-neutral-500">
                체크박스를 선택하여 프로젝트에 가져올 수 있습니다.
              </span>
              <button
                onClick={() => setInternalPreviewItem(null)}
                className="px-4 py-1.5 bg-[#111111] text-white rounded text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
