"use client";

import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Edit2, 
  MoveUp, 
  MoveDown, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  ArrowRight, 
  Check, 
  GripVertical,
  BookOpen,
  ArrowUpDown,
  CornerDownRight,
  MoreHorizontal
} from 'lucide-react';
import { ProposalOutlineItem } from '@/types/proposals';
import { INITIAL_PROPOSAL_STRUCTURE } from '@/data/proposals/authoring';

interface ProposalStructureViewProps {
  onNavigateNext: () => void;
  onShowToast: (msg: string) => void;
}

interface DraggedItemState {
  type: 'chapter' | 'sub';
  chapterId: string;
  subId?: string;
  title: string;
}

interface DropTargetState {
  type: 'chapter' | 'sub';
  chapterId: string;
  subId?: string;
  position: 'before' | 'after' | 'inside';
}

export const ProposalStructureView: React.FC<ProposalStructureViewProps> = ({
  onNavigateNext,
  onShowToast
}) => {
  const [structure, setStructure] = useState<ProposalOutlineItem[]>(INITIAL_PROPOSAL_STRUCTURE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [history, setHistory] = useState<ProposalOutlineItem[][]>([INITIAL_PROPOSAL_STRUCTURE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<DraggedItemState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);

  // Settings dropdown state
  const [activeSettingsMenuId, setActiveSettingsMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setActiveSettingsMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const saveToHistory = (newStructure: ProposalOutlineItem[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newStructure);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setStructure(newStructure);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setStructure(prev);
      onShowToast('실행 취소(Undo)되었습니다.');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setStructure(next);
      onShowToast('다시 실행(Redo)되었습니다.');
    }
  };

  const handleRegenerate = () => {
    onShowToast('AI가 공공 RFP 평가기준과 가중치를 재분석하여 최적 목차를 재생성 중입니다...');
    setTimeout(() => {
      saveToHistory([...INITIAL_PROPOSAL_STRUCTURE]);
      onShowToast('KPC 최적 수주 목차가 재생성되었습니다.');
    }, 600);
  };

  const toggleExpand = (id: string) => {
    const updated = structure.map(item => {
      if (item.id === id) {
        return { ...item, isExpanded: !item.isExpanded };
      }
      return item;
    });
    setStructure(updated);
  };

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const finishEdit = (id: string) => {
    const updateRecursive = (items: ProposalOutlineItem[]): ProposalOutlineItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, title: editingTitle };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };

    saveToHistory(updateRecursive(structure));
    setEditingId(null);
    onShowToast('목차명이 변경되었습니다.');
  };

  const deleteItem = (id: string) => {
    const deleteRecursive = (items: ProposalOutlineItem[]): ProposalOutlineItem[] => {
      return items
        .filter(item => item.id !== id)
        .map(item => ({
          ...item,
          children: item.children ? deleteRecursive(item.children) : undefined
        }));
    };

    const updated = deleteRecursive(structure);
    const renumbered = autoRenumber(updated);
    saveToHistory(renumbered);
    onShowToast('항목이 삭제되었습니다.');
  };

  const addSubItem = (parentId: string) => {
    const addRecursive = (items: ProposalOutlineItem[]): ProposalOutlineItem[] => {
      return items.map(item => {
        if (item.id === parentId) {
          const newChildren = item.children ? [...item.children] : [];
          const newSubId = `sub-${Date.now()}`;
          newChildren.push({
            id: newSubId,
            sectionNumber: `${item.sectionNumber || '1'}.${newChildren.length + 1}`,
            code: `${item.sectionNumber || '1'}.${newChildren.length + 1}`,
            title: '새 하위 항목 제목 입력',
            pageEstimate: 4,
            assignee: '정소담',
            status: '작성 대기',
            rfpMappingReqs: ['REQ-001']
          });
          return { ...item, isExpanded: true, children: newChildren };
        }
        if (item.children) {
          return { ...item, children: addRecursive(item.children) };
        }
        return item;
      });
    };

    const updated = addRecursive(structure);
    saveToHistory(updated);
    onShowToast('하위 항목이 추가되었습니다.');
  };

  // Helper to re-index section numbers automatically (e.g., 1., 2., 3. and 1.1, 1.2, 2.1...)
  const autoRenumber = (items: ProposalOutlineItem[]): ProposalOutlineItem[] => {
    return items.map((chap, chapIdx) => {
      const chapNum = `${chapIdx + 1}`;
      
      // Clean chapter title of any leading numbering prefix
      const cleanChapName = chap.title.replace(/^\s*(?:\[?[0-9]+(?:\.[0-9]+)*\]?|\d+\.|\d+장|\d+)\s*/, '').trim();
      const newChapTitle = `${chapNum}. ${cleanChapName || chap.title.trim()}`;

      const updatedChildren = (chap.children || []).map((sub, subIdx) => {
        const subNum = `${chapNum}.${subIdx + 1}`;
        // Clean sub title of any leading numbering prefix (including leading spaces)
        const cleanSubName = sub.title.replace(/^\s*(?:\[?[0-9]+(?:\.[0-9]+)*\]?|\d+\.\d+\.?|\d+\.)\s*/, '').trim();
        const newSubTitle = `${subNum} ${cleanSubName || sub.title.trim()}`;
        return {
          ...sub,
          sectionNumber: subNum,
          code: subNum,
          title: newSubTitle
        };
      });

      return {
        ...chap,
        sectionNumber: chapNum,
        code: chapNum,
        title: newChapTitle,
        children: updatedChildren
      };
    });
  };

  // Move Chapter Up/Down with buttons
  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= structure.length) return;

    const newStructure = [...structure];
    const [moved] = newStructure.splice(index, 1);
    newStructure.splice(targetIndex, 0, moved);

    const renumbered = autoRenumber(newStructure);
    saveToHistory(renumbered);
    onShowToast(`'${moved.title}' 장의 순서가 변경되었습니다.`);
  };

  // Move Sub-section Up/Down with buttons
  const moveSubSection = (chapterId: string, subIndex: number, direction: 'up' | 'down') => {
    const chapter = structure.find(c => c.id === chapterId);
    if (!chapter || !chapter.children) return;

    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= chapter.children.length) return;

    const newChildren = [...chapter.children];
    const [moved] = newChildren.splice(subIndex, 1);
    newChildren.splice(targetIndex, 0, moved);

    const newStructure = structure.map(c => 
      c.id === chapterId ? { ...c, children: newChildren } : c
    );

    const renumbered = autoRenumber(newStructure);
    saveToHistory(renumbered);
    onShowToast(`'${moved.title}' 항목의 순서가 변경되었습니다.`);
  };

  // ================= DRAG AND DROP HANDLERS =================
  const handleDragStart = (
    e: React.DragEvent,
    type: 'chapter' | 'sub',
    chapterId: string,
    title: string,
    subId?: string
  ) => {
    e.stopPropagation();
    setDraggedItem({ type, chapterId, subId, title });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, chapterId, subId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (
    e: React.DragEvent,
    type: 'chapter' | 'sub',
    chapterId: string,
    subId?: string,
    position: 'before' | 'after' | 'inside' = 'before'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedItem) return;

    // Avoid self drop target
    if (draggedItem.type === 'chapter' && type === 'chapter' && draggedItem.chapterId === chapterId) {
      return;
    }
    if (draggedItem.type === 'sub' && type === 'sub' && draggedItem.subId === subId) {
      return;
    }

    setDropTarget({ type, chapterId, subId, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (
    e: React.DragEvent,
    targetType: 'chapter' | 'sub',
    targetChapterId: string,
    targetSubId?: string,
    position: 'before' | 'after' | 'inside' = 'before'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) {
      setDropTarget(null);
      return;
    }

    // CASE 1: Reordering Chapters (Top-Level)
    if (draggedItem.type === 'chapter' && targetType === 'chapter') {
      const sourceIndex = structure.findIndex(c => c.id === draggedItem.chapterId);
      let destIndex = structure.findIndex(c => c.id === targetChapterId);

      if (sourceIndex !== -1 && destIndex !== -1 && sourceIndex !== destIndex) {
        if (position === 'after' && sourceIndex > destIndex) {
          destIndex += 1;
        } else if (position === 'before' && sourceIndex < destIndex) {
          destIndex -= 1;
        }

        const newStructure = [...structure];
        const [movedChapter] = newStructure.splice(sourceIndex, 1);
        newStructure.splice(destIndex, 0, movedChapter);

        const renumbered = autoRenumber(newStructure);
        saveToHistory(renumbered);
        onShowToast(`[목차 순서 변경] '${movedChapter.title}' 장의 위치가 이동되었습니다.`);
      }
    }

    // CASE 2: Reordering Sub-sections (Within same chapter or across chapters)
    if (draggedItem.type === 'sub' && draggedItem.subId) {
      const sourceChapter = structure.find(c => c.id === draggedItem.chapterId);
      if (!sourceChapter || !sourceChapter.children) return;

      const sourceSubIndex = sourceChapter.children.findIndex(s => s.id === draggedItem.subId);
      if (sourceSubIndex === -1) return;

      const [movedSub] = sourceChapter.children.slice(sourceSubIndex, sourceSubIndex + 1);

      // 2A: Dropped on a sub-section
      if (targetType === 'sub' && targetSubId) {
        const newStructure = structure.map(chap => {
          // If source and target are the same chapter
          if (chap.id === draggedItem.chapterId && chap.id === targetChapterId) {
            const children = [...(chap.children || [])];
            const [item] = children.splice(sourceSubIndex, 1);
            let targetIdx = children.findIndex(s => s.id === targetSubId);
            if (position === 'after') targetIdx += 1;
            children.splice(targetIdx, 0, item);
            return { ...chap, children };
          }
          // If source chapter (remove item)
          if (chap.id === draggedItem.chapterId) {
            const children = (chap.children || []).filter(s => s.id !== draggedItem.subId);
            return { ...chap, children };
          }
          // If target chapter (insert item)
          if (chap.id === targetChapterId) {
            const children = [...(chap.children || [])];
            let targetIdx = children.findIndex(s => s.id === targetSubId);
            if (position === 'after') targetIdx += 1;
            children.splice(targetIdx, 0, movedSub);
            return { ...chap, isExpanded: true, children };
          }
          return chap;
        });

        const renumbered = autoRenumber(newStructure);
        saveToHistory(renumbered);
        onShowToast(`[목차 순서 변경] '${movedSub.title}' 항목이 이동되었습니다.`);
      }
      // 2B: Dropped onto a chapter header / inside chapter
      else if (targetType === 'chapter') {
        const newStructure = structure.map(chap => {
          if (chap.id === draggedItem.chapterId) {
            const children = (chap.children || []).filter(s => s.id !== draggedItem.subId);
            return { ...chap, children };
          }
          if (chap.id === targetChapterId) {
            const children = chap.children ? [...chap.children] : [];
            if (position === 'before') {
              children.unshift(movedSub);
            } else {
              children.push(movedSub);
            }
            return { ...chap, isExpanded: true, children };
          }
          return chap;
        });

        const renumbered = autoRenumber(newStructure);
        saveToHistory(renumbered);
        onShowToast(`[목차 순서 변경] '${movedSub.title}' 항목이 '${targetChapterId}' 장으로 이동되었습니다.`);
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Calculate total pages
  const totalEstimatedPages = structure.reduce((sum, chap) => {
    const subSum = (chap.children || []).reduce((cSum, sub) => cSum + (sub.pageEstimate || 0), 0);
    return sum + (chap.pageEstimate || subSum || 0);
  }, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6">
      <div className="max-w-6xl mx-auto w-full space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div>
            <h1 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
              <span>제안서 구조 관리</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#E60012] border border-red-200">
                총 {structure.length}개 장 / {structure.reduce((acc, c) => acc + (c.children?.length || 0), 0)}개 세부항목
              </span>
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              점 6개 아이콘(<GripVertical className="w-3 h-3 inline text-neutral-500" />)을 드래그하여 목차 순서를 자유롭게 변경할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center border border-neutral-300 rounded-md bg-white p-0.5 shadow-2xs">
              <button
                disabled={historyIndex <= 0}
                onClick={handleUndo}
                className="p-1.5 text-neutral-600 hover:text-[#111111] disabled:opacity-30 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                title="실행 취소 (Undo)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className="p-1.5 text-neutral-600 hover:text-[#111111] disabled:opacity-30 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                title="다시 실행 (Redo)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E60012]" />
              <span>목차 다시 생성</span>
            </button>

            <button
              id="go-to-task-mgmt-btn"
              onClick={onNavigateNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E60012] hover:bg-[#CC0010] text-white rounded-md text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <span>작성 관리로 이동</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drag Hint Banner */}
        <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 flex items-center justify-between text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#E60012]" />
            <span>
              <strong>드래그 & 드롭 순서 변경 가이드:</strong> 각 항목 좌측의 <strong>점 6개 핸들(<GripVertical className="w-3 h-3 inline text-[#E60012]" />)</strong>을 마우스로 잡고 원하는 위치로 끌어다 놓으세요. 대분류 장 및 하위 절 항목 모두 순서 이동이 가능합니다.
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium shrink-0 ml-4">
            순서 변경 시 번호(1.1, 1.2 등)가 자동 정렬됩니다.
          </span>
        </div>

        {/* Outline Tree Container */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#E60012]" />
              <span className="font-bold text-[#111111]">
                제안서 본문 목차 구조
              </span>
              <span className="text-neutral-500 text-[11px]">
                (예상 총 {totalEstimatedPages || 68}페이지)
              </span>
            </div>
            <span className="text-neutral-400 text-[11px]">
              항목 드래그 앤 드롭 및 하위 항목 추가 가능
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {structure.map((chapter, chapIdx) => {
              const isChapterDragging = draggedItem?.type === 'chapter' && draggedItem.chapterId === chapter.id;
              const isDropBeforeChap = dropTarget?.type === 'chapter' && dropTarget.chapterId === chapter.id && dropTarget.position === 'before';
              const isDropAfterChap = dropTarget?.type === 'chapter' && dropTarget.chapterId === chapter.id && dropTarget.position === 'after';

              return (
                <div key={chapter.id} className="relative">
                  {/* Drop Indicator Bar (Before Chapter) */}
                  {isDropBeforeChap && (
                    <div className="h-1 bg-[#E60012] rounded-full my-1 animate-pulse shadow-xs flex items-center justify-between">
                      <span className="w-2 h-2 rounded-full bg-[#E60012] -ml-1" />
                      <span className="w-2 h-2 rounded-full bg-[#E60012] -mr-1" />
                    </div>
                  )}

                  <div
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isChapterDragging 
                        ? 'opacity-40 border-dashed border-[#E60012] bg-neutral-50 scale-[0.99]' 
                        : 'border-neutral-200 bg-[#F8F9FA] hover:border-neutral-300'
                    }`}
                    onDragOver={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      const pos = e.clientY < midY ? 'before' : 'after';
                      handleDragOver(e, 'chapter', chapter.id, undefined, pos);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={e => {
                      const pos = dropTarget?.position || 'before';
                      handleDrop(e, 'chapter', chapter.id, undefined, pos);
                    }}
                  >
                    {/* Chapter Header Row */}
                    <div className="p-3 bg-white flex items-center justify-between hover:bg-neutral-50/80 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* 6-dot Drag Handle for Chapter */}
                        <div
                          draggable
                          onDragStart={e => handleDragStart(e, 'chapter', chapter.id, chapter.title)}
                          onDragEnd={handleDragEnd}
                          className="p-1 -ml-1 text-neutral-400 hover:text-[#E60012] hover:bg-red-50 rounded cursor-grab active:cursor-grabbing transition-colors"
                          title="잡고 드래그하여 장 순서 변경"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <button
                          onClick={() => toggleExpand(chapter.id)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors cursor-pointer"
                        >
                          {chapter.isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <span className="font-black text-xs text-[#111111] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          {chapter.sectionNumber}
                        </span>

                        {editingId === chapter.id ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-md">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') finishEdit(chapter.id);
                              }}
                              autoFocus
                              className="w-full bg-white border border-[#E60012] px-2.5 py-1 rounded text-xs text-[#111111] focus:outline-none"
                            />
                            <button
                              onClick={() => finishEdit(chapter.id)}
                              className="p-1 text-white bg-[#E60012] rounded hover:bg-[#CC0010] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span 
                            onDoubleClick={() => startEdit(chapter.id, chapter.title)}
                            className="text-xs font-bold text-[#111111] truncate cursor-pointer hover:text-[#E60012] transition-colors"
                            title="더블클릭하여 이름 수정"
                          >
                            {chapter.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs shrink-0">
                        {/* Up / Down Move Buttons for Chapter */}
                        <div className="flex items-center gap-0.5 border border-neutral-200 rounded p-0.5 bg-neutral-50">
                          <button
                            disabled={chapIdx === 0}
                            onClick={() => moveChapter(chapIdx, 'up')}
                            className="p-1 text-neutral-500 hover:text-[#111111] disabled:opacity-20 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                            title="위로 이동"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={chapIdx === structure.length - 1}
                            onClick={() => moveChapter(chapIdx, 'down')}
                            className="p-1 text-neutral-500 hover:text-[#111111] disabled:opacity-20 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                            title="아래로 이동"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-[11px] text-neutral-500 font-medium">
                          예상 {chapter.pageEstimate || (chapter.children?.reduce((s, c) => s + (c.pageEstimate || 0), 0) || 10)}p
                        </span>

                        <button
                          onClick={() => addSubItem(chapter.id)}
                          className="flex items-center gap-1 text-[11px] text-neutral-600 hover:text-[#E60012] font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          하위 추가
                        </button>

                        {/* Settings 3-dots Menu Button (수정, 삭제) */}
                        <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                          <button
                            id={`chap-settings-btn-${chapter.id}`}
                            onClick={e => {
                              e.stopPropagation();
                              setActiveSettingsMenuId(prev => (prev === chapter.id ? null : chapter.id));
                            }}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              activeSettingsMenuId === chapter.id
                                ? 'bg-neutral-800 text-white border-neutral-800'
                                : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                            }`}
                            title="설정 (수정, 삭제)"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeSettingsMenuId === chapter.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in duration-100"
                            >
                              <button
                                id={`chap-edit-btn-${chapter.id}`}
                                onClick={() => {
                                  setActiveSettingsMenuId(null);
                                  startEdit(chapter.id, chapter.title);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-neutral-100 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>수정</span>
                              </button>
                              <button
                                id={`chap-add-sub-btn-${chapter.id}`}
                                onClick={() => {
                                  setActiveSettingsMenuId(null);
                                  addSubItem(chapter.id);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-100 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>하위 추가</span>
                              </button>
                              <button
                                id={`chap-delete-btn-${chapter.id}`}
                                onClick={() => {
                                  setActiveSettingsMenuId(null);
                                  deleteItem(chapter.id);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-[#E60012] hover:bg-red-50 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#E60012]" />
                                <span>삭제</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sub-sections Container */}
                    {chapter.isExpanded && chapter.children && chapter.children.length > 0 && (
                      <div className="pl-6 pr-3 py-2.5 space-y-1.5 bg-[#F8F9FA] border-t border-neutral-100">
                        {chapter.children.map((sub, subIdx) => {
                          const isSubDragging = draggedItem?.type === 'sub' && draggedItem.subId === sub.id;
                          const isDropBeforeSub = dropTarget?.type === 'sub' && dropTarget.subId === sub.id && dropTarget.position === 'before';
                          const isDropAfterSub = dropTarget?.type === 'sub' && dropTarget.subId === sub.id && dropTarget.position === 'after';

                          return (
                            <div key={sub.id} className="relative">
                              {/* Drop Indicator Bar (Before Sub-section) */}
                              {isDropBeforeSub && (
                                <div className="h-0.5 bg-[#E60012] rounded-full my-1 animate-pulse shadow-xs flex items-center justify-between">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60012] -ml-0.5" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60012] -mr-0.5" />
                                </div>
                              )}

                              <div
                                className={`p-2.5 rounded-lg bg-white border flex items-center justify-between transition-all text-xs ${
                                  isSubDragging
                                    ? 'opacity-40 border-dashed border-[#E60012] bg-red-50/20 scale-[0.99]'
                                    : 'border-neutral-200 hover:border-neutral-300 hover:shadow-2xs'
                                }`}
                                onDragOver={e => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const midY = rect.top + rect.height / 2;
                                  const pos = e.clientY < midY ? 'before' : 'after';
                                  handleDragOver(e, 'sub', chapter.id, sub.id, pos);
                                }}
                                onDragLeave={handleDragLeave}
                                onDrop={e => {
                                  const pos = dropTarget?.position || 'before';
                                  handleDrop(e, 'sub', chapter.id, sub.id, pos);
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* 6-dot Drag Handle for Sub-Section */}
                                  <div
                                    draggable
                                    onDragStart={e => handleDragStart(e, 'sub', chapter.id, sub.title, sub.id)}
                                    onDragEnd={handleDragEnd}
                                    className="p-1 -ml-1 text-neutral-400 hover:text-[#E60012] hover:bg-red-50 rounded cursor-grab active:cursor-grabbing transition-colors"
                                    title="잡고 드래그하여 항목 순서 변경 (다른 장으로 이동 가능)"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  <CornerDownRight className="w-3 h-3 text-neutral-300 shrink-0" />

                                  <span className="font-bold text-neutral-700 font-mono text-[11px] shrink-0">
                                    {sub.sectionNumber}
                                  </span>

                                  {editingId === sub.id ? (
                                    <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                      <input
                                        type="text"
                                        value={editingTitle}
                                        onChange={e => setEditingTitle(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') finishEdit(sub.id);
                                        }}
                                        autoFocus
                                        className="w-full bg-white border border-[#E60012] px-2 py-0.5 rounded text-xs text-[#111111]"
                                      />
                                      <button
                                        onClick={() => finishEdit(sub.id)}
                                        className="p-1 text-white bg-[#E60012] rounded hover:bg-[#CC0010] cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span 
                                      onDoubleClick={() => startEdit(sub.id, sub.title)}
                                      className="font-semibold text-neutral-900 truncate cursor-pointer hover:text-[#E60012] transition-colors"
                                      title="더블클릭하여 이름 수정"
                                    >
                                      {sub.title}
                                    </span>
                                  )}

                                  {/* Mapped requirements pills */}
                                  {sub.rfpMappingReqs && sub.rfpMappingReqs.length > 0 && (
                                    <div className="flex gap-1 ml-2 shrink-0">
                                      {sub.rfpMappingReqs.map(r => (
                                        <span
                                          key={r}
                                          className="text-[9px] bg-red-50 text-[#E60012] px-1.5 py-0.2 rounded font-mono font-bold border border-[#E60012]/30"
                                        >
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  {/* Up / Down Move Buttons for Sub-section */}
                                  <div className="flex items-center gap-0.5 border border-neutral-200 rounded p-0.5 bg-neutral-50">
                                    <button
                                      disabled={subIdx === 0}
                                      onClick={() => moveSubSection(chapter.id, subIdx, 'up')}
                                      className="p-0.5 text-neutral-500 hover:text-[#111111] disabled:opacity-20 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                                      title="위로 이동"
                                    >
                                      <MoveUp className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      disabled={subIdx === (chapter.children?.length || 1) - 1}
                                      onClick={() => moveSubSection(chapter.id, subIdx, 'down')}
                                      className="p-0.5 text-neutral-500 hover:text-[#111111] disabled:opacity-20 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                                      title="아래로 이동"
                                    >
                                      <MoveDown className="w-2.5 h-2.5" />
                                    </button>
                                  </div>

                                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium">
                                    {sub.assignee || '미지정'}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 font-medium">
                                    {sub.pageEstimate}p
                                  </span>

                                  {/* Sub-section Settings 3-dots Button & Dropdown (수정, 삭제) */}
                                  <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                                    <button
                                      id={`sub-settings-btn-${sub.id}`}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setActiveSettingsMenuId(prev => (prev === sub.id ? null : sub.id));
                                      }}
                                      className={`p-1 rounded border transition-colors cursor-pointer ${
                                        activeSettingsMenuId === sub.id
                                          ? 'bg-neutral-800 text-white border-neutral-800'
                                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                                      }`}
                                      title="설정 (수정, 삭제)"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>

                                    {activeSettingsMenuId === sub.id && (
                                      <div
                                        onClick={e => e.stopPropagation()}
                                        className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 z-50 animate-in fade-in duration-100"
                                      >
                                        <button
                                          id={`sub-edit-btn-${sub.id}`}
                                          onClick={() => {
                                            setActiveSettingsMenuId(null);
                                            startEdit(sub.id, sub.title);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-[#111111] hover:bg-neutral-100 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <Edit2 className="w-3 h-3 text-blue-600" />
                                          <span>수정</span>
                                        </button>
                                        <button
                                          id={`sub-delete-btn-${sub.id}`}
                                          onClick={() => {
                                            setActiveSettingsMenuId(null);
                                            deleteItem(sub.id);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-[#E60012] hover:bg-red-50 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                        >
                                          <Trash2 className="w-3 h-3 text-[#E60012]" />
                                          <span>삭제</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Drop Indicator Bar (After Sub-section) */}
                              {isDropAfterSub && (
                                <div className="h-0.5 bg-[#E60012] rounded-full my-1 animate-pulse shadow-xs flex items-center justify-between">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60012] -ml-0.5" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60012] -mr-0.5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sub-sections Empty State in Expanded Chapter */}
                    {chapter.isExpanded && (!chapter.children || chapter.children.length === 0) && (
                      <div className="p-4 text-center bg-[#F8F9FA] border-t border-neutral-100">
                        <p className="text-xs text-neutral-400 mb-2">하위 항목이 없습니다.</p>
                        <button
                          onClick={() => addSubItem(chapter.id)}
                          className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-[#E60012]" />
                          <span>첫 하위 항목 추가</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drop Indicator Bar (After Chapter) */}
                  {isDropAfterChap && (
                    <div className="h-1 bg-[#E60012] rounded-full my-1 animate-pulse shadow-xs flex items-center justify-between">
                      <span className="w-2 h-2 rounded-full bg-[#E60012] -ml-1" />
                      <span className="w-2 h-2 rounded-full bg-[#E60012] -mr-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
