"use client";

import React, { useState } from 'react';
import { 
  Table2, 
  Layers, 
  Edit3, 
} from 'lucide-react';
import { ProposalSectionTask, ProposalTaskStatus } from '@/types/proposals';
import { SAMPLE_TASKS } from '@/data/proposals/tasks';

interface TaskManagementViewProps {
  onOpenEditor: (sectionId: string) => void;
  onShowToast: (msg: string) => void;
}

const USERS = ['정소담', '김민수', '이서연', '박지훈', '최유진'];
const STATUSES: ProposalTaskStatus[] = ['작성 대기', '작성 중', '검토 요청', '완료'];

export const TaskManagementView: React.FC<TaskManagementViewProps> = ({
  onOpenEditor,
  onShowToast
}) => {
  const [tasks, setTasks] = useState<ProposalSectionTask[]>(SAMPLE_TASKS);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('전체');

  const handleAssigneeChange = (taskId: string, newAssignee: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, assignee: newAssignee } : t))
    );
    onShowToast(`담당자가 '${newAssignee}'(으)로 변경되었습니다.`);
  };

  const handleStatusChange = (taskId: string, newStatus: ProposalTaskStatus) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    onShowToast(`상태가 [${newStatus}]로 변경되었습니다.`);
  };

  const filteredTasks = selectedUserFilter === '전체'
    ? (tasks || [])
    : (tasks || []).filter(t => t && t.assignee === selectedUserFilter);

  // Overall Stats
  const safeTasks = tasks || [];
  const completedWords = safeTasks.reduce((acc, curr) => acc + (curr.currentWords || 0), 0);
  const targetWords = safeTasks.reduce((acc, curr) => acc + (curr.targetWords || 0), 0) || 1;
  const overallPercent = Math.round((completedWords / targetWords) * 100);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6">
      <div className="max-w-7xl mx-auto w-full space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div>
            <h1 className="text-xl font-black text-[#111111] tracking-tight">
              작성 관리
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              제안서 섹션별 담당자 배분, 작성 분량, 진행 상태 및 검토 프로세스를 총괄 관리합니다.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-neutral-300 rounded-md p-0.5">
              <button
                id="task-view-table-btn"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  viewMode === 'table' ? 'bg-[#111111] text-white' : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>테이블 뷰</span>
              </button>
              <button
                id="task-view-kanban-btn"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  viewMode === 'kanban' ? 'bg-[#111111] text-white' : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>칸반 뷰</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress & KPIs Summary Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">전체 작성 진행률</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#111111]">{overallPercent}%</span>
              <span className="text-xs text-neutral-500 font-medium">({completedWords.toLocaleString()} / {targetWords.toLocaleString()} 단어)</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-[#E60012] h-full rounded-full transition-all duration-500" style={{ width: `${overallPercent}%` }} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">작성 중 섹션</span>
            <div className="text-2xl font-black text-[#111111] mt-1">
              {safeTasks.filter(t => t && t.status === '작성 중').length}개
            </div>
            <span className="text-[11px] text-neutral-500">집중 집필 진행 중</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">검토 대기/요청</span>
            <div className="text-2xl font-black text-[#E60012] mt-1">
              {safeTasks.filter(t => t && t.status === '검토 요청').length}개
            </div>
            <span className="text-[11px] text-neutral-500">품질 및 준수 검증 필요</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">완료</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {safeTasks.filter(t => t && t.status === '완료').length}개
            </div>
            <span className="text-[11px] text-neutral-500">내보내기 준비 완료</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-700">담당자 필터:</span>
            {['전체', ...USERS].map(u => (
              <button
                key={u}
                onClick={() => setSelectedUserFilter(u)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedUserFilter === u
                    ? 'bg-[#E60012] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-500">
            총 {filteredTasks.length}개 세부 과업
          </span>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-bold">
                  <th className="py-2.5 px-3 w-16">번호</th>
                  <th className="py-2.5 px-3">섹션 제목</th>
                  <th className="py-2.5 px-3 w-32">담당자</th>
                  <th className="py-2.5 px-3 w-28">검토자</th>
                  <th className="py-2.5 px-3 w-24 text-center">목표 분량</th>
                  <th className="py-2.5 px-3 w-36">작성 현황</th>
                  <th className="py-2.5 px-3 w-28 text-center">상태</th>
                  <th className="py-2.5 px-3 w-24 text-right">작성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredTasks.map(task => {
                  const percent = Math.min(
                    100,
                    Math.round(
                      ((task.currentWords || 0) / (task.targetWords || 1)) * 100
                    )
                  );

                  return (
                    <tr key={task.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-700">
                        {task.sectionNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#111111]">
                        {task.sectionTitle}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={task.assignee}
                          onChange={e => handleAssigneeChange(task.id, e.target.value)}
                          className="bg-white border border-neutral-300 rounded px-2 py-1 text-xs font-medium text-neutral-800"
                        >
                          {USERS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">
                        {task.reviewer}
                      </td>
                      <td className="py-2.5 px-3 text-center text-neutral-600">
                        {task.targetPages}p ({task.targetWords}자)
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-neutral-800">{task.currentWords}자</span>
                            <span className="text-neutral-500 font-mono">{percent}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#E60012] h-full rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={task.status}
                          onChange={e => handleStatusChange(task.id, e.target.value as ProposalTaskStatus)}
                          className={`text-[10px] font-bold px-2 py-1 rounded border ${
                            task.status === '완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            task.status === '검토 요청' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            task.status === '작성 중' ? 'bg-red-50 text-[#E60012] border-[#E60012]/30' :
                            'bg-neutral-50 text-neutral-500 border-neutral-200'
                          }`}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          id={`write-task-${task.id}-btn`}
                          onClick={() => onOpenEditor(task.id)}
                          className="flex items-center gap-1 ml-auto px-2.5 py-1 bg-[#111111] hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>작성</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* KANBAN VIEW */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-4 gap-4">
            {STATUSES.map(st => {
              const items = filteredTasks.filter(t => t.status === st);
              return (
                <div key={st} className="bg-neutral-100 rounded-lg border border-neutral-200 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <span className="font-bold text-xs text-[#111111]">{st}</span>
                    <span className="text-[11px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(t => (
                      <div
                        key={t.id}
                        className="bg-white rounded-md border border-neutral-200 p-3 shadow-2xs hover:border-[#E60012] transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                          <span className="font-mono font-bold">{t.sectionNumber}</span>
                          <span className="font-semibold text-neutral-700">{t.assignee}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#111111] line-clamp-2 leading-snug mb-2">
                          {t.sectionTitle}
                        </h4>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
                          <span className="text-neutral-500">{t.currentWords}/{t.targetWords}자</span>
                          <button
                            onClick={() => onOpenEditor(t.id)}
                            className="text-[#E60012] hover:underline font-bold"
                          >
                            작성하기 &gt;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
