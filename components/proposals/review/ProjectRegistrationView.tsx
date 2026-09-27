"use client";

import React, { useState } from 'react';
import {
  Calendar,
  Coins,
  User,
  FileText,
  Upload,
  Trash2,
  Eye,
  Download,
  Sparkles,
  ArrowLeft,
  Star,
  FileCheck,
  FolderPlus,
} from 'lucide-react';
import type {
  Department,
  ProposalDocumentType,
  ProposalProject,
  ProjectRelatedDoc,
  PWinEvaluationItem,
} from "@/types/proposals";
import { DEFAULT_PWIN_ITEMS } from "@/data/proposals/pwin";
import DocumentPreviewModal from "./DocumentPreviewModal";

export interface ProjectRegistrationViewProps {
  onBack?: () => void;
  onCancel?: () => void;
  onRegisterComplete?: (newProject: ProposalProject) => void;
  onCompleteRegistration?: (newProject: ProposalProject) => void;
  onShowToast: (msg: string) => void;
}

export const ProjectRegistrationView: React.FC<ProjectRegistrationViewProps> = ({
  onBack,
  onCancel,
  onRegisterComplete,
  onCompleteRegistration,
  onShowToast
}) => {
  // 1. 사업개요 State
  const [projectName, setProjectName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [agency, setAgency] = useState('');
  const [businessField, setBusinessField] = useState('AI 플랫폼 / 클라우드');
  const [businessSummary, setBusinessSummary] = useState('');
  const [budget, setBudget] = useState<number>(1200000000);
  const [businessPeriod, setBusinessPeriod] = useState('2026.10 ~ 2027.04 (6개월)');
  const [deadline, setDeadline] = useState('2026.10.15');
  const [department, setDepartment] = useState<Department>('AI산업본부');
  const [assignee, setAssignee] = useState('정소담');
  const [memo, setMemo] = useState('');

  // 2. 관련 문서 State
  const [docs, setDocs] = useState<ProjectRelatedDoc[]>([
    {
      id: 'doc-init-1',
      fileName: '2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf',
      docType: 'RFP',
      uploader: '정소담',
      uploadDate: '2026.09.18',
      size: '7.4 MB',
      isPrimaryRfp: true,
      pageCount: 64
    },
    {
      id: 'doc-init-2',
      fileName: '과업지시서_세부과업내역서_v1.0.docx',
      docType: '사업 관련 문서',
      uploader: '정소담',
      uploadDate: '2026.09.18',
      size: '2.8 MB',
      isPrimaryRfp: false,
      pageCount: 22
    },
    {
      id: 'doc-init-3',
      fileName: 'KPC_공공기관_AI구축_유사수행실적증명원.pdf',
      docType: '참고자료',
      uploader: '정소담',
      uploadDate: '2026.09.18',
      size: '4.1 MB',
      isPrimaryRfp: false,
      pageCount: 16
    }
  ]);

  const [newDocType, setNewDocType] = useState<ProposalDocumentType>('RFP');
  const [previewDoc, setPreviewDoc] = useState<ProjectRelatedDoc | null>(null);

  // 3. PWin 평가 State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pwinCompleted, setPwinCompleted] = useState(false);
  const [pwinItems, setPwinItems] = useState<PWinEvaluationItem[]>(DEFAULT_PWIN_ITEMS);
  const [selectedCitation, setSelectedCitation] = useState<PWinEvaluationItem | null>(null);
  const [customPwinScore, setCustomPwinScore] = useState<number | null>(null);

  // Auto-fill sample data for rapid verification
  const handleLoadSample = () => {
    setProjectName('공공기관 생성형 AI 업무혁신 플랫폼 구축');
    setBusinessName('2026년 공공기관 맞춤형 생성형 AI 및 지식 RAG 플랫폼 구축 사업');
    setAgency('한국산업진흥원');
    setBusinessField('AI 플랫폼 / 클라우드');
    setBusinessSummary(`1. 공공 행정 업무 자동화 및 사내 지식 기반 RAG 생성형 AI 플랫폼 구축\n2. 공공기관 행정망 분리 환경 준수 및 망연계 보안 게이트웨이 연동\n3. 전사 공공 서식 자동 작성 및 지능형 문서 요약 서비스 구현으로 생산성 40% 향상\n4. CSAP 인증 보안 가이드라인 및 국가정보보안기본지침 100% 충족`);
    setBudget(1200000000);
    setBusinessPeriod('2026.10.01 ~ 2027.04.30 (6개월)');
    setDeadline('2026.10.15');
    setDepartment('AI산업본부');
    setAssignee('정소담');
    setMemo('전년도 정보화 선행 컨설팅을 KPC에서 성공적으로 수행하여 고객사 호감도 높음. 기술평가 90% 비중으로 기술 제안 차별화가 필수적임.');
    onShowToast('샘플 사업 데이터가 자동으로 입력되었습니다.');
  };

  // Document management
  const handleSetPrimaryRfp = (id: string) => {
    setDocs(prev => prev.map(d => ({
      ...d,
      isPrimaryRfp: d.id === id
    })));
    const target = docs.find(d => d.id === id);
    onShowToast(`'${target?.fileName}'이(가) 대표 RFP로 지정되었습니다.`);
  };

  const handleDeleteDoc = (id: string) => {
    const target = docs.find(d => d.id === id);
    if (target?.isPrimaryRfp && docs.length > 1) {
      const remaining = docs.filter(d => d.id !== id);
      remaining[0].isPrimaryRfp = true;
      setDocs(remaining);
    } else {
      setDocs(prev => prev.filter(d => d.id !== id));
    }
    onShowToast(`'${target?.fileName}' 파일이 삭제되었습니다.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newDoc: ProjectRelatedDoc = {
        id: `doc-${Date.now()}`,
        fileName: file.name,
        docType: newDocType,
        uploader: assignee || '정소담',
        uploadDate: '2026.09.18',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isPrimaryRfp: docs.length === 0,
        pageCount: 30
      };
      setDocs(prev => [...prev, newDoc]);
      onShowToast(`'${file.name}' 문서가 [${newDocType}] 유형으로 등록되었습니다.`);
    }
  };

  // Run AI PWin Evaluation
  const handleRunPWin = () => {
    if (!projectName.trim()) {
      onShowToast('사업개요의 [프로젝트명]을 먼저 입력해 주세요.');
      return;
    }
    const hasPrimaryRfp = docs.some(d => d.isPrimaryRfp);
    if (!hasPrimaryRfp) {
      onShowToast('관련 문서 중 1개를 [대표 RFP]로 지정해야 PWin 평가가 가능합니다.');
      return;
    }

    setIsEvaluating(true);
    onShowToast('AI가 입력된 사업정보와 대표 RFP 원문을 심층 교차 분석 중입니다...');

    setTimeout(() => {
      setIsEvaluating(false);
      setPwinCompleted(true);
      setPwinItems(DEFAULT_PWIN_ITEMS);
      onShowToast('PWin 평가가 완료되었습니다! (종합 수주확률 74점)');
    }, 1200);
  };

  // Calculate Average PWin Score
  const calculateTotalScore = () => {
    if (!pwinItems || pwinItems.length === 0) return 74;
    const sum = pwinItems.reduce((acc, item) => acc + item.score, 0);
    return Math.round((sum / (pwinItems.length * 10)) * 100);
  };

  const calculatedScore = calculateTotalScore();
  const currentTotalScore = customPwinScore !== null ? customPwinScore : calculatedScore;

  const handleBack = () => {
    if (pwinCompleted) {
      onShowToast(`PWin 점수 (${currentTotalScore}점) 설정으로 돌아갑니다.`);
    }
    if (onBack) {
      onBack();
    } else if (onCancel) {
      onCancel();
    }
  };

  // Final Registration
  const handleRegisterProject = () => {
    if (!pwinCompleted) {
      onShowToast('프로젝트 등록을 위해 먼저 [PWin 평가하기]를 완료해 주세요.');
      return;
    }

    const primaryRfp = docs.find(d => d.isPrimaryRfp) || docs[0];

    const newProject: ProposalProject = {
      id: `proj-${Date.now()}`,
      title: projectName.trim() || '신규 제안 사업',
      agency: agency.trim() || '한국생산성본부',
      budget: budget || 1000000000,
      deadline: deadline || '2026.10.15',
      dDay: 28,
      status: '검토 대기',
      stage: '검토 대기',
      department: department === '전체' ? 'AI산업본부' : department,
      manager: assignee || '정소담',
      teamMembers: [assignee || '정소담', '김민수'],
      pWin: currentTotalScore,
      summary: businessSummary,
      progress: 0,
      activeStep: 'setup',
      workflowMode: 'requirements',
      rfpId: `rfp-${Date.now()}`,
      projectType: 'Proposal AI',
      workflowType: 'requirements',
      creationMethod: 'requirements',
      analysisStatus: '등록 완료',
      analysisProgress: 0,
      projectName: projectName.trim(),
      businessName: businessName.trim() || projectName.trim(),
      businessField,
      businessSummary,
      businessPeriod,
      memo,
      primaryRfpFileName: primaryRfp?.fileName,
      pwinBreakdown: pwinItems,
      relatedDocs: docs,
      lastModified: '2026.09.18'
    };

    if (onRegisterComplete) {
      onRegisterComplete(newProject);
    } else if (onCompleteRegistration) {
      onCompleteRegistration(newProject);
    }
    onShowToast(`'${newProject.title}' 프로젝트가 '검토대기' 상태로 성공적으로 등록되었습니다.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA]">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-20 px-8 py-3.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-end">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3.5 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 text-neutral-600" />
              <span>샘플 데이터 불러오기</span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-600" />
              <span>돌아가기</span>
            </button>
            <button
              type="button"
              onClick={handleRegisterProject}
              disabled={!pwinCompleted}
              className={`px-6 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                pwinCompleted
                  ? 'bg-[#E60012] hover:bg-[#CC0010] text-white shadow-red-200'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-8 space-y-8">
        {/* SECTION 1: 사업개요 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-7 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
                01
              </span>
              <div>
                <h2 className="text-base font-black text-[#111111]">사업개요</h2>
                <p className="text-xs text-neutral-500">해당 사업에 대한 기본 정보를 직접 입력합니다.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#E60012]">* 필수 입력 항목</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* 프로젝트명 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                프로젝트명 <span className="text-[#E60012]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 공공기관 생성형 AI 업무혁신 플랫폼 구축"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm font-bold text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/10"
              />
            </div>

            {/* 사업명 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                사업명 (공식 공고명)
              </label>
              <input
                type="text"
                placeholder="예: 2026년 공공기관 생성형 AI 및 지식 RAG 플랫폼 구축 사업"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-[#E60012]"
              />
            </div>

            {/* 발주처 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                발주처 <span className="text-[#E60012]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 한국산업진흥원"
                value={agency}
                onChange={e => setAgency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-[#E60012]"
              />
            </div>

            {/* 사업 분야 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                사업 분야
              </label>
              <select
                value={businessField}
                onChange={e => setBusinessField(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] bg-white focus:outline-none focus:border-[#E60012]"
              >
                <option value="AI 플랫폼 / 클라우드">AI 플랫폼 / 클라우드</option>
                <option value="공공 행정정보화 시스템">공공 행정정보화 시스템</option>
                <option value="DX 및 전략 컨설팅">DX 및 전략 컨설팅</option>
                <option value="스마트팩토리 / 데이터분석">스마트팩토리 / 데이터분석</option>
                <option value="AI 인재양성 / 교육훈련">AI 인재양성 / 교육훈련</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* 사업예산 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                사업예산 (원)
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step={10000000}
                  placeholder="예: 1200000000"
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="w-full pl-9 pr-14 py-2.5 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-[#E60012]">
                  {(budget / 100000000).toFixed(1)}억원
                </span>
              </div>
            </div>

            {/* 사업기간 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                사업기간
              </label>
              <input
                type="text"
                placeholder="예: 2026.10 ~ 2027.04 (6개월)"
                value={businessPeriod}
                onChange={e => setBusinessPeriod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
              />
            </div>

            {/* 제안 마감일 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                제안 마감일 <span className="text-[#E60012]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>

            {/* 담당부서 */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                담당부서
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as Department)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] bg-white focus:outline-none focus:border-[#E60012]"
              >
                <option value="AI산업본부">AI산업본부</option>
                <option value="AI사업본부">AI사업본부</option>
                <option value="컨설팅본부">컨설팅본부</option>
                <option value="교육사업본부">교육사업본부</option>
                <option value="생산성본부">생산성본부</option>
                <option value="CX본부">CX본부</option>
                <option value="자격사업본부">자격사업본부</option>
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
                  placeholder="예: 정소담 수석컨설턴트"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>
            </div>

            {/* 사업 주요내용 (여러 줄 텍스트) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                사업 주요내용 (RFP 핵심 과업 및 목적) <span className="text-[#E60012]">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="사업의 추진 목적과 주요 과업 범위를 여러 줄로 기술해 주세요."
                value={businessSummary}
                onChange={e => setBusinessSummary(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 text-xs text-[#111111] leading-relaxed placeholder-neutral-400 focus:outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/10 font-normal"
              />
            </div>

            {/* 기타 사업 관련 메모 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                기타 사업 관련 메모
              </label>
              <textarea
                rows={2}
                placeholder="고객사 동향, 컨소시엄 협력사, 주의해야 할 요구조건 등 특이사항을 기록합니다."
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-xs text-neutral-700 leading-relaxed placeholder-neutral-400 focus:outline-none focus:border-[#E60012]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: 관련 문서 등록 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-7 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
                02
              </span>
              <div>
                <h2 className="text-base font-black text-[#111111]">관련 문서 등록</h2>
                <p className="text-xs text-neutral-500">
                  프로젝트 관련 문서를 업로드하고, 반드시 하나를 <strong>‘대표 RFP’</strong>로 지정하세요. (PWin 평가와 검토의 기준 문서가 됩니다.)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-neutral-400">총 {docs.length}건 등록됨</span>
          </div>

          {/* Upload Controls */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-neutral-700 shrink-0">문서 유형:</span>
              <select
                value={newDocType}
                onChange={e => setNewDocType(e.target.value as ProposalDocumentType)}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
              >
                <option value="RFP">RFP</option>
                <option value="사업 관련 문서">사업 관련 문서</option>
                <option value="참고자료">참고자료</option>
                <option value="기타 자료">기타 자료</option>
              </select>
            </div>

            <label className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-neutral-300 hover:border-[#E60012] bg-white text-xs font-bold text-neutral-700 hover:text-[#E60012] cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>파일 선택 또는 여기로 드래그앤드롭 (PDF, DOCX, HWP)</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.hwp,.xlsx,.pptx"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Documents Table / Card List */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold">
                  <th className="py-3 px-4 w-12 text-center">대표</th>
                  <th className="py-3 px-4 min-w-[240px]">파일명</th>
                  <th className="py-3 px-3 w-28 text-center">문서 유형</th>
                  <th className="py-3 px-3 w-24 text-center">업로더</th>
                  <th className="py-3 px-3 w-24 text-center">업로드 날짜</th>
                  <th className="py-3 px-3 w-20 text-right">크기</th>
                  <th className="py-3 px-4 w-32 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {docs.map(doc => (
                  <tr
                    key={doc.id}
                    className={`transition-colors ${
                      doc.isPrimaryRfp ? 'bg-red-50/30' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryRfp(doc.id)}
                        title={doc.isPrimaryRfp ? '대표 RFP로 지정됨' : '클릭하여 대표 RFP로 지정'}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          doc.isPrimaryRfp
                            ? 'text-[#E60012]'
                            : 'text-neutral-300 hover:text-neutral-500'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${doc.isPrimaryRfp ? 'fill-[#E60012]' : ''}`} />
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 shrink-0 ${doc.isPrimaryRfp ? 'text-[#E60012]' : 'text-neutral-400'}`} />
                        <span className="font-bold text-[#111111] line-clamp-1">
                          {doc.fileName}
                        </span>
                        {doc.isPrimaryRfp && (
                          <span className="text-[10px] font-black text-[#E60012] bg-red-100 border border-red-200 px-1.5 py-0.2 rounded shrink-0">
                            ★ 대표 RFP
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                        doc.docType === 'RFP'
                          ? 'bg-neutral-100 text-[#111111] border-neutral-300'
                          : doc.docType === '사업 관련 문서'
                          ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}>
                        {doc.docType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center text-neutral-600 font-medium">
                      {doc.uploader}
                    </td>

                    <td className="py-3 px-3 text-center text-neutral-500 font-mono">
                      {doc.uploadDate}
                    </td>

                    <td className="py-3 px-3 text-right text-neutral-500 font-mono">
                      {doc.size}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 rounded text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="미리보기"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onShowToast(`'${doc.fileName}' 다운로드를 시작합니다.`)}
                          className="p-1 rounded text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="다운로드"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1 rounded text-neutral-400 hover:text-[#E60012] hover:bg-red-50 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: PWin 평가 기능 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-7 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#E60012] text-white font-black text-xs flex items-center justify-center">
                03
              </span>
              <div>
                <h2 className="text-base font-black text-[#111111]">PWin 평가 기능</h2>
                <p className="text-xs text-neutral-500">
                  AI가 사업개요와 대표 RFP를 분석해 PWin(Probability of Win) 종합 점수와 항목별 근거를 산출합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunPWin}
              disabled={isEvaluating}
              className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-black flex items-center gap-2 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#E60012]" />
              <span>{isEvaluating ? 'AI PWin 정밀 분석 중...' : pwinCompleted ? 'PWin 재평가하기' : 'PWin 평가하기'}</span>
            </button>
          </div>

          {/* Evaluating Animation */}
          {isEvaluating && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-10 h-10 border-3 border-neutral-200 border-t-[#E60012] rounded-full animate-spin" />
              <div className="text-sm font-black text-[#111111]">
                대표 RFP 및 KPC 수행실적 DB 교차 분석 중
              </div>
              <p className="text-xs text-neutral-500 max-w-md">
                사업 범위, 요구사항 적합도, 과거 공공 레퍼런스, 입찰 경쟁 환경을 기반으로 PWin 점수를 산출하고 있습니다.
              </p>
            </div>
          )}

          {/* Evaluation Results Card Grid */}
          {!isEvaluating && pwinCompleted && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Overall Score Header Banner */}
              <div className="p-6 rounded-2xl bg-[#111111] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    AI PROBABILITY OF WIN ESTIMATE
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                      PWin
                      <div className="relative inline-flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={currentTotalScore}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setCustomPwinScore(val);
                          }}
                          className="w-20 bg-neutral-800 text-[#E60012] font-black text-2xl px-2.5 py-0.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-[#E60012] text-center"
                        />
                      </div>
                      점
                    </span>
                    <span className="text-sm font-bold text-neutral-400">/ 100점</span>
                    {customPwinScore !== null && (
                      <button
                        type="button"
                        onClick={() => setCustomPwinScore(null)}
                        className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                      >
                        자동계산 되돌리기
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 mt-1.5">
                    기술 요건 적합도와 KPC 유사 실적이 반영된 PWin 점수입니다. 점수를 직접 클릭하여 수정하실 수 있습니다.
                  </p>
                </div>

                <div className="bg-neutral-800/80 px-5 py-3 rounded-xl border border-neutral-700 text-center shrink-0">
                  <div className="text-[10px] text-neutral-400 font-semibold">판정 등급</div>
                  <div className="text-base font-black text-[#E60012] mt-0.5">
                    {currentTotalScore >= 80 ? '수주 유력 (A등급)' : currentTotalScore >= 60 ? '수주 보통 (B등급)' : '수주 우려 (C등급)'}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">관리자 사업검토 권장</div>
                </div>
              </div>

              {/* 8 Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pwinItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs hover:border-neutral-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-400">
                          0{idx + 1}
                        </span>
                        <h3 className="text-xs font-black text-[#111111]">
                          {item.category}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                          item.resultLabel === '최우수' || item.resultLabel === '우수'
                            ? 'bg-red-50 text-[#E60012] border-red-200'
                            : item.resultLabel === '적합'
                            ? 'bg-neutral-100 text-[#111111] border-neutral-300'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                        }`}>
                          {item.resultLabel}
                        </span>
                        <select
                          value={item.score}
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value);
                            setPwinItems(prev => prev.map(p => p.id === item.id ? {
                              ...p,
                              score: newScore,
                              resultLabel: newScore >= 9 ? '최우수' : newScore >= 7 ? '우수' : newScore >= 5 ? '적합' : '보통'
                            } : p));
                          }}
                          className="text-xs font-black text-[#111111] font-mono bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                            <option key={s} value={s}>{s}/10점</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Rationale */}
                    <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                      {item.rationale}
                    </p>

                    {/* RFP Citation & AI Explanation */}
                    <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-neutral-400 font-semibold shrink-0">RFP 근거:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCitation(item);
                            onShowToast(`[${item.rfpCitationLocation}] 원문 위치로 이동합니다.`);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E60012] hover:underline bg-red-50 px-2 py-0.5 rounded border border-red-100 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{item.rfpCitationLocation}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">↗</span>
                        </button>
                      </div>

                      <p className="text-neutral-500 leading-relaxed bg-neutral-50 p-2 rounded border border-neutral-200/60">
                        <strong className="text-neutral-700 font-semibold">AI 설명: </strong>
                        {item.aiExplanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEvaluating && !pwinCompleted && (
            <div className="py-10 text-center border-2 border-dashed border-neutral-200 rounded-xl space-y-2">
              <Sparkles className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs font-bold text-neutral-600">
                사업개요와 대표 RFP를 기반으로 PWin 평가를 실행해 주세요.
              </p>
              <p className="text-[11px] text-neutral-400">
                PWin 평가가 완료되면 <strong>[프로젝트 등록]</strong> 버튼이 활성화되어 ‘검토대기’ 상태로 등록할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          item={{
            id: previewDoc.id,
            title: previewDoc.fileName,
            category: previewDoc.docType || 'RFP',
            size: previewDoc.size,
            fileFormat: 'PDF',
            department: department,
            description: `${projectName || '제안 사업'} 관련 등록 문서입니다.`,
            tags: [],
            updatedAt: previewDoc.uploadDate,
            useCount: 0
          }}
          onClose={() => setPreviewDoc(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* Citation Detail Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E60012]" />
                <h3 className="text-sm font-black text-[#111111]">
                  RFP 원문 근거 확인
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-xs font-bold text-neutral-400 hover:text-[#111111]"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                <span className="font-bold text-neutral-700">{selectedCitation.category}</span>
                <span className="font-mono font-bold text-[#E60012] bg-red-50 px-2 py-0.5 rounded">
                  {selectedCitation.rfpCitationLocation}
                </span>
              </div>

              <div>
                <span className="font-bold text-neutral-500 block mb-1">판단 근거:</span>
                <p className="text-neutral-800 leading-relaxed bg-[#F8F9FA] p-3 rounded-lg border border-neutral-200">
                  {selectedCitation.rationale}
                </p>
              </div>

              <div>
                <span className="font-bold text-neutral-500 block mb-1">AI 평가 설명:</span>
                <p className="text-neutral-700 leading-relaxed bg-red-50/40 p-3 rounded-lg border border-red-100">
                  {selectedCitation.aiExplanation}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2 bg-[#111111] text-white text-xs font-bold rounded-lg hover:bg-black"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectRegistrationView;
