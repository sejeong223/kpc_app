import type {
  ChecklistRequirement,
  ProposalOutlineItem,
  ProposalSectionItem,
  SectionStatusType,
  UploadedProposalFile,
} from "@/types/proposals";

export const SAMPLE_REFERENCE_MATERIALS: UploadedProposalFile[] = [
  {
    id: 'f-ref-001',
    fileName: 'KPC_회사소개서_2026.pdf',
    category: '참고자료',
    size: '5.2 MB',
    pages: 42,
    uploader: '정소담',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  },
  {
    id: 'f-ref-002',
    fileName: 'KPC_공공기관_생성형AI_구축_수행실적증명원.pdf',
    category: '참고자료',
    size: '4.5 MB',
    pages: 28,
    uploader: '정소담',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  },
  {
    id: 'f-ref-003',
    fileName: 'KPC_클라우드_보안인증_CSAP_및_ISMS-P_인증서.pdf',
    category: '참고자료',
    size: '3.1 MB',
    pages: 16,
    uploader: '김민수',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  },
  {
    id: 'f-ref-004',
    fileName: '생성형AI_기술아키텍처_및_망연계_표준가이드.docx',
    category: '참고자료',
    size: '4.2 MB',
    pages: 35,
    uploader: '박성훈',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'DOCX'
  },
  {
    id: 'f-ref-005',
    fileName: 'KPC_표준_프로젝트수행방법론_산출물양식집.pptx',
    category: '참고자료',
    size: '8.8 MB',
    pages: 54,
    uploader: '이서연',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PPTX'
  },
  {
    id: 'f-ref-006',
    fileName: '핵심투입인력_이력사항_및_경력증명서철.pdf',
    category: '참고자료',
    size: '6.0 MB',
    pages: 32,
    uploader: '정소담',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  },
  {
    id: 'f-ref-007',
    fileName: '공공기관_생성형AI_도입_우수사례집_2026.pdf',
    category: '참고자료',
    size: '11.4 MB',
    pages: 48,
    uploader: '최지호',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  }
];

export const INITIAL_PROJECT_FILES: UploadedProposalFile[] = [
  {
    id: 'f-001',
    fileName: 'KPC_AI플랫폼_RFP.pdf',
    category: 'RFP 문서',
    size: '8.4 MB',
    pages: 86,
    uploader: '정소담',
    uploadDate: '26.09.14',
    status: '등록 완료',
    type: 'PDF'
  },
  ...SAMPLE_REFERENCE_MATERIALS
];

export const INITIAL_KPC_CHECKLIST: ChecklistRequirement[] = [
  {
    id: 'CHK-001',
    category: '제출기한/장소',
    text: '제안서 제출 마감 일시 (2026년 10월 15일 17:00까지) 엄수',
    source: 'RFP p.4 / 1. 입찰 및 제안 안내',
    rfpPage: 4,
    rfpQuote: '입찰 마감 일시: 2026년 10월 15일(목) 17:00까지 (마감시간 이후 정각 제출 불가)',
    checked: true,
    completedBy: '정소담',
    completedAt: '2026-09-16 11:20',
    type: '체크사항'
  },
  {
    id: 'CHK-002',
    category: '제출기한/장소',
    text: '제출 장소: 서울 종로구 KPC 본사 10층 사업관리팀 직접 방문 제출 (우편 및 이메일 제출 불가)',
    source: 'RFP p.4 / 1. 입찰 및 제안 안내',
    rfpPage: 4,
    rfpQuote: '제출 장소: 서울시 종로구 적선동 KPC 본사 10층 사업관리팀 직접 방문 제출 (우편 접수 불가)',
    checked: true,
    completedBy: '정소담',
    completedAt: '2026-09-16 11:22',
    type: '체크사항'
  },
  {
    id: 'CHK-003',
    category: '제출기한/장소',
    text: '나라장터 e-발주 시스템 온라인 전송 및 오프라인 방문 제출 동시 완료 확인',
    source: 'RFP p.4 / 1. 제출방법',
    rfpPage: 4,
    rfpQuote: '나라장터 e-발주 시스템 전자 제출 및 오프라인 서류 방문 제출을 마감 전 모두 완료해야 함',
    checked: true,
    completedBy: '김민수',
    completedAt: '2026-09-16 14:05',
    type: '체크사항'
  },
  {
    id: 'CHK-004',
    category: '제출부수/매체',
    text: '제안서 원본 1부 (대표자 법인인감 직인 날인본) 제출',
    source: 'RFP p.5 / 2. 제출서류 목록',
    rfpPage: 5,
    rfpQuote: '제안서 원본 1부: 표지에 법인인감(또는 사용인감) 날인 및 인감증명서 필수 첨부',
    checked: true,
    completedBy: '김민수',
    completedAt: '2026-09-16 15:30',
    type: '체크사항'
  },
  {
    id: 'CHK-005',
    category: '제출부수/매체',
    text: '제안서 사본 9부 (심사용, 업체명 및 직인 날인 생략) 제출',
    source: 'RFP p.5 / 2. 제출서류 목록',
    rfpPage: 5,
    rfpQuote: '제안서 사본 9부: 블라인드 평가용으로 표지 및 본문의 업체명/로고/직인 날인 엄격히 금지',
    checked: true,
    completedBy: '정소담',
    completedAt: '2026-09-17 09:10',
    type: '체크사항'
  },
  {
    id: 'CHK-006',
    category: '제출부수/매체',
    text: '제안서 최종 PDF 파일 및 발표자료(PPT)를 저장한 USB 메모리 1개 제출',
    source: 'RFP p.5 / 2. 제출서류 목록',
    rfpPage: 5,
    rfpQuote: '제안서 및 발표자료 최종 전자파일을 USB 메모리 1개에 저장하여 제안서 서류와 함께 제출',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  },
  {
    id: 'CHK-007',
    category: '서식/규격',
    text: '제안서 본문 A4 규격 세로 방향 150쪽 이내 작성 (요약본 30쪽 이내 별도 작성)',
    source: 'RFP p.7 / 3. 제안서 작성지침',
    rfpPage: 7,
    rfpQuote: '제안서 본문 분량: A4 세로 규격 150쪽 이내 (요약본은 30쪽 이내 별도 작성하여 제출)',
    checked: true,
    completedBy: '정소담',
    completedAt: '2026-09-17 10:15',
    type: '체크사항'
  },
  {
    id: 'CHK-008',
    category: '서식/규격',
    text: '제안서 인쇄본 A4 양면 인쇄 후 좌철 책자 제본 (스프링/바인더/무선제본 금지)',
    source: 'RFP p.7 / 3. 제안서 작성지침',
    rfpPage: 7,
    rfpQuote: '인쇄 및 제본 규격: A4 양면 인쇄, 좌철 책자 제본 (스프링 및 바인더 사용 시 감점 처리)',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  },
  {
    id: 'CHK-009',
    category: '서식/규격',
    text: '전자파일 제출 명명 규칙 [2026_KPC_생성형AI_제안서_기관명.pdf] 준수',
    source: 'RFP p.8 / 4. 파일제출 유의사항',
    rfpPage: 8,
    rfpQuote: '전자파일 파일명 지정 규칙: [연도_사업명_서류명_업체명.pdf] 형식 지정 필수',
    checked: true,
    completedBy: '김민수',
    completedAt: '2026-09-17 11:00',
    type: '체크사항'
  },
  {
    id: 'CHK-010',
    category: '날인/밀봉',
    text: '가격제안서(별지 제1호) 및 세부산출내역서 별도 작성 후 밀봉 봉투에 넣어 제출',
    source: 'RFP p.9 / 5. 가격제안서 제출',
    rfpPage: 9,
    rfpQuote: '가격제안서 및 세부산출내역서는 기술제안서와 분리하여 별도 봉투에 넣고 밀봉하여 제출',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  },
  {
    id: 'CHK-011',
    category: '날인/밀봉',
    text: '가격제안서 밀봉 봉투 봉합 부위 3곳에 법인인감(또는 사용인감) 간인 날인 필수',
    source: 'RFP p.9 / 5. 가격제안서 제출',
    rfpPage: 9,
    rfpQuote: '밀봉 봉투의 봉합 부위 3곳에 법인인감(또는 사용인감)으로 간인 날인해야 유효함',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  },
  {
    id: 'CHK-012',
    category: '증빙/별첨',
    text: '투입인력 전원 보안서약서(별지 제4호) 및 개인정보 처리 확약서 날인본 별첨 제출',
    source: 'RFP p.12 / 별첨 서식',
    rfpPage: 12,
    rfpQuote: '참여인력 전원의 보안서약서 원본 및 개인정보 보호 확약서를 제안서 별첨으로 수록할 것',
    checked: true,
    completedBy: '정소담',
    completedAt: '2026-09-17 13:40',
    type: '체크사항'
  },
  {
    id: 'CHK-013',
    category: '증빙/별첨',
    text: '최근 3개년 유사사업 실적증명서(발주기관 원본 확인 필) 증빙 서류 첨부',
    source: 'RFP p.14 / 제출서류 안내 표',
    rfpPage: 14,
    rfpQuote: '실적증명서: 발주기관 원본 확인 필 또는 조달청 발행 실적증명서 원본만 정량평가에 인정',
    checked: true,
    completedBy: '김민수',
    completedAt: '2026-09-17 14:15',
    type: '체크사항'
  },
  {
    id: 'CHK-014',
    category: '발표/기타',
    text: '발표평가용 PPT 발표자료 10월 18일 12:00까지 담당자 이메일 사전 제출',
    source: 'RFP p.15 / 6. 발표평가 유의사항',
    rfpPage: 15,
    rfpQuote: '발표자료 제출: 발표일 2일 전 12:00까지 이메일(ai_proposal@kpc.or.kr) 사전 제출 필수',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  },
  {
    id: 'CHK-015',
    category: '발표/기타',
    text: '발표 당일 발표자(투입 PM) 재직증명서, 신분증 및 위임장 지참 (발표자 변경 불가)',
    source: 'RFP p.15 / 6. 발표평가 각주',
    rfpPage: 15,
    rfpQuote: '발표자는 본 사업 투입예정 PM에 한하며 발표 당일 재직증명서 및 신분증 지참 필수',
    checked: false,
    completedBy: '-',
    type: '체크사항'
  }
];

export const ALL_SECTION_STATUSES: SectionStatusType[] = [
  '시작 전',
  '작성 중',
  '검토 대기',
  '검토 중',
  '완료'
];

export const PRESET_AUTHORS = ['정소담', '김민수', '박지훈', '이서연', '최유진', '강동원'];
export const PRESET_REVIEWERS = ['김민수', '이서연', '정소담', '박지훈', '최유진', '강동원'];

export const INITIAL_PROPOSAL_SECTIONS: ProposalSectionItem[] = [
  {
    id: 'sec-1',
    sectionNumber: '1',
    title: '1. 사업 이해 및 추진전략',
    level: 1,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-22',
    dueDate: '2026-09-22',
    charLimit: 4000,
    currentCharCount: 2450,
    content: `1.1 제안 배경 및 추진 목적
본 제안사는 한국생산성진흥회의 생성형 AI 도입 및 디지털 혁신 비전에 적극 동참하고자 엔터프라이즈 맞춤형 AX 플랫폼을 제안합니다. 특히 노규성 회장의 디지털 생산성 혁신기조에 발맞추어 전사 임직원 업무 효율을 40% 이상 극대화할 수 있도록 지원합니다.

1.2 추진 전략 및 파트너십
본 사업은 2024년도 AI 선도사업 수행 노하우와 삼성SDS의 컨소시엄 협업 체계를 기반으로 하여 무결점 서비스를 보장합니다. 착수 후 8개월 이내에 전사 포털 연계 및 AI 에이전트 마켓플레이스 구축을 완수할 것을 약속드립니다.`
  },
  {
    id: 'sec-2',
    sectionNumber: '2',
    title: '2. AI 플랫폼 구축방안',
    level: 1,
    status: '검토 대기',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 6000,
    currentCharCount: 4200,
    content: `2.1 AI 플랫폼 전체 아키텍처
본 제안사는 마이크로서비스 아키텍처(MSA)를 기반으로 고가용성 멀티존 클라우드 인프라와 온프레미스 보안 영역을 유기적으로 연계하는 하이브리드 아키텍처를 설계하였습니다. 모든 서비스 컴포넌트는 쿠버네티스(K8s) 클러스터 상에서 컨테이너 기반으로 격리 배포되며, 트래픽 폭증 시 자동 오토스케일링(HPA)을 지원합니다.

2.2 Multi-LLM 운영 및 스마트 라우팅 방안
사용자의 질의 의도와 프롬프트 토큰 길이, 그리고 데이터 보안 등급을 실시간으로 분석하는 지능형 AI 라우터(Intelligent Model Gateway)를 구축합니다. 민감한 내부 규정 질의는 온프레미스 sLLM 또는 ZDR 승인 엔터프라이즈 모델로 자동 격리 처리되며, 복합 분석 작업은 최상위 추론 모델로 동적 분기됩니다.

2.3 사내 지식 기반 RAG 구축 방안
KPC 사내 지식자산(컨설팅 레포트, 교육 교재, 행정 규정집 등)을 표와 차트의 구조적 의미 손실 없이 청킹(Chunking)하는 지능형 HWP/PDF 파서를 적용하여 검색 정확도(Hit Rate) 94% 이상을 달성합니다. 하이브리드 검색(BM25 + Dense Vector Embedding) 및 Cross-Encoder 리랭커를 표준 탑재합니다.

2.4 KPC 맞춤형 AI Agent 구축 및 생태계 방안
현업 실무자가 프롬프트와 사내 문서 연결만으로 5분 내에 나만의 전용 에이전트를 구축할 수 있는 노코드(No-Code) Agent Builder를 제공합니다. 제작된 에이전트는 사내 마켓플레이스에서 보안 심사 후 원클릭 배포됩니다.`
  },
  {
    id: 'sec-2-1',
    sectionNumber: '2.1',
    title: '  2.1 플랫폼 전체 아키텍처',
    level: 2,
    status: '완료',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 2000,
    currentCharCount: 1850,
    content: `본 플랫폼은 Enterprise AI Core를 중심으로 Presentation Layer, Service Mesh Layer, AI Routing Gateway, Vector DB & Storage Layer의 4계층 구조로 설계되었습니다. 모든 통신은 mTLS 및 TLS 1.3 암호화 구간을 통과하며, 클라우드 네이티브 아키텍처를 준수하여 99.99% 가용성을 보장합니다.`
  },
  {
    id: 'sec-2-2',
    sectionNumber: '2.2',
    title: '  2.2 Multi-LLM 운영 방안',
    level: 2,
    status: '검토 대기',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 2000,
    currentCharCount: 1920,
    content: `Multi-LLM 운영을 위한 API 게이트웨이 및 모델별 레이트 리밋(Rate Limit)과 장애 시 자동 Failover를 구현합니다. CSP별 응답 속도, 비용, 쿼럼 상태를 실시간 모니터링하여 최적의 가성비와 응답 품질을 유지합니다.`
  },
  {
    id: 'sec-2-3',
    sectionNumber: '2.3',
    title: '  2.3 RAG 구축 방안',
    level: 2,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-25',
    dueDate: '2026-09-25',
    charLimit: 2000,
    currentCharCount: 1850,
    content: `RAG 엔진은 하이브리드 검색(BM25 키워드 검색 + 밀집 벡터 임베딩 코사인 유사도 검색)과 리랭킹(Cross-Encoder Reranker) 파이프라인을 결합합니다. HWP 한글 문서 특화 청킹 엔진을 적용하여 표/각주 데이터의 누락을 원천 차단합니다.`
  },
  {
    id: 'sec-2-4',
    sectionNumber: '2.4',
    title: '  2.4 AI Agent 구축 방안',
    level: 2,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-25',
    dueDate: '2026-09-25',
    charLimit: 2000,
    currentCharCount: 1400,
    content: `사내 에이전트 마켓플레이스를 제공하여 부서별 우수 에이전트를 원클릭으로 구독하고 조직 간 지식 전파를 극대화합니다. 권한 관리 및 프롬프트 인젝션 방어 필터를 내장하여 비인가 데이터 접근을 통제합니다.`
  },
  {
    id: 'sec-3',
    sectionNumber: '3',
    title: '3. 데이터 및 시스템 연계 방안',
    level: 1,
    status: '검토 중',
    author: '이서연',
    reviewer: '김민수',
    updatedAt: '2026-09-26',
    dueDate: '2026-09-26',
    charLimit: 5000,
    currentCharCount: 3200,
    content: `3.1 Microsoft 365 및 Entra ID 연계
Microsoft Graph API 및 Entra ID OAuth 2.0 프로토콜을 활용하여 단일 인증(SSO)과 M365 앱 간 원활한 문서 데이터 송수신을 구현합니다. Teams 봇 앱 및 Word Add-in을 기본 번들로 제공하여 임직원 업무 흐름의 단절 없는 AI 활용을 지원합니다.

3.2 사내 레거시 시스템 연계 (ERP / LMS / 그룹웨어)
표준 Model Context Protocol (MCP) 서버를 구축하여 사내 ERP 및 그룹웨어의 정형 데이터를 안전하게 호출할 수 있는 함수 호출(Function Calling) 체계를 완성합니다. 레거시 API 규격에 대한 표준 어댑터를 제공하여 연계 개발 공수를 40% 절감합니다.`
  },
  {
    id: 'sec-4',
    sectionNumber: '4',
    title: '4. 보안 및 데이터 보호 방안',
    level: 1,
    status: '완료',
    author: '최유진',
    reviewer: '강동원',
    updatedAt: '2026-09-27',
    dueDate: '2026-09-27',
    charLimit: 4000,
    currentCharCount: 2950,
    content: `4.1 데이터 무저장(Zero Data Retention) 원칙 및 개인정보 필터링
공공기관 보안 가이드라인에 의거하여 모든 입출력 프롬프트는 CSP에 영구 저장되거나 AI 모델 학습에 사용되지 않는 전용 Enterprise 계약을 체결합니다. 전송 전 단계에서 주민등록번호, 계좌번호, 전화번호 등 민감 개인정보(PII)를 실시간 마스킹하는 DLP 필터를 전진 배치합니다.

4.2 역할 기반 접근 제어 (RBAC) 및 보안 감사 로그
문서 단위 및 부서 단위의 엄격한 ACL(Access Control List)을 적용하여 직급 및 권한에 부합하는 지식만 RAG 검색 결과에 노출되도록 보장합니다. 모든 AI 사용 내역, 프롬프트 전송 기록, 다운로드 이력은 변경 불가능한 무결성 감사 로그로 최소 3년간 보관됩니다.`
  },
  {
    id: 'sec-5',
    sectionNumber: '5',
    title: '5. 운영 및 유지관리 방안',
    level: 1,
    status: '작성 중',
    author: '강동원',
    reviewer: '정소담',
    updatedAt: '2026-09-28',
    dueDate: '2026-09-28',
    charLimit: 3000,
    currentCharCount: 2200,
    content: `5.1 안정적 서비스 운영 및 장애 대응 체계
24x7 실시간 APM(Application Performance Monitoring) 모니터링 시스템을 가동하여 응답 지연 및 API 장애를 사전에 감지하고 즉각 조치합니다. 중대 장애 발생 시 30분 이내 긴급 대응 및 2시간 이내 정상 복구를 보장하는 전담 기술 지원 조직을 구성합니다.

5.2 사용자 교육 및 변화 관리 지원
단계별 임직원 AI 리터러시 교육 커리큘럼(입문, 실무, 에이전트 개발 과정)을 운영하고 온라인 동영상 매뉴얼 및 퀵 가이드를 제공합니다. 주기적인 사용자 만족도 조사 및 기능 개선 피드백 루프를 가동하여 플랫폼 안착률을 90% 이상으로 제고합니다.`
  },
  {
    id: 'sec-6',
    sectionNumber: '6',
    title: '6. 수행 조직 및 일정 관리',
    level: 1,
    status: '검토 대기',
    author: '김민수',
    reviewer: '정소담',
    updatedAt: '2026-09-30',
    dueDate: '2026-09-30',
    charLimit: 2500,
    currentCharCount: 1980,
    content: `6.1 프로젝트 추진 조직 및 투입 인력 계획
PM(프로젝트 관리자), AI 아키텍트, Full-stack 개발자, M365 연계 전문가, UI/UX 디자이너, QA 엔지니어 등 총 12명의 전문 정규직 인력을 전담 배치하여 품질과 납기를 책임집니다.

6.2 WBS 마일스톤 및 단계별 일정 계획
총 6개월간 분석/설계(1~2개월) → 플랫폼 구축 및 LLM 연계(3~4개월) → M365 통합 및 RAG 지식화(5개월) → 통합 테스트, 시범 운영 및 최종 오픈(6개월) 일정으로 차질 없이 완수합니다.`
  }
];

export interface AiAnalysisCardItem {
  id: number;
  title: string;
  categoryName: string;
  content: string;
  rfpPage: number;
  rfpQuote: string;
  isWinTheme?: boolean;
}

export const KPC_AI_ANALYSIS_11_ITEMS: AiAnalysisCardItem[] = [
  {
    id: 1,
    title: '1. 프로젝트 요약',
    categoryName: '프로젝트 요약',
    content: '본 사업은 한국생산성본부(KPC) 임직원 및 기업 교육·컨설팅 고객을 대상으로 안전하고 고도화된 사내 전용 생성형 AI 업무혁신 플랫폼을 구축하는 프로젝트입니다. 총 사업예산 12억 원, 계약체결일로부터 8개월 동안 진행되며, 보안 무보존(ZDR) 아키텍처, M365 연계, Multi-LLM 라우팅 및 Agent 생태계 조성을 목표로 합니다.',
    rfpPage: 3,
    rfpQuote: '사업명: KPC 생성형 AI 플랫폼 구축 사업 / 사업기간: 계약체결일로부터 8개월 / 사업예산: 1,200,000,000원'
  },
  {
    id: 2,
    title: '2. 프로젝트 범위',
    categoryName: '프로젝트 범위',
    content: '1) 사내 지식 기반 RAG 검색 및 임베딩 파이프라인 구축 (KPC 규정, 교육 교재, 컨설팅 보고서 등)\n2) Enterprise Multi-LLM(Gemini, Claude, GPT) 지능형 라우팅 및 sLLM 연동\n3) Microsoft 365(Teams, Outlook, Word) 및 사내 ERP/그룹웨어 MCP/REST 연계\n4) KPC 직원이 코딩 없이 직접 사내 맞춤형 AI Agent를 생성·배포·공유할 수 있는 커뮤니티 허브 구현',
    rfpPage: 5,
    rfpQuote: '과업범위: 1. 사내 지식 RAG 플랫폼 구축 2. Multi-LLM 라우터 구현 3. M365 및 사내 ERP 연계 4. 직원 참여형 Agent 생태계 조성'
  },
  {
    id: 3,
    title: '3. 주요 일정',
    categoryName: '주요 일정',
    content: '• 입찰 마감: 2026년 10월 30일 17:00\n• 기술 제안서 평가(PT 발표): 2026년 11월 06일\n• 우선협상대상자 선정 및 기술협상: 2026년 11월 10일 ~ 11월 17일\n• 본 계약 체결 및 착수 보고: 2026년 11월 하순\n• 1차 파일럿 서비스(M365 연계 및 기본 RAG): 착수 후 3개월 차 (2027년 2월)\n• 최종 구축 완료 및 전사 오픈: 착수 후 8개월 차 (2027년 7월)',
    rfpPage: 8,
    rfpQuote: '제출기한: 2026.10.30 17:00 전자접수 / 제안서 설명회: 제안서 접수 후 개별 통보'
  },
  {
    id: 4,
    title: '4. 연결된 정보',
    categoryName: '연결된 정보',
    content: '• 사내 인증 체계: Microsoft Entra ID (Azure AD) Single Sign-On(SSO) 연동 필수\n• 연계 대상 시스템: KPC 통합 ERP(SAP), 그룹웨어(결재/일정), 교육 LMS, 컨설팅 지식DB\n• 통신 프로토콜: RESTful API 및 Model Context Protocol (MCP) 표준 프로토콜 준수',
    rfpPage: 15,
    rfpQuote: '기존 시스템 연계: Entra ID 기반 단일 로그인 지원 및 사내 4대 레거시 시스템과의 REST/MCP API 연계 필수'
  },
  {
    id: 5,
    title: '5. 참조사항',
    categoryName: '참조사항',
    content: '• 행정안전부 및 국가정보원 생성형 AI 보안 가이드라인 준수 필수\n• KPC 내부 보안 규정: AI 모델 제공업체(CSP)에 의한 사내 데이터 학습 및 저장 절대 금지(Zero Data Retention)\n• 제안서 분량: 본문 기준 100페이지 이내 권장 (별첨 기술 증빙 제외)',
    rfpPage: 12,
    rfpQuote: '보안 원칙: 외부 LLM API 호출 시 프롬프트 및 응답 데이터의 학습 금지(Zero Retention) 확약 필수'
  },
  {
    id: 6,
    title: '6. 방법론 및 절차',
    categoryName: '방법론 및 절차',
    content: '• 단계별 애자일(Agile) + 폭포수(Waterfall) 하이브리드 방법론 적용\n• 1단계: 요구사항 분석 및 AI 아키텍처 설계 (Sprint 1-2)\n• 2단계: 핵심 RAG 엔진 및 Multi-LLM 게이트웨이 구현 (Sprint 3-5)\n• 3단계: M365 및 레거시 연계, UI/UX 개발 (Sprint 6-8)\n• 4단계: 보안 감사, 부하 테스트, 전사 시범 운영 및 최종 오픈 (Sprint 9-10)',
    rfpPage: 18,
    rfpQuote: '수행 방법론: 본 사업의 신속한 PoC 검증과 안정적 본 서비스 론칭을 위한 반복 점진적 개발 방법론 제시 권장'
  },
  {
    id: 7,
    title: '7. 양식 및 법적 요구사항',
    categoryName: '양식 및 법적 요구사항',
    content: '• 입찰보증금 납부(입찰금액의 100분의 5 이상) 또는 지급확약서 제출\n• 소프트웨어사업자(컴퓨터관련서비스사업) 일반 현황 관리확인서\n• 개인정보보호 서약서, 청렴계약이행서약서, 비밀유지계약서(NDA) 제출\n• 하도급 제한: 소프트웨어 진흥법 제51조에 의거 단순 하도급 불허',
    rfpPage: 19,
    rfpQuote: '법적 요건: 소프트웨어 진흥법 및 국가계약법 준수, 하도급 승인 절차 엄수'
  },
  {
    id: 8,
    title: '8. 페인포인트',
    categoryName: '페인포인트',
    content: '• 임직원 개별 AI 사용으로 인한 기업 기밀 유출 및 저작권 리스크 상존\n• 사내 방대한 컨설팅 보고서와 교육자료가 사일로화되어 검색 및 재활용에 과도한 시간 소요 (일평균 50분)\n• 단일 LLM에 종속될 경우 비용 급증 및 서비스 장애 발생 시 업무 마비 우려\n• 개발 지식이 없는 일반 현업 직원이 업무용 AI를 직접 만들기 어려움',
    rfpPage: 34,
    rfpQuote: '현행 문제점: 분산된 사내 지식의 검색 비효율, 보안이 담보되지 않은 외부 AI 사용의 위험성'
  },
  {
    id: 9,
    title: '9. 발주사의 기대사항',
    categoryName: '발주사의 기대사항',
    content: '• 도입 첫날부터 KPC 임직원이 즉시 활용할 수 있는 직관적이고 완성도 높은 UI/UX\n• 제안서 및 보고서 작성 소요 시간 50% 이상 단축으로 컨설팅 생산성 획기적 제고\n• 안전하고 규정을 100% 준수하는 Enterprise AI 보안 표준 레퍼런스 확립\n• 전사 임직원의 자발적 AI 활용과 Agent 공유로 이어지는 디지털 혁신 문화 정착',
    rfpPage: 36,
    rfpQuote: '기대 효과: KPC 임직원의 업무 생산성 획기적 향상 및 공공/민간 기업 대상 AI 컨설팅 사업 역량 내재화'
  },
  {
    id: 10,
    title: '10. 잠재적 위험',
    categoryName: '잠재적 위험',
    content: '• HWP/HWPX 복합 서식 및 도표 포함 문서의 RAG 파싱 시 문맥 누락 리스크\n• Multi-LLM API 트래픽 폭증 시 예산 초과(Token Overuse) 및 응답 지연 리스크\n• 사내 레거시 ERP의 API 비표준화로 인한 연동 지연 가능성 (사전 PoC 연계 테스트 필요)',
    rfpPage: 23,
    rfpQuote: '위험 관리: 비정형 문서 파싱 정확도 및 다중 LLM 사용에 따른 비용 관리 방안 사전 수립 필수'
  },
  {
    id: 11,
    title: '11. Win Theme (수주 핵심 설득 테마)',
    categoryName: 'Win Theme',
    content: `① KPC 업무 특성에 최적화된 안전한 Enterprise AI: 제로 데이터 리텐션(ZDR)과 사내 권한 통제로 기밀 유출 완벽 차단\n② 기존 M365 자산을 활용한 빠른 확장성: Teams/Outlook/Word 내 직접 탑재로 별도 학습 없이 즉시 전사 사용\n③ Multi-LLM 기반 비용·성능 최적화: 업무 난이도별 최적 모델 자동 라우팅으로 토큰 비용 40% 절감\n④ KPC 직원이 직접 AI를 만들고 공유하는 Agent 생태계: 노코드 Agent Builder와 검증 거버넌스를 통한 전사 혁신`,
    rfpPage: 31,
    rfpQuote: '제안 전략: 발주기관의 특수성을 고려한 차별화된 제안 테마 및 비교우위 요소를 명확히 제시할 것',
    isWinTheme: true
  }
];

export interface RfpDocOption {
  id: string;
  name: string;
  pages: number;
  category: 'RFP 문서';
  tag: string;
}

export const RFP_ONLY_DOCUMENTS: RfpDocOption[] = [
  {
    id: 'rfp-doc-1',
    name: 'KPC_AI플랫폼_RFP.pdf',
    pages: 86,
    category: 'RFP 문서',
    tag: 'RFP 본문'
  },
  {
    id: 'rfp-doc-2',
    name: 'KPC_AI플랫폼_제안요청서_별첨규격서.pdf',
    pages: 34,
    category: 'RFP 문서',
    tag: '별첨 요구규격'
  },
  {
    id: 'rfp-doc-3',
    name: 'KPC_생성형AI_보안및인프라요건서.pdf',
    pages: 22,
    category: 'RFP 문서',
    tag: '보안/인프라'
  }
];

export const INITIAL_PROPOSAL_OUTLINE: ProposalOutlineItem[] = [
  {
    id: 'out-1',
    code: '1',
    title: '1. 제안 개요',
    level: 1,
    status: '완료',
    author: '정소담',
    reviewer: '김민수',
    deadline: '2026.09.15',
    targetPages: 10,
    targetWords: 3500,
    currentWords: 3480,
    isExpanded: true,
    children: [
      {
        id: 'out-1-1',
        code: '1.1',
        title: '1.1 사업 이해 및 배경',
        level: 2,
        status: '완료',
        author: '정소담',
        reviewer: '김민수',
        deadline: '2026.09.12',
        targetPages: 3,
        targetWords: 1200,
        currentWords: 1250,
        sourceReqId: 'REQ-001',
        sourceText: 'RFP 1.1 사업 배경 및 목적'
      },
      {
        id: 'out-1-2',
        code: '1.2',
        title: '1.2 제안 목적 및 비전',
        level: 2,
        status: '완료',
        author: '정소담',
        reviewer: '김민수',
        deadline: '2026.09.13',
        targetPages: 3,
        targetWords: 1100,
        currentWords: 1120,
        sourceReqId: 'REQ-001'
      },
      {
        id: 'out-1-3',
        code: '1.3',
        title: '1.3 제안의 특징 및 기대효과',
        level: 2,
        status: '완료',
        author: '정소담',
        reviewer: '김민수',
        deadline: '2026.09.15',
        targetPages: 4,
        targetWords: 1200,
        currentWords: 1110,
        sourceReqId: 'REQ-002'
      }
    ]
  },
  {
    id: 'out-2',
    code: '2',
    title: '2. 사업 이해 및 추진 전략',
    level: 1,
    status: '검토 중',
    author: '정소담',
    reviewer: '이서연',
    deadline: '2026.09.20',
    targetPages: 18,
    targetWords: 6000,
    currentWords: 5800,
    isExpanded: true,
    children: [
      {
        id: 'out-2-1',
        code: '2.1',
        title: '2.1 요구사항 분석 및 해결방안',
        level: 2,
        status: '검토 중',
        author: '정소담',
        reviewer: '이서연',
        deadline: '2026.09.18',
        targetPages: 8,
        targetWords: 2800,
        currentWords: 2750,
        sourceReqId: 'REQ-004'
      },
      {
        id: 'out-2-2',
        code: '2.2',
        title: '2.2 추진 방향 및 핵심 성공요인(CSF)',
        level: 2,
        status: '검토 준비',
        author: '정소담',
        reviewer: '이서연',
        deadline: '2026.09.20',
        targetPages: 10,
        targetWords: 3200,
        currentWords: 3050,
        sourceReqId: 'REQ-002'
      }
    ]
  },
  {
    id: 'out-3',
    code: '3',
    title: '3. 수행 방안',
    level: 1,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    deadline: '2026.09.25',
    targetPages: 42,
    targetWords: 15000,
    currentWords: 8400,
    isExpanded: true,
    children: [
      {
        id: 'out-3-1',
        code: '3.1',
        title: '3.1 AI 플랫폼 구축 방안',
        level: 2,
        status: '작성 중',
        author: '정소담',
        reviewer: '김민수',
        deadline: '2026.09.22',
        targetPages: 14,
        targetWords: 5000,
        currentWords: 3200,
        sourceReqId: 'REQ-004',
        sourceText: 'RFP 3.1 AI 플랫폼 아키텍처 및 RAG 구현'
      },
      {
        id: 'out-3-2',
        code: '3.2',
        title: '3.2 사내 데이터 연계 및 벡터화',
        level: 2,
        status: '작성 준비',
        author: '김민수',
        reviewer: '박지훈',
        deadline: '2026.09.23',
        targetPages: 10,
        targetWords: 3500,
        currentWords: 900,
        sourceReqId: 'REQ-004'
      },
      {
        id: 'out-3-3',
        code: '3.3',
        title: '3.3 보안 체계 및 망연계 방안',
        level: 2,
        status: '작성 중',
        author: '김민수',
        reviewer: '정소담',
        deadline: '2026.09.24',
        targetPages: 10,
        targetWords: 3500,
        currentWords: 2400,
        sourceReqId: 'REQ-003'
      },
      {
        id: 'out-3-4',
        code: '3.4',
        title: '3.4 시스템 운영 및 장애 대응 방안',
        level: 2,
        status: '작성 대기',
        author: '이서연',
        reviewer: '최유진',
        deadline: '2026.09.25',
        targetPages: 8,
        targetWords: 3000,
        currentWords: 0,
        sourceReqId: 'REQ-006'
      }
    ]
  },
  {
    id: 'out-4',
    code: '4',
    title: '4. 프로젝트 관리 방안',
    level: 1,
    status: '작성 대기',
    author: '최유진',
    reviewer: '정소담',
    deadline: '2026.09.28',
    targetPages: 12,
    targetWords: 4000,
    currentWords: 0,
    isExpanded: false
  },
  {
    id: 'out-5',
    code: '5',
    title: '5. 수행 조직 및 투입 인력',
    level: 1,
    status: '작성 대기',
    author: '박지훈',
    reviewer: '김민수',
    deadline: '2026.09.29',
    targetPages: 8,
    targetWords: 2500,
    currentWords: 0,
    isExpanded: false
  },
  {
    id: 'out-6',
    code: '6',
    title: '6. 기대 효과 및 지원 방안',
    level: 1,
    status: '작성 대기',
    author: '정소담',
    reviewer: '이서연',
    deadline: '2026.09.30',
    targetPages: 8,
    targetWords: 2500,
    currentWords: 0,
    isExpanded: false
  }
];

export const INITIAL_PROPOSAL_STRUCTURE = INITIAL_PROPOSAL_OUTLINE.map(item => ({
  ...item,
  sectionNumber: item.code,
  pageEstimate: item.targetPages || 6,
  assignee: item.author || '정소담',
  children: item.children?.map(sub => ({
    ...sub,
    sectionNumber: sub.code,
    pageEstimate: sub.targetPages || 4,
    assignee: sub.author || '정소담',
    rfpMappingReqs: ['REQ-001', 'REQ-002']
  }))
}));
