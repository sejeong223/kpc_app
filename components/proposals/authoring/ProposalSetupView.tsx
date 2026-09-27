"use client";

import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  FileCheck,
  FileText,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import type { ProposalProject, ProjectRelatedDoc } from "@/types/proposals";
import DocumentPreviewModal from "@/components/proposals/review/DocumentPreviewModal";

export interface ProposalSetupViewProps {
  project: ProposalProject;
  onStartAnalysis: () => void;
  onShowToast: (msg: string) => void;
}

export const ProposalSetupView: React.FC<ProposalSetupViewProps> = ({
  project,
  onStartAnalysis,
  onShowToast
}) => {
  // Method selection
  const [creationMethod, setCreationMethod] = useState<'requirements' | 'qa' | 'blank'>('requirements');
  const [templateType, setTemplateType] = useState('공공기관 표준 기술제안서 템플릿 (KPC 표준)');
  const [targetScope, setTargetScope] = useState('전체 제안서 (총괄개요 + 기술/기능 + 사업관리 + 지원)');
  const [language, setLanguage] = useState('한국어');
  const [assignee, setAssignee] = useState(project.manager || '정소담 수석컨설턴트');

  // Additional reference docs state
  const [extraDocs, setExtraDocs] = useState<ProjectRelatedDoc[]>([
    {
      id: 'extra-1',
      fileName: '2026_KPC_공공AI_기술아키텍처_표준화가이드.pdf',
      docType: '참고자료',
      uploader: '정소담',
      uploadDate: '2026.09.18',
      size: '3.2 MB',
      isPrimaryRfp: false,
      pageCount: 14
    }
  ]);

  const [previewDoc, setPreviewDoc] = useState<ProjectRelatedDoc | null>(null);

  const handleUploadExtra = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newDoc: ProjectRelatedDoc = {
        id: `extra-${Date.now()}`,
        fileName: file.name,
        docType: '참고자료',
        uploader: assignee || '정소담',
        uploadDate: '2026.09.18',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isPrimaryRfp: false,
        pageCount: 10
      };
      setExtraDocs(prev => [...prev, newDoc]);
      onShowToast(`추가 참고자료 '${file.name}'이(가) 등록되었습니다.`);
    }
  };

  const registeredDocs = project.relatedDocs && project.relatedDocs.length > 0
    ? project.relatedDocs
    : [
        {
          id: 'doc-def-1',
          fileName: project.primaryRfpFileName || '2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf',
          docType: 'RFP' as const,
          uploader: project.manager || '정소담',
          uploadDate: '2026.09.18',
          size: '7.4 MB',
          isPrimaryRfp: true,
          pageCount: 64
        },
        {
          id: 'doc-def-2',
          fileName: '과업지시서_세부과업내역서_v1.0.docx',
          docType: '사업 관련 문서' as const,
          uploader: project.manager || '정소담',
          uploadDate: '2026.09.18',
          size: '2.8 MB',
          isPrimaryRfp: false,
          pageCount: 22
        }
      ];

  const creationMethods = [
    {
      id: 'requirements',
      title: '요구사항 기반 제안서',
      subtitle: 'Requirements-driven (기본 권장)',
      badge: '추천',
      desc: '등록된 대표 RFP에서 기능·기술·보안 요구사항을 정밀 추출하여 체크리스트와 목차를 1:1 매핑 생성합니다.'
    },
    {
      id: 'qa',
      title: '질의응답 기반 제안서',
      subtitle: 'Q&A Assisted',
      badge: null,
      desc: '제안 핵심 전략 및 차별화 요소를 대화형 인터뷰 질의응답을 거쳐 단계별 스토리라인을 생성합니다.'
    },
    {
      id: 'blank',
      title: '자유 작성',
      subtitle: 'Freeform Outline',
      badge: null,
      desc: '기본 공공 표준 목차를 템플릿으로 제공하며, 자유롭게 목차 구조를 편집하고 초안을 작성합니다.'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA]">
      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full p-8 space-y-7">
        {/* 1. 기본정보 카드 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#E60012]" />
              <h2 className="text-sm font-black text-[#111111]">
                기본정보
              </h2>
            </div>
            <span className="text-xs font-bold text-[#E60012] bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
              수주 검토 승인 완료 (PWin {project.pWin || 74}점)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* 1행: 프로젝트명 */}
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-semibold text-neutral-400 block">프로젝트명</span>
              <span className="font-bold text-[#111111] text-sm mt-0.5 block">
                {project.title}
              </span>
            </div>

            {/* 2행: 발주처, 사업예산, 마감일 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-semibold text-neutral-400 block">발주처</span>
                <span className="font-bold text-[#111111] mt-0.5 block">
                  {project.agency}
                </span>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-semibold text-neutral-400 block">사업예산</span>
                <span className="font-bold text-[#E60012] mt-0.5 block">
                  {project.budget ? `${(project.budget / 100000000).toFixed(1)}억원` : '12.0억원'}
                </span>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-semibold text-neutral-400 block">마감일</span>
                <span className="font-bold text-[#111111] mt-0.5 block">
                  {project.deadline} (D-28)
                </span>
              </div>
            </div>
          </div>

          {/* Registered Docs List */}
          <div className="pt-2">
            <span className="text-xs font-bold text-neutral-700 block mb-2">
              기존 등록된 문서 목록 ({registeredDocs.length}건)
            </span>
            <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-24 text-center">구분</th>
                    <th className="py-2.5 px-3">파일명</th>
                    <th className="py-2.5 px-3 w-28 text-center">문서 유형</th>
                    <th className="py-2.5 px-3 w-20 text-right">크기</th>
                    <th className="py-2.5 px-3 w-20 text-center">미리보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {registeredDocs.map(doc => (
                    <tr key={doc.id} className={doc.isPrimaryRfp ? 'bg-red-50/30' : 'hover:bg-neutral-50'}>
                      <td className="py-2.5 px-3 text-center">
                        {doc.isPrimaryRfp ? (
                          <span className="text-[10px] font-black text-[#E60012] bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                            ★ 대표 RFP
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-400">
                            관련 문서
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#111111]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[11px] font-semibold text-neutral-600">
                          {doc.docType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-500 font-mono">
                        {doc.size}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                          title="미리보기"
                        >
                          <Eye className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 2. 추가 참고자료 등록 (Section 12: 추가 참고자료만 등록 가능) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-[#E60012]" />
              <h2 className="text-sm font-black text-[#111111]">
                추가 참고자료 등록 (선택 사항)
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              최신 기술 사양서, 추가 증빙 등 필요한 경우에만 추가 등록
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-neutral-300 hover:border-[#E60012] bg-neutral-50 hover:bg-white text-xs font-bold text-neutral-700 hover:text-[#E60012] cursor-pointer transition-all">
              <Plus className="w-4 h-4" />
              <span>추가 참고자료 파일 선택 (PDF, DOCX, HWP)</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.hwp"
                onChange={handleUploadExtra}
              />
            </label>
          </div>

          {extraDocs.length > 0 && (
            <div className="space-y-1.5">
              {extraDocs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#E60012]" />
                    <span className="font-bold text-[#111111]">{doc.fileName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">({doc.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtraDocs(prev => prev.filter(d => d.id !== doc.id))}
                    className="text-neutral-400 hover:text-[#E60012] font-bold text-[11px] cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. 제안서 작성 방식 선택 (Section 12) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#E60012]" />
              <h2 className="text-sm font-black text-[#111111]">
                제안서 작성 방식 선택
              </h2>
            </div>
            <span className="text-xs font-bold text-[#E60012]">* 필수 선택</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {creationMethods.map(method => {
              const isSelected = creationMethod === method.id;
              return (
                <div
                  key={method.id}
                  onClick={() => setCreationMethod(method.id as typeof creationMethod)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-[#E60012] bg-red-50/20 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#111111]">
                        {method.title}
                      </span>
                      {method.badge && (
                        <span className="text-[10px] font-black text-white bg-[#E60012] px-1.5 py-0.2 rounded">
                          {method.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {method.subtitle}
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                      {method.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-[#E60012] text-white' : 'border border-neutral-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-bold text-neutral-700">
                      {isSelected ? '선택됨' : '선택하기'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 세부 작성 설정 (템플릿, 언어, 담당자, 범위) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E60012]" />
              <h2 className="text-sm font-black text-[#111111]">
                제안서 세부 규격 및 담당자 설정
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 제안서 템플릿 선택 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                제안서 템플릿
              </label>
              <select
                value={templateType}
                onChange={e => setTemplateType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
              >
                <option value="공공기관 표준 기술제안서 템플릿 (KPC 표준)">
                  공공기관 표준 기술제안서 템플릿 (KPC 표준 5장 체계)
                </option>
                <option value="공공 IT 평가 최적화 템플릿 (CSAP & 신기술 가점 특화)">
                  공공 IT 평가 최적화 템플릿 (CSAP & 신기술 가점 특화)
                </option>
                <option value="전략 컨설팅 및 연구용역 제안서 템플릿">
                  전략 컨설팅 및 연구용역 제안서 템플릿
                </option>
              </select>
            </div>

            {/* 작성 언어 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                작성 언어
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
              >
                <option value="한국어">한국어 (공공기관 표준 입찰 규격)</option>
                <option value="English">English (Global Bidding Specification)</option>
              </select>
            </div>

            {/* 작성 범위 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                작성 범위
              </label>
              <select
                value={targetScope}
                onChange={e => setTargetScope(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
              >
                <option value="전체 제안서 (총괄개요 + 기술/기능 + 사업관리 + 지원)">
                  전체 제안서 (총괄개요 + 기술/기능 + 사업관리 + 지원)
                </option>
                <option value="기술제안서 중심 (기술 아키텍처 + RAG 솔루션 집중)">
                  기술제안서 중심 (기술 아키텍처 + RAG 솔루션 집중)
                </option>
                <option value="요약본 및 발표자료 (PT 본)">
                  요약본 및 발표자료 (PT 본)
                </option>
              </select>
            </div>

            {/* 담당자 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                담당자
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer (Section 12: [RFP 분석 시작] 버튼) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-[#111111]">
              설정 완료 후 RFP 분석 시작
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              버튼을 클릭하면 2단계 <strong>‘RFP 분석’</strong>으로 즉시 이동하여 요구사항 추출 및 정밀 분석 보고서를 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartAnalysis}
            className="px-8 py-3 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-black flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer shadow-red-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>RFP 분석 시작 (2단계로 이동)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          item={{
            id: previewDoc.id,
            title: previewDoc.fileName,
            category: previewDoc.docType || 'RFP',
            size: previewDoc.size,
            fileFormat: 'PDF',
            department: 'AI산업본부',
            description: '등록된 제안서 작성 참고 문서입니다.',
            tags: [],
            updatedAt: previewDoc.uploadDate,
            useCount: 0
          }}
          onClose={() => setPreviewDoc(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};

export default ProposalSetupView;
