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
import { ProposalLibraryItem, ProposalProject } from '@/types/proposals';

// 사내 전체 지식 저장소 (중앙부처, 공공기관, 지자체, 공기업 등 실적 및 자산 전체)
export const ENTERPRISE_KNOWLEDGE_BASE: (ProposalLibraryItem & {
  relevanceScore?: number;
  relevanceReason?: string;
  isAiRecommended?: boolean;
})[] = [
  {
    id: 'ent-1',
    title: '행정안전부 디지털플랫폼정부 생성형 AI 공통기반 연계 표준안',
    category: '기존 제안서',
    department: 'AI사업본부',
    description: '공공부문 전자정부 표준프레임워크(eGovFrame) 기반 AI 질의응답 및 LLM 모델 연계 표준안',
    tags: ['행안부', '전자정부', 'eGovFrame', '디지털플랫폼', 'AI연계'],
    fileFormat: 'PDF',
    size: '18.4 MB',
    updatedAt: '2026.08.15',
    useCount: 78,
    relevanceScore: 98,
    relevanceReason: '현재 제안요청서의 공공 프레임워크 연계 및 온프레미스 AI 연동 요건과 98% 일치',
    isAiRecommended: true,
    previewContent: {
      summary: '행정안전부 공통기반 사업에 KPC가 컨소시엄 리드로 참여하여 작성한 1위 수주 제안서 연계안입니다. 국가정보원 보안 지침과 전자정부 프레임워크 v4.2 규격을 준수하는 표준 인터페이스를 제공합니다.',
      keyHighlights: [
        'eGovFrame v4.2 완벽 호환 표준 API 게이트웨이 설계',
        '온프레미스 망분리 환경 내 국정원 보안성 검토 100% 무보완 승인 실적',
        '행정 문서 2,000만 건 기준 0.8초 이내 검색 속도 보장'
      ],
      sampleText: `[발췌문: 4장 1절 - 행안부 디지털플랫폼 연계 게이트웨이]
본 제안사는 행정안전부 전자정부 표준 프레임워크 4.2 아키텍처에 맞추어 REST API 및 gRPC 기반의 지능형 라우팅 인터페이스를 구성하였습니다. 이를 통해 내부 행정전산망의 분산 DB와 국정원 암호화 통신(ARIA 256bit)을 유지하며 안전하게 연계됩니다.`,
      toc: ['1. 연계 아키텍처 개요', '2. 전자정부 표준 준수성', '3. 보안 암호화 및 망연계', '4. 성능 부하 테스트 결과'],
      metadata: { '출처': 'KPC AI사업본부 공공데이터팀', '보안등급': '대외비', '적용사업': '행정안전부 공통기반' }
    }
  },
  {
    id: 'ent-2',
    title: '공공기관 망분리 환경 온프레미스 LLM/RAG 구축 아키텍처 가이드',
    category: '기술역량',
    department: '기술보안팀',
    description: '인터넷 차단 폐쇄망 환경에서 오픈소스/자체 sLLM(Solar, Llama3 등) 배포 및 벡터 DB 구축 지침',
    tags: ['망분리', '온프레미스', 'sLLM', 'RAG', '폐쇄망', '국정원보안'],
    fileFormat: 'DOCX',
    size: '12.1 MB',
    updatedAt: '2026.07.28',
    useCount: 92,
    relevanceScore: 96,
    relevanceReason: 'RFP 내 망분리 보안 요구사항 및 온프레미스 인프라 구성 요건과 직접 매칭',
    isAiRecommended: true,
    previewContent: {
      summary: '물리적/논리적 망분리가 적용된 공공기관 전산센터 내에 고성능 GPU 서버(H100/A100) 기반 온프레미스 LLM 인퍼런스 서버와 분산 벡터 데이터베이스를 구축하는 종합 기술 규격서입니다.',
      keyHighlights: [
        '폐쇄망 내 허브(HuggingFace) 미연결 독립 오프라인 배포 파이프라인',
        'vLLM 및 TensorRT-LLM 기반 초당 토큰 처리량 3.5배 가속화 설계',
        '국정원 보안성 검토 시 필수 제출하는 14대 보안 통제 항목 만족'
      ],
      sampleText: `[발췌문: 2장 3절 - 폐쇄망 GPU 클러스터 구성 규격]
인터넷 접속이 전면 통제된 온프레미스 환경에서 양자화(AWQ 4-bit)된 14B/70B 급 한국어 특화 파운데이션 모델을 안정적으로 서비스하기 위해, Kubernetes 기반 vLLM 인퍼런스 파드를 노드별로 다중화하여 단일 노드 장애 시에도 무중단(Failover) 서비스를 지원합니다.`,
      toc: ['1. 망분리 환경 제약조건', '2. sLLM 서빙 클러스터 구성', '3. RAG 벡터 DB 색인 방안', '4. 보안 감사 대응'],
      metadata: { '출처': 'KPC 솔루션사업단', '인증': 'CSAP 준수', '최종검토': '2026.07.28' }
    }
  },
  {
    id: 'ent-3',
    title: 'KPC 공공행정 5대 업무별 생성형 AI 프롬프트 템플릿 및 환각방지 검증집',
    category: '방법론',
    department: 'AI사업본부',
    description: '보고서 작성, 민원 답변 검토, 법령 해석, 통계 요약, 보도자료 초안 등 공공 실전 템플릿',
    tags: ['프롬프트', '환각방지', '공공행정', 'Grounding', '업무효율화'],
    fileFormat: 'HWP',
    size: '9.3 MB',
    updatedAt: '2026.08.20',
    useCount: 114,
    relevanceScore: 94,
    relevanceReason: '제안 과업의 업무 자동화 및 행정 비서 기능 구현에 즉시 인용 가능',
    isAiRecommended: true,
    previewContent: {
      summary: 'KPC가 중앙부처 3곳 및 지자체 공무원 400여 명의 실제 업무를 분석하여 도출한 5대 공공업무 프롬프트 엔지니어링 표준집입니다. 할루시네이션(환각)을 0.1% 미만으로 억제하는 Few-shot 및 CoT 기법이 수록되어 있습니다.',
      keyHighlights: [
        '5대 공공업무(보고서 기안, 민원 답변, 규정 검토, 보도자료, 통계분석) 표준 프롬프트',
        '출처 근거(Citation) 필수 표기 강제 프롬프트 구조화',
        '공공 행정 표준 서식(HWP 스타일) 자동 서식 변환 규칙 수록'
      ],
      sampleText: `[발췌문: 공공 감사보고서 요약 프롬프트 템플릿]
"당신은 공공 감사원 전문 행정관입니다. 첨부된 감사보고서 원문에서 '지적사항', '처분요구', '원인분석' 3개 항목만을 객관적 사실에 근거하여 추출하고, 추정이나 가설은 일절 배제하여 표 형태로 요약하십시오."`,
      toc: ['1. 프롬프트 표준화 원칙', '2. 업무별 템플릿 40선', '3. 사실 검증 프로토콜', '4. 행정서식 변환기'],
      metadata: { '적용기관': '기재부, 행안부, 고용부', '만족도': '94.6점', '업무단축': '평균 62%' }
    }
  },
  {
    id: 'ent-4',
    title: '2024~2026년 공공 대형 IT 사업 기획재정부·조달청 계약 규정 및 감점 방지 체크리스트',
    category: '인증 및 증빙',
    department: '경영지원본부',
    description: '국가계약법 시행령 개정사항, 하도급 비율 규제, 부정당업자 제재 예방 체크리스트',
    tags: ['국가계약법', '감점방지', '조달청', '하도급', '법정요건'],
    fileFormat: 'PDF',
    size: '6.7 MB',
    updatedAt: '2026.09.05',
    useCount: 65,
    relevanceScore: 91,
    relevanceReason: '공공 입찰 시 감점 요인을 사전 차단하기 위한 필수 컴플라이언스 기준',
    isAiRecommended: true,
    previewContent: {
      summary: '공공 제안서 작성 시 가장 빈번하게 발생하는 감점 및 입찰 무효 사유 30가지를 사전 점검할 수 있는 KPC 법무/계약팀 공식 감점 방지 체크리스트입니다.',
      keyHighlights: [
        '2026년 최신 국가를 당사자로 하는 계약에 관한 법률 시행령 반영',
        'SW사업 하도급 계획서 작성 기준 및 지분율 검토표',
        '직접생산확인증명서 및 중소기업자간 경쟁제품 준수 검토 가이드'
      ],
      sampleText: `[발췌문: 입찰 감점 예방 체크리스트 제4항]
- 필수 확인: 제안서 표지 및 간지에 제안사 특정 표식(로고, 상호) 블라인드 처리 여부(평가 규정 위반 시 1~2점 감점 즉시 적용됨). KPC 수주지원실 사전 검수 필증 부착 필수.`,
      toc: ['1. 국가계약법 개정 동향', '2. 조달청 협상계약 심사기준', '3. 30대 필수 감점 체크리스트'],
      metadata: { '발행부서': 'KPC 경영지원본부 법무팀', '버전': 'v2026.3', '검수완료': '2026.09.05' }
    }
  },
  {
    id: 'ent-5',
    title: '스마트 지자체 도시관제 AI 비전분석 및 이상행동 탐지 실적기술서',
    category: '수행 사례',
    department: '컨설팅본부',
    description: '광역시·도 스마트시티 통합플랫폼 CCTV 영상 AI 실시간 분석 사업 수행 실적 및 아키텍처',
    tags: ['스마트시티', '영상분석', 'CCTV', '지자체', '지능형관제'],
    fileFormat: 'PDF',
    size: '22.0 MB',
    updatedAt: '2026.06.12',
    useCount: 38,
    relevanceScore: 78,
    relevanceReason: '영상 AI 및 관제 관련 유사 사례 참조용',
    isAiRecommended: false
  },
  {
    id: 'ent-6',
    title: 'KPC 2026 임직원 개인정보보호 및 정보보안 실천서약서 모음집',
    category: '인증 및 증빙',
    department: '기술보안팀',
    description: '사업 착수 시 제출하는 투입인력 전원 보안서약서 양식 및 개인정보 처리위탁 계약서',
    tags: ['보안서약서', '개인정보', '착수계', '투입인력', '행정서식'],
    fileFormat: 'HWP',
    size: '3.8 MB',
    updatedAt: '2026.05.10',
    useCount: 54,
    relevanceScore: 82,
    relevanceReason: '제안 착수 및 사업관리 부문 필수 제출 서식',
    isAiRecommended: false
  },
  {
    id: 'ent-7',
    title: '대학 및 교육기관 맞춤형 AI 튜터 및 학사지원 챗봇 구축 사례집',
    category: '수행 사례',
    department: '교육혁신본부',
    description: '국립대 및 주요 사립대 LMS 연계 학생 학사상담 생성형 AI 구축 사례 5건',
    tags: ['대학', '에듀테크', '학사지원', 'LMS', '챗봇'],
    fileFormat: 'PDF',
    size: '15.6 MB',
    updatedAt: '2026.04.18',
    useCount: 29,
    relevanceScore: 65,
    relevanceReason: '교육 및 학사 상담 연계 유사 사업 참고자료',
    isAiRecommended: false
  },
  {
    id: 'ent-8',
    title: '공공 클라우드(NHN Cloud, 네이버클라우드) 인프라 사이징 및 비용 산정표',
    category: '기술역량',
    department: 'AI사업본부',
    description: '공공 CSAP 인증 클라우드 인스턴스(GPU, CPU, 스토리지) 산정 모델 및 월별 TCO 계산기',
    tags: ['클라우드', 'CSAP', '네이버클라우드', 'NHN클라우드', 'TCO', '비용산정'],
    fileFormat: 'XLSX',
    size: '4.2 MB',
    updatedAt: '2026.08.05',
    useCount: 47,
    relevanceScore: 88,
    relevanceReason: '제안서 사업비 산정 및 인프라 견적 구성 시 참고',
    isAiRecommended: false
  }
];

interface EnterpriseDataModalProps {
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
