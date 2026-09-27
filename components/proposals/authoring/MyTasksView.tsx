"use client";

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SAMPLE_TASKS } from '@/data/proposals/tasks';
import { ProposalSectionTask } from '@/types/proposals';

interface MyTasksViewProps {
  onOpenTask: (taskId: string) => void;
  onShowToast: (msg: string) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ onOpenTask }) => {
  const [tasks] = useState<ProposalSectionTask[]>(SAMPLE_TASKS);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6">
      <div className="max-w-7xl mx-auto w-full space-y-5">
        {/* Header */}
        <div className="pb-3 border-b border-neutral-200">
          <h1 className="text-xl font-black text-[#111111] tracking-tight">
            내 작업
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            정소담 수석님에게 배정된 제안서 집필 및 검토 작업 목록입니다.
          </p>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">작성 대기</span>
            <div className="text-2xl font-black text-neutral-800 mt-1">3건</div>
            <span className="text-[10px] text-neutral-400">초안 미작성 상태</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">작성 중</span>
            <div className="text-2xl font-black text-[#111111] mt-1">2건</div>
            <span className="text-[10px] text-neutral-400">현재 집중 집필 중</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">검토 요청</span>
            <div className="text-2xl font-black text-[#E60012] mt-1">4건</div>
            <span className="text-[10px] text-neutral-400">동료 컨설턴트 피드백 필요</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">마감 임박 (D-3 이내)</span>
            <div className="text-2xl font-black text-red-700 mt-1">1건</div>
            <span className="text-[10px] text-red-600 font-semibold">2.1 플랫폼 목표 아키텍처</span>
          </div>
        </div>

        {/* Task List Table */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between text-xs font-bold text-[#111111]">
            <span>배정된 세부 집필 과업 ({tasks.length})</span>
            <span className="text-[11px] text-neutral-500 font-normal">
              클릭 시 해당 에디터 섹션으로 즉시 전환됩니다.
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-bold">
                <th className="py-2.5 px-4 w-20">섹션</th>
                <th className="py-2.5 px-4">과업명 / 목차</th>
                <th className="py-2.5 px-4 w-32">마감일</th>
                <th className="py-2.5 px-4 w-32">분량 목표</th>
                <th className="py-2.5 px-4 w-28 text-center">진행 상태</th>
                <th className="py-2.5 px-4 w-24 text-right">작성</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {tasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                    {task.sectionNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#111111]">
                    {task.sectionTitle}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {task.deadline}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {task.currentWords} / {task.targetWords}자
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.status === '완료' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      task.status === '검토 요청' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenTask(task.id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E60012] hover:underline"
                    >
                      <span>집필하기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
