"use client";

import React, { useState } from 'react';
import {
  Search,
  FolderArchive,
  Download,
  Eye,
  Database,
  Trash2,
} from 'lucide-react';
import { SAMPLE_LIBRARY_ITEMS } from '@/data/proposals/library';
import type { LibraryItem, ProposalLibraryItem, ProposalProject } from '@/types/proposals';
import { EnterpriseDataModal } from './EnterpriseDataModal';
import { DocumentPreviewModal } from '@/components/proposals/review/DocumentPreviewModal';

export interface ProposalLibraryProps {
  activeProject?: ProposalProject;
  onShowToast: (msg: string) => void;
}

export const ProposalLibrary: React.FC<ProposalLibraryProps> = ({
  activeProject,
  onShowToast
}) => {
  const [items, setItems] = useState<LibraryItem[]>(SAMPLE_LIBRARY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // Enterprise Data Import Modal State
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);

  // Document Preview Modal State
  const [previewTargetItem, setPreviewTargetItem] = useState<ProposalLibraryItem | null>(null);

  // Categories
  const categories = ['전체', '방법론', '기존 제안서', '회사 소개', '수행 사례', '인력 정보', '인증 및 증빙', '기술역량'];

  const filtered = (items || []).filter(item => {
    if (!item) return false;
    const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory;
    const title = item.title || '';
    const desc = item.description || '';
    const tags = item.tags || [];
    const dept = item.department || '';
    const matchesSearch =
      !searchQuery.trim() ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(t => (t || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handle Import from Enterprise Knowledge Base
  const handleImportItems = (newItems: ProposalLibraryItem[]) => {
    const freshItems = newItems.filter(ni => !items.some(i => i.id === ni.id));
    if (freshItems.length === 0) {
      onShowToast('선택한 자료가 이미 등록되어 있습니다.');
      return;
    }
    setItems(prev => [...freshItems, ...prev]);
    onShowToast(`사내 데이터베이스에서 ${freshItems.length}건의 자료를 가져왔습니다.`);
  };

  // Delete Item from Project
  const handleDeleteItem = (id: string, title: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    onShowToast(`'${title}' 자료가 프로젝트에서 제외되었습니다.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6 relative">
      <div className="max-w-7xl mx-auto w-full space-y-5">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-neutral-200 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#111111] tracking-tight">
                제안 자료 관리
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                프로젝트 등록 {items.length}건
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 사내 데이터 연결 및 자료등록 버튼 */}
            <button
              id="open-enterprise-data-btn"
              onClick={() => setIsEnterpriseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E60012] hover:bg-[#CC0010] text-white rounded-md text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>자료 등록 (사내 저장소 연계)</span>
            </button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-[#111111] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="자료명, 부서, 태그 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8F9FA] pl-8 pr-3 py-1.5 rounded-md border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-16 text-center bg-white rounded-lg border border-neutral-200">
              <FolderArchive className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-700">해당 조건의 등록된 자료가 없습니다.</p>
              <p className="text-[11px] text-neutral-400 mt-1 mb-3">상단의 [자료 등록 (사내 데이터 연계)]을 눌러 사내 자산을 검색하고 등록해보세요.</p>
              <button
                onClick={() => setIsEnterpriseModalOpen(true)}
                className="px-3 py-1.5 bg-[#E60012] text-white rounded text-xs font-bold"
              >
                사내 데이터에서 가져오기
              </button>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-neutral-200 p-4 shadow-2xs hover:border-[#E60012] hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#E60012] bg-red-50 px-2 py-0.5 rounded border border-[#E60012]/30">
                        {item.category}
                      </span>
                      {item.department && (
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {item.department}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {item.fileFormat} · {item.size}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#111111] mb-1.5 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-neutral-600 mb-3 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags?.map(t => (
                      <span key={t} className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-[11px]">
                  <span className="text-neutral-400">
                    {item.updatedAt || item.lastModified || '2026.09.01'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewTargetItem(item)}
                      className="flex items-center gap-1 px-2.5 py-1 text-neutral-600 hover:text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                      title="원문 샘플 및 목차 미리보기"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E60012]" />
                      <span>미리보기</span>
                    </button>
                    <button
                      onClick={() => onShowToast(`'${item.title}' 다운로드를 시작합니다.`)}
                      className="p-1 text-neutral-500 hover:text-[#E60012] rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      className="p-1 text-neutral-400 hover:text-[#E60012] rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="프로젝트에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Enterprise Data Modal (사내 저장소 전체 폴더 탐색 및 등록) */}
      <EnterpriseDataModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
        activeProject={activeProject}
        existingItemIds={items.map(i => i.id)}
        onImportItems={handleImportItems}
        onShowToast={onShowToast}
        onPreviewItem={item => setPreviewTargetItem(item)}
      />

      {/* Document Sample Preview Modal */}
      {previewTargetItem && (
        <DocumentPreviewModal
          item={previewTargetItem}
          onClose={() => setPreviewTargetItem(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
