"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Database,
  Upload,
  Globe,
  Folder,
  FolderOpen,
  FolderTree,
  Building2,
  Sparkles,
  ChevronRight,
  Search,
  Check,
  Plus,
  Trash2,
  FileText,
  Eye,
  FileCheck,
  Lock,
  Edit2
} from 'lucide-react';
import type { SectionReferenceConfig, SectionReferenceFileItem } from '@/types/proposals';
import { ENTERPRISE_KNOWLEDGE_BASE } from '@/data/proposals/library';

export type ReferenceTabType = 'internal' | 'upload' | 'web';

export interface SectionReferenceModalProps {
  isOpen: boolean;
  initialTab?: ReferenceTabType;
  sectionId: string;
  sectionTitle: string;
  config: SectionReferenceConfig;
  onSaveConfig: (newConfig: SectionReferenceConfig) => void;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const SectionReferenceModal: React.FC<SectionReferenceModalProps> = (props) => {
  if (!props.isOpen) return null;

  return <SectionReferenceModalContent {...props} />;
};

const SectionReferenceModalContent: React.FC<SectionReferenceModalProps> = ({
  initialTab = 'internal',
  sectionId,
  sectionTitle,
  config,
  onSaveConfig,
  onClose,
  onShowToast
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<ReferenceTabType>(initialTab);

  // 1. 내부 저장소 (사내 지식자산 전체 트리) 상태
  const [selectedFolderCategory, setSelectedFolderCategory] = useState<string>('전체');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('전체');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [selectedInternalIds, setSelectedInternalIds] = useState<string[]>(
    config.internalKnowledge.selectedFileIds || []
  );
  const [previewItem, setPreviewItem] = useState<any | null>(null);

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

  // 사내 지식자산 전체 트리 필터링
  const filteredInternalFiles = useMemo(() => {
    return ENTERPRISE_KNOWLEDGE_BASE.filter(item => {
      // 자료 유형별 폴더 필터
      if (selectedFolderCategory !== '전체' && item.category !== selectedFolderCategory) {
        return false;
      }
      // 부서별 폴더 필터
      if (selectedDepartment !== '전체' && item.department !== selectedDepartment) {
        return false;
      }
      // 검색어 필터
      if (internalSearchQuery.trim()) {
        const q = internalSearchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchDept = (item.department || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchDept && !matchTags) return false;
      }
      return true;
    });
  }, [selectedFolderCategory, selectedDepartment, internalSearchQuery]);

  // 현재 폴더 브레드크럼 경로
  const currentInternalPath = useMemo(() => {
    const parts = ['사내 지식자산'];
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

  // 2. 업로드 상태
  const [uploadedFiles, setUploadedFiles] = useState<SectionReferenceFileItem[]>(
    config.uploadedFiles || []
  );
  const [isDragging, setIsDragging] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');

  // 3. 웹 검색 상태
  const [webEnabled, setWebEnabled] = useState<boolean>(config.webSearch?.enabled ?? true);
  const [includeInput, setIncludeInput] = useState('');
  const [includeUrls, setIncludeUrls] = useState<string[]>(
    config.webSearch?.includeUrls || ['https://www.kpc.or.kr', 'https://www.g2b.go.kr']
  );
  const [excludeInput, setExcludeInput] = useState('');
  const [excludeUrls, setExcludeUrls] = useState<string[]>(
    config.webSearch?.excludeUrls || ['namu.wiki', 'blog.naver.com']
  );

  // 내부 저장소 선택 토글
  const toggleInternalItem = (id: string) => {
    setSelectedInternalIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 업로드 핸들러
  const handleUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: SectionReferenceFileItem[] = [];

    Array.from(files).forEach((file, index) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      newItems.push({
        id: `sec-up-${Date.now()}-${index}`,
        fileName: file.name,
        fileSize: `${sizeMb} MB`,
        format: ext,
        category: '섹션 전용 참고자료',
        uploadDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        uploader: '김민수 (작성자)',
        status: '참조 적용됨',
        selected: true
      });
    });

    setUploadedFiles(prev => [...newItems, ...prev]);
    onShowToast(`'${sectionTitle}' 섹션 전용 파일 ${newItems.length}건이 업로드되었습니다.`);
  };

  // 업로드 파일 삭제
  const handleDeleteUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    onShowToast('파일이 섹션 참조에서 삭제되었습니다.');
  };

  // 업로드 파일 토글
  const toggleUploadedFileSelected = (id: string) => {
    setUploadedFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  // 파일명 수정 시작
  const handleStartRename = (file: SectionReferenceFileItem) => {
    setEditingFileId(file.id);
    setEditingFileName(file.fileName);
  };

  // 파일명 수정 완료
  const handleSaveRename = (id: string) => {
    if (!editingFileName.trim()) return;
    setUploadedFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, fileName: editingFileName.trim() } : f))
    );
    setEditingFileId(null);
    onShowToast('파일명이 수정되었습니다.');
  };

  // 웹검색 Include 추가
  const handleAddIncludeUrl = (customUrl?: string) => {
    const target = (customUrl || includeInput).trim();
    if (!target) return;
    if (includeUrls.includes(target)) {
      onShowToast('이미 등록된 검색 대상 URL입니다.');
      return;
    }
    setIncludeUrls(prev => [...prev, target]);
    setIncludeInput('');
  };

  // 웹검색 Include 제거
  const handleRemoveIncludeUrl = (url: string) => {
    setIncludeUrls(prev => prev.filter(u => u !== url));
  };

  // 웹검색 Exclude 추가
  const handleAddExcludeUrl = (customUrl?: string) => {
    const target = (customUrl || excludeInput).trim();
    if (!target) return;
    if (excludeUrls.includes(target)) {
      onShowToast('이미 등록된 검색 제외 URL입니다.');
      return;
    }
    setExcludeUrls(prev => [...prev, target]);
    setExcludeInput('');
  };

  // 웹검색 Exclude 제거
  const handleRemoveExcludeUrl = (url: string) => {
    setExcludeUrls(prev => prev.filter(u => u !== url));
  };

  // 최종 저장
  const handleSaveAll = () => {
    const selectedFilesData = ENTERPRISE_KNOWLEDGE_BASE.filter(item =>
      selectedInternalIds.includes(item.id)
    ).map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      fileFormat: item.fileFormat,
      size: item.size,
      updatedAt: item.updatedAt,
      relevanceScore: item.relevanceScore
    }));

    const newConfig: SectionReferenceConfig = {
      sectionId,
      internalKnowledge: {
        selectedFileIds: selectedInternalIds,
        files: selectedFilesData
      },
      uploadedFiles,
      webSearch: {
        enabled: webEnabled,
        includeUrls,
        excludeUrls
      }
    };

    onSaveConfig(newConfig);
    onShowToast(`'${sectionTitle}' 섹션의 참조 위치 설정이 저장되었습니다.`);
    onClose();
  };

  // 총 선택된 참조 항목 수 계산
  const totalInternalSelected = selectedInternalIds.length;
  const totalUploadedSelected = uploadedFiles.filter(f => f.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-5xl h-[85vh] max-h-[820px] flex flex-col overflow-hidden">
        
        {/* Navigation Tabs Header & Close Button */}
        <div className="px-6 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            {/* 1. 내부 저장소 탭 */}
            <button
              onClick={() => setActiveTab('internal')}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'internal'
                  ? 'border-[#E60012] text-[#E60012]'
                  : 'border-transparent text-neutral-600 hover:text-[#111111]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>내부 저장소</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'internal' ? 'bg-red-100 text-[#E60012]' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {totalInternalSelected}건 선택
              </span>
            </button>

            {/* 2. 업로드 탭 */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-[#E60012] text-[#E60012]'
                  : 'border-transparent text-neutral-600 hover:text-[#111111]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>업로드</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'upload' ? 'bg-red-100 text-[#E60012]' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {totalUploadedSelected}건
              </span>
            </button>

            {/* 3. 웹 검색 탭 */}
            <button
              onClick={() => setActiveTab('web')}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'web'
                  ? 'border-[#E60012] text-[#E60012]'
                  : 'border-transparent text-neutral-600 hover:text-[#111111]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>웹 검색</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                webEnabled
                  ? (activeTab === 'web' ? 'bg-red-100 text-[#E60012]' : 'bg-emerald-100 text-emerald-700')
                  : 'bg-neutral-100 text-neutral-400'
              }`}>
                {webEnabled ? `${includeUrls.length}포함 · ${excludeUrls.length}제외` : 'OFF'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3. Tab Body Contents */}
        <div className="flex-1 overflow-hidden bg-neutral-50/50 flex">
          
          {/* ======================================================== */}
          {/* TAB 1: 내부 저장소 (사내 지식자산 전체 트리 + 탐색 브라우저) */}
          {/* ======================================================== */}
          {activeTab === 'internal' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Full Enterprise Folder Directory */}
              <div className="w-64 border-r border-neutral-200 bg-[#FBFBFB] flex flex-col shrink-0 select-none">
                <div className="p-3 border-b border-neutral-200 text-xs font-bold text-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-[#E60012]" />
                    <span>폴더 디렉터리</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    총 {ENTERPRISE_KNOWLEDGE_BASE.length}건
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                  {/* 1. 자료 유형별 폴더 */}
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
                                <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              )}
                              <span className="truncate">{cat.name}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-400'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 조직 및 부서별 폴더 */}
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      조직 및 부서별 폴더
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
                                ? 'bg-red-50 text-[#E60012] font-bold'
                                : 'text-neutral-700 hover:bg-neutral-200/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Building2 className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-[#E60012]' : 'text-neutral-400'
                              }`} />
                              <span className="truncate">{dept}</span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Summary in Sidebar */}
                <div className="p-3 border-t border-neutral-200 bg-white">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-2">
                    <span className="font-bold text-[#111111] block">본 섹션 연결 현황</span>
                    <div className="text-[11px] text-neutral-600">
                      선택된 사내 파일: <strong className="text-[#E60012]">{selectedInternalIds.length}</strong>건
                    </div>
                    {selectedInternalIds.length > 0 && (
                      <button
                        onClick={() => setSelectedInternalIds([])}
                        className="text-[10px] text-neutral-500 hover:text-[#E60012] underline cursor-pointer block"
                      >
                        전체 선택 해제
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Files Search & Grid */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Breadcrumb Path & Search Bar */}
                <div className="p-4 border-b border-neutral-200 space-y-3 bg-white">
                  {/* Breadcrumb */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      {currentInternalPath.map((crumb, idx) => (
                        <React.Fragment key={crumb}>
                          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                          <span className={idx === currentInternalPath.length - 1 ? 'font-bold text-[#111111]' : ''}>
                            {crumb}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-neutral-500">
                      목록 {filteredInternalFiles.length}건
                    </span>
                  </div>

                  {/* Search Bar + Select All */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="사내 문서명, 과업 키워드, 부서 검색..."
                        value={internalSearchQuery}
                        onChange={e => setInternalSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#E60012] focus:bg-white transition-colors"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const allVisibleIds = filteredInternalFiles.map(f => f.id);
                        const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedInternalIds.includes(id));
                        if (isAllSelected) {
                          setSelectedInternalIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
                        } else {
                          setSelectedInternalIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
                        }
                      }}
                      className="px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {filteredInternalFiles.length > 0 && filteredInternalFiles.every(f => selectedInternalIds.includes(f.id))
                          ? '현재 목록 선택 해제'
                          : '현재 목록 전체 선택'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Files List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {filteredInternalFiles.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-neutral-400 text-xs">
                      <Search className="w-8 h-8 mb-2 opacity-40" />
                      <span>해당 폴더 또는 검색 조건에 맞는 사내 지식자산이 없습니다.</span>
                    </div>
                  ) : (
                    filteredInternalFiles.map(item => {
                      const isChecked = selectedInternalIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleInternalItem(item.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                            isChecked
                              ? 'border-[#E60012] bg-red-50/20 shadow-2xs'
                              : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="pt-0.5">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-[#E60012] border-[#E60012] text-white'
                                  : 'border-neutral-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          {/* File Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                item.fileFormat === 'PDF' ? 'bg-red-100 text-red-700' :
                                item.fileFormat === 'DOCX' ? 'bg-blue-100 text-blue-700' :
                                item.fileFormat === 'HWP' ? 'bg-teal-100 text-teal-700' :
                                item.fileFormat === 'XLSX' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-neutral-100 text-neutral-700'
                              }`}>
                                {item.fileFormat}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                {item.category}
                              </span>
                              {item.department && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                                  {item.department}
                                </span>
                              )}
                              {item.relevanceScore && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>적합도 {item.relevanceScore}%</span>
                                </span>
                              )}
                              <span className="text-[11px] text-neutral-400 ml-auto font-mono">
                                {item.size} · {item.updatedAt}
                              </span>
                            </div>

                            <h4 className="text-xs font-black text-[#111111] truncate mb-1">
                              {item.title}
                            </h4>

                            <p className="text-[11px] text-neutral-600 line-clamp-1 mb-1.5">
                              {item.description}
                            </p>

                            {/* AI Relevance Reason */}
                            {item.relevanceReason && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 px-2 py-1 rounded mb-1.5 flex items-center gap-1">
                                <span className="font-bold shrink-0">💡 AI 추천 사유:</span>
                                <span className="truncate">{item.relevanceReason}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 mt-1">
                              {item.tags && item.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 4).map(tag => (
                                    <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              ) : <div />}

                              {item.useCount && (
                                <span className="text-[10px] text-neutral-400 shrink-0">
                                  누적 인용 {item.useCount}회
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Preview Action */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer shrink-0"
                            title="문서 미리보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 업로드 (현재 섹션 전용 파일 업로드 및 관리) */}
          {/* ======================================================== */}
          {activeTab === 'upload' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
              {/* Upload Dropzone (Reverted to original spacious layout) */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleUploadFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white shrink-0 ${
                  isDragging ? 'border-[#E60012] bg-red-50/30' : 'border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <input
                  type="file"
                  id="section-file-input"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt"
                  onChange={e => handleUploadFiles(e.target.files)}
                />

                <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E60012] flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-[#111111]">
                  이 섹션에 특화된 참고자료 파일을 끌어다 놓으세요
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  지원 규격: PDF, DOCX, HWP, PPTX, XLSX (최대 500MB)
                </p>

                <div className="mt-4 flex justify-center">
                  <label
                    htmlFor="section-file-input"
                    className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>내 PC에서 파일 선택</span>
                  </label>
                </div>
              </div>

              {/* Uploaded Files Management Card (With Internal Scrollable List) */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs flex flex-col flex-1">
                {/* Header (Sticky / Fixed) */}
                <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between bg-[#F8F9FA] shrink-0">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#E60012]" />
                    <h4 className="text-xs font-black text-[#111111]">
                      섹션 전용 업로드 파일 관리 ({uploadedFiles.length}건)
                    </h4>
                    <span className="text-[10px] text-neutral-400">
                      (스크롤하여 전체 목록 확인)
                    </span>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('현재 섹션의 업로드 파일을 모두 삭제하시겠습니까?')) {
                          setUploadedFiles([]);
                          onShowToast('모든 업로드 파일이 삭제되었습니다.');
                        }
                      }}
                      className="text-[11px] text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      전체 파일 비우기
                    </button>
                  )}
                </div>

                {/* Scrollable File List (Min 2 items visible + Scrollable) */}
                {uploadedFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    아직 업로드된 파일이 없습니다. 상단에서 파일을 추가하여 이 섹션의 전용 참조로 지정하세요.
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[220px] md:max-h-[260px] divide-y divide-neutral-100 scrollbar-thin">
                    {uploadedFiles.map(file => {
                      const isEditing = editingFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox for active inclusion */}
                            <button
                              type="button"
                              onClick={() => toggleUploadedFileSelected(file.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                file.selected
                                  ? 'bg-[#E60012] border-[#E60012] text-white'
                                  : 'border-neutral-300 bg-white'
                              }`}
                            >
                              {file.selected && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <div className="w-7 h-7 rounded bg-neutral-100 text-neutral-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {file.format}
                            </div>

                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingFileName}
                                    onChange={e => setEditingFileName(e.target.value)}
                                    className="px-2 py-1 border border-neutral-300 rounded text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                                  />
                                  <button
                                    onClick={() => handleSaveRename(file.id)}
                                    className="px-2 py-1 rounded bg-[#E60012] text-white text-[10px] font-bold"
                                  >
                                    완료
                                  </button>
                                  <button
                                    onClick={() => setEditingFileId(null)}
                                    className="px-2 py-1 rounded bg-neutral-200 text-neutral-700 text-[10px]"
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#111111] truncate" title={file.fileName}>
                                    {file.fileName}
                                  </span>
                                  <button
                                    onClick={() => handleStartRename(file)}
                                    className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                    title="파일명 변경"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                                <span>{file.fileSize}</span>
                                <span>·</span>
                                <span>{file.uploadDate}</span>
                                <span>·</span>
                                <span>{file.uploader}</span>
                                <span>·</span>
                                <span className={file.selected ? 'text-[#E60012] font-semibold' : 'text-neutral-400'}>
                                  {file.selected ? 'AI 참조 활성' : '참조 제외'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewItem({
                                  title: file.fileName,
                                  category: '섹션 업로드 파일',
                                  fileFormat: file.format,
                                  size: file.fileSize,
                                  description: '사용자가 직접 업로드한 섹션 전용 참고자료입니다.',
                                  previewContent: {
                                    summary: `'${file.fileName}' 파일은 현재 섹션('${sectionTitle}') 작성을 위한 사용자 정의 레퍼런스 문서입니다.`,
                                    keyHighlights: [
                                      '섹션 전용 고유 참조 데이터',
                                      '본 섹션 프롬프트 생성 시 RAG 인덱싱 우선 반영'
                                    ]
                                  }
                                });
                              }}
                              className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                              title="미리보기"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUploadedFile(file.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Status */}
                {uploadedFiles.length > 0 && (
                  <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                    <div>
                      활성 참조:{' '}
                      <strong className="text-[#E60012]">
                        {uploadedFiles.filter(f => f.selected).length}
                      </strong>{' '}
                      / 전체 {uploadedFiles.length}건
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      체크 해제 시 본 섹션 AI 생성 대상에서 제외됩니다.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: 웹 검색 (특정 웹사이트 검색 URL & 제외 URL 2개 텍스트필드) */}
          {/* ======================================================== */}
          {activeTab === 'web' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
              {/* Web Search Enable Toggle */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#111111] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#E60012]" />
                    <span>실시간 웹 검색 참조 활성화</span>
                  </h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webEnabled}
                    onChange={e => setWebEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E60012]"></div>
                </label>
              </div>

              {/* FIELD 1: 특정 웹 사이트만 검색하도록 URL을 입력하는 텍스트필드 */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>특정 웹 사이트만 검색할 대상 URL (Include URLs)</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {includeUrls.length}개 사이트 한정
                  </span>
                </div>

                {/* Input with Add Button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={includeInput}
                    onChange={e => setIncludeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIncludeUrl();
                      }
                    }}
                    placeholder="예: https://www.kpc.or.kr 또는 https://www.g2b.go.kr (Enter로 등록)"
                    className="flex-1 px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-[#111111] focus:outline-none focus:border-[#E60012] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddIncludeUrl()}
                    className="px-4 py-2 bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    추가
                  </button>
                </div>

                {/* Recommendations Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-neutral-400">추천 사이트 추가:</span>
                  {[
                    { label: '한국생산성본부', url: 'https://www.kpc.or.kr' },
                    { label: '나라장터', url: 'https://www.g2b.go.kr' },
                    { label: '공공데이터포털', url: 'https://www.data.go.kr' },
                    { label: '행정안전부', url: 'https://www.mois.go.kr' },
                    { label: '국가정보원 규정', url: 'https://www.nis.go.kr' },
                  ].map(rec => (
                    <button
                      key={rec.url}
                      type="button"
                      onClick={() => handleAddIncludeUrl(rec.url)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                    >
                      + {rec.label}
                    </button>
                  ))}
                </div>

                {/* Registered List */}
                <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-500">현재 검색 대상 URL 목록:</span>
                  {includeUrls.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-1">
                      지정된 대상 URL이 없습니다. 추가하지 않으면 일반 신뢰 도메인 전체를 대상으로 검색합니다.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {includeUrls.map(url => (
                        <span
                          key={url}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-mono"
                        >
                          <Globe className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-xs">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIncludeUrl(url)}
                            className="text-emerald-500 hover:text-emerald-900 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FIELD 2: 특정 웹사이트는 검색에 제외하는 URL을 입력하는 텍스트필드 */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>특정 웹사이트는 검색에 제외할 URL (Exclude URLs)</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {excludeUrls.length}개 사이트 차단
                  </span>
                </div>

                {/* Input with Add Button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={excludeInput}
                    onChange={e => setExcludeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExcludeUrl();
                      }
                    }}
                    placeholder="예: namu.wiki 또는 blog.naver.com (Enter로 등록)"
                    className="flex-1 px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-[#111111] focus:outline-none focus:border-[#E60012] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddExcludeUrl()}
                    className="px-4 py-2 bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    제외 등록
                  </button>
                </div>

                {/* Recommendations Chips for Exclude */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-neutral-400">자주 제외되는 사이트:</span>
                  {[
                    { label: '나무위키', url: 'namu.wiki' },
                    { label: '네이버 블로그', url: 'blog.naver.com' },
                    { label: '티스토리', url: 'tistory.com' },
                    { label: '다음 카페', url: 'cafe.daum.net' },
                    { label: '디시인사이드', url: 'dcinside.com' },
                  ].map(rec => (
                    <button
                      key={rec.url}
                      type="button"
                      onClick={() => handleAddExcludeUrl(rec.url)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                    >
                      + {rec.label}
                    </button>
                  ))}
                </div>

                {/* Registered List */}
                <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-500">현재 검색 제외(차단) URL 목록:</span>
                  {excludeUrls.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-1">
                      차단 등록된 URL이 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {excludeUrls.map(url => (
                        <span
                          key={url}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200 font-mono"
                        >
                          <Lock className="w-3 h-3 text-red-600" />
                          <span className="truncate max-w-xs">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExcludeUrl(url)}
                            className="text-red-500 hover:text-red-900 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 4. Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span className="font-bold text-[#111111]">선택 요약:</span>
            <span>내부 저장소 {totalInternalSelected}건</span>
            <span>·</span>
            <span>업로드 {totalUploadedSelected}건</span>
            <span>·</span>
            <span>웹 검색 {webEnabled ? `${includeUrls.length}포함 / ${excludeUrls.length}제외` : '미사용'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-white text-neutral-700 text-xs font-bold transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>현재 섹션에 참조 설정 적용</span>
            </button>
          </div>
        </div>

      </div>

      {/* Detail Preview Popup */}
      {previewItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#E60012]" />
                <h3 className="text-xs font-black text-[#111111] truncate max-w-md">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 flex items-center justify-center text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-neutral-400">문서 요약</span>
                <p className="text-neutral-800 mt-1 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  {previewItem.previewContent?.summary || previewItem.description}
                </p>
              </div>

              {previewItem.previewContent?.keyHighlights && (
                <div>
                  <span className="text-[10px] font-bold text-neutral-400">주요 특징 및 인용 포인트</span>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-neutral-700">
                    {previewItem.previewContent.keyHighlights.map((h: string, idx: number) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewItem.previewContent?.sampleText && (
                <div>
                  <span className="text-[10px] font-bold text-neutral-400">본문 샘플 발췌</span>
                  <pre className="mt-1 p-3 bg-neutral-900 text-neutral-200 rounded-lg text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                    {previewItem.previewContent.sampleText}
                  </pre>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-bold"
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
