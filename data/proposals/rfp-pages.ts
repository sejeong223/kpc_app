export interface RfpDocumentPage {
  pageNumber: number;
  chapter: string;
  subTitle: string;
  contentLines: {
    type: 'heading' | 'subheading' | 'text' | 'table' | 'bullet' | 'quote';
    text?: string;
    tableData?: { headers: string[]; rows: string[][] };
    isHighlightable?: boolean;
    sectionIdRef?: number | string;
  }[];
}

export const SAMPLE_RFP_DOCUMENT_PAGES: Record<number, RfpDocumentPage> = {
  1: {
    pageNumber: 1,
    chapter: '【표지】 2026년도 국가 디지털 행정 혁신 지원 사업',
    subTitle: '제 안 요 청 서 (R F P)',
    contentLines: [
      { type: 'heading', text: '사업명: 공공기관 생성형 AI 기반 지능형 업무혁신 플랫폼 구축' },
      { type: 'text', text: '공고번호: 제202608-81920-00호' },
      { type: 'text', text: '발주기관: 행정안전부 디지털정부혁신실 / 조달청' },
      { type: 'text', text: '발행일시: 2026년 8월 20일' },
      { type: 'bullet', text: '본 문서는 국가를 당사자로 하는 계약에 관한 법률 제7조에 따른 협상에 의한 계약 제안요청서입니다.' },
      { type: 'bullet', text: '입찰 참가자는 본 제안요청서의 모든 조항 및 규격을 숙지하고 응찰하여야 합니다.' }
    ]
  },
  2: {
    pageNumber: 2,
    chapter: '목 차 (Table of Contents)',
    subTitle: '제안요청서 세부 목차',
    contentLines: [
      { type: 'subheading', text: 'Ⅰ. 사업 개요 및 배경 --------------------------------- p.3' },
      { type: 'subheading', text: 'Ⅱ. 제안 사업의 범위 및 구성 요건 ---------------------- p.5' },
      { type: 'subheading', text: 'Ⅲ. 사업 추진 일정 및 체계 ---------------------------- p.8' },
      { type: 'subheading', text: 'Ⅳ. 입찰 및 계약 일반 조건 ---------------------------- p.9' },
      { type: 'subheading', text: 'Ⅴ. 제안서 작성 요령 및 제출 지침 --------------------- p.12' },
      { type: 'subheading', text: 'Ⅵ. 제안서 평가 기준 및 낙찰자 선정 방식 --------------- p.15' },
      { type: 'subheading', text: 'Ⅶ. 제출 서류 및 계약 법적 준수 요건 ------------------ p.19' },
      { type: 'subheading', text: 'Ⅷ. 과업 세부 기술 규격서 및 행정 전산망 연계 요건 ----- p.23' },
      { type: 'subheading', text: 'Ⅸ. 제안사 설명회(PT) 및 질의응답 지침 ---------------- p.27' },
      { type: 'subheading', text: 'Ⅹ. 특수 계약 조건 및 기대 효과 ----------------------- p.31' }
    ]
  },
  3: {
    pageNumber: 3,
    chapter: '제 1 장. 사업 개요 및 배경 (AI 추출 항목 1 : 사업 요약)',
    subTitle: '1. 사업 기본 정보 및 추진 배경',
    contentLines: [
      { type: 'heading', text: '1.1 사업 개요' },
      {
        type: 'table',
        tableData: {
          headers: ['구분', '세부 내용'],
          rows: [
            ['사 업 명', '공공기관 생성형 AI 업무혁신 플랫폼 구축'],
            ['소요 예산', '금 1,200,000,000원 (일십이억원, 부가가치세 포함)'],
            ['사업 기간', '계약체결일로부터 8개월 이내'],
            ['주요 발주처', '한국산업진흥원 본원 및 4개 권역센터']
          ]
        }
      },
      { type: 'subheading', text: '1.2 추진 배경 및 필요성' },
      {
        type: 'quote',
        text: '사업명: 공공기관 생성형 AI 업무혁신 플랫폼 구축 / 사업기간: 계약체결일로부터 8개월 / 사업예산: 1,200,000,000원',
        isHighlightable: true,
        sectionIdRef: 1
      },
      {
        type: 'text',
        text: '최근 디지털 공공행정 전환이 가속화됨에 따라 공공기관 내부의 정형·비정형 지식 자산이 폭증하고 있으나, 기존 키워드 검색 방식으로는 실무자가 원하는 공공 서식 및 정책 보고서 초안을 적시에 탐색하는 데 막대한 행정력이 낭비되고 있음.'
      },
      {
        type: 'bullet',
        text: '사내 축적된 50만 건 이상의 비정형 문서(규정, 감사지적사례, 기안문서)를 안전하게 학습·검색할 수 있는 공공 특화 온프레미스형 RAG 인프라 구축 시급.'
      },
      {
        type: 'bullet',
        text: '국가정보원 보안 가이드라인을 100% 충족하는 폐쇄망/망분리 환경 전용 생성형 AI 아키텍처 도입 필수.'
      }
    ]
  },
  4: {
    pageNumber: 4,
    chapter: '제 1 장. 사업 개요 및 배경',
    subTitle: '2. 현행 정보화 환경 및 기대효과',
    contentLines: [
      { type: 'heading', text: '1.3 현행 시스템 아키텍처 현황' },
      { type: 'bullet', text: 'ERP 및 전자결재: 온프레미스 기반 행정망 전자문서 결재 시스템 (핸디소프트 전자결재)' },
      { type: 'bullet', text: '포털 및 지식관리: KMS v3.2 운영 중 (일평균 검색 2,400건, 키워드 매칭율 48% 수준)' },
      { type: 'bullet', text: '보안 환경: 업무망-인터넷망 간 물리적 망분리 구축 완료 및 국가정보원 CSAP 권고 적용' }
    ]
  },
  5: {
    pageNumber: 5,
    chapter: '제 2 장. 제안 사업의 범위 및 구성 요건 (AI 추출 항목 2 : 사업 범위)',
    subTitle: '1. 주요 과업 상세 범위',
    contentLines: [
      { type: 'heading', text: '2.1 핵심 과업 구성 및 추진 과제' },
      {
        type: 'quote',
        text: '과업범위: 1. 사내 지식 기반 생성형 AI 플랫폼 아키텍처 수립 2. 업무지원 서비스 5종 개발 3. 망분리 보안체계 구축',
        isHighlightable: true,
        sectionIdRef: 2
      },
      {
        type: 'table',
        tableData: {
          headers: ['과업 영역', '주요 내용', '결과물'],
          rows: [
            ['지식 RAG 파이프라인', '사내 규정, 매뉴얼, 기안문 50만 건 전처리 및 임베딩 벡터화', '벡터 DB 인덱스 및 수집 엔진'],
            ['Multi-LLM 라우팅', '사내 경량 sLLM과 상용 초거대 AI 하이브리드 연동 아키텍처', '지능형 질의 라우터 엔진'],
            ['업무지원 에이전트 5종', '공문서 초안 작성, 법령 질의응답, 요약봇, 경영평가 분석, 코드 검토', '업무포털 임베디드 웹 컴포넌트'],
            ['망분리 보안 인프라', '개인정보 비식별화(DLP), 프롬프트 인젝션 필터링, 국정원 보안성 검토 필증', '보안 게이트웨이 모듈']
          ]
        }
      },
      {
        type: 'text',
        text: '제안사는 상기 4개 과업 영역을 유기적으로 결합하여 최종 사용자가 단일 웹 인터페이스에서 지체 없이 업무를 수행할 수 있도록 엔드투엔드 솔루션을 제안하여야 한다.'
      }
    ]
  },
  8: {
    pageNumber: 8,
    chapter: '제 3 장. 사업 추진 일정 및 체계 (AI 추출 항목 3 : 주요 일정)',
    subTitle: '1. 입찰 추진 일정 및 계약 마일스톤',
    contentLines: [
      { type: 'heading', text: '3.1 입찰 및 계약 일정 계획' },
      {
        type: 'quote',
        text: '제출기한: 2026.10.15 14:00 나라장터 전자접수 / 제안서 설명회: 제안서 접수 후 개별 통보',
        isHighlightable: true,
        sectionIdRef: 3
      },
      {
        type: 'table',
        tableData: {
          headers: ['구분', '일정 (예정)', '장소 및 방식'],
          rows: [
            ['입찰공고 게시', '2026. 08. 20 (목)', '조달청 나라장터(G2B) 및 공공기관 알리오'],
            ['입찰 마감 일시', '2026. 10. 15 (목) 14:00', '조달청 e-발주시스템 온라인 전자 접수'],
            ['제안서 평가(PT)', '2026. 10. 22 (목) 10:00', '정부세종청사 평가회의실 또는 온라인 화상'],
            ['우선협상대상자 선정', '2026. 10. 26 (월)', '개별 유선 통보 및 나라장터 개찰 결과 공고'],
            ['사업 착수 보고회', '2026. 11. 05 (목)', '발주기관 본원 대회의실'],
            ['최종 사업 완료 및 검수', '착수일로부터 8개월 (2027년 7월)', '최종 산출물 검수 완료 보고서 제출']
          ]
        }
      }
    ]
  },
  9: {
    pageNumber: 9,
    chapter: '제 4 장. 입찰 및 계약 일반 조건 (AI 추출 항목 4 : 계약 정보)',
    subTitle: '1. 입찰 참가 자격 및 계약 방식',
    contentLines: [
      { type: 'heading', text: '4.1 계약 체결 방식' },
      {
        type: 'quote',
        text: '계약방법: 협상에 의한 계약 체결기준(기획재정부계약예규) 적용',
        isHighlightable: true,
        sectionIdRef: 4
      },
      { type: 'bullet', text: '계약방법: 제한경쟁입찰(협상에 의한 계약, 국가를 당사자로 하는 계약에 관한 법률 시행령 제43조)' },
      { type: 'bullet', text: '낙찰자 결정: 기술평가점수(90점)와 가격평가점수(10점)를 합산하여 고득점순 협상' },
      { type: 'bullet', text: '공동수급(공동이행방식): 허용 (대표사 지분율 50% 이상 필수, 구성원은 3개사 이내로 한함)' },
      { type: 'bullet', text: '하도급 제한: 소프트웨어진흥법 제51조에 의거하여 단순 재하도급은 원칙적으로 불허함' }
    ]
  },
  12: {
    pageNumber: 12,
    chapter: '제 5 장. 제안서 작성 요령 및 지침 (AI 추출 항목 5 : 작성 지침)',
    subTitle: '1. 제안서 규격 및 제출 지침',
    contentLines: [
      { type: 'heading', text: '5.1 제안서 작성 규격' },
      {
        type: 'quote',
        text: '제안서 분량은 증빙자료를 제외한 본문 기준 100페이지 이내로 작성하여 PDF 파일로 제출하여야 함.',
        isHighlightable: true,
        sectionIdRef: 5
      },
      { type: 'bullet', text: '용지 규격: A4 종방향(세로) 작성을 원칙으로 하되, 복잡한 아키텍처 구성도는 횡방향(가로) 허용' },
      { type: 'bullet', text: '분량 한도: 본문은 100페이지 이내(별첨 및 증빙자료 제외), 요약본은 30페이지 이내 엄수' },
      { type: 'bullet', text: '작성 원칙: 명확한 용어를 사용하여 제안하며, "~할 수도 있다", "~를 고려한다" 등 모호한 표현은 불가능으로 간주' }
    ]
  },
  15: {
    pageNumber: 15,
    chapter: '제 6 장. 제안서 평가 기준 및 낙찰자 선정 (AI 추출 항목 6 : 평가 기준)',
    subTitle: '1. 배점 한도 및 세부 평가표',
    contentLines: [
      { type: 'heading', text: '6.1 기술능력 및 입찰가격 평가 배점 한도' },
      {
        type: 'quote',
        text: '기술능력평가 배점한도: 정량적 평가분야 20점, 정성적 평가분야 70점, 가격평가 10점 총 100점 만점',
        isHighlightable: true,
        sectionIdRef: 6
      },
      {
        type: 'table',
        tableData: {
          headers: ['평가 부문', '배점', '세부 평가 항목'],
          rows: [
            ['정량 평가 (담당부서)', '20점', '경영상태(5점), 유사분야 수행실적(10점), 투입인력 자격 및 기술등급(5점)'],
            ['정성 평가 (평가위원회)', '70점', '전략 및 방법론(20점), 기능/기술 요구사항 부합도(25점), 성능/품질(15점), 프로젝트 관리/지원(10점)'],
            ['입찰가격 평가 (조달청)', '10점', '기획재정부 계약예규 협상에 의한 계약 체결 기준 평점산식']
          ]
        }
      }
    ]
  },
  19: {
    pageNumber: 19,
    chapter: '제 7 장. 제출 서류 및 법적 준수 요건 (AI 추출 항목 7 : 제출 서류)',
    subTitle: '1. 필수 제출 서류 목록',
    contentLines: [
      { type: 'heading', text: '7.1 입찰 참가 신청 시 제출 목록' },
      {
        type: 'quote',
        text: '제출서류 목록: 제안서 1부(평가본 1부), 제안요약서 1부, 기타 제안서 관련 증빙서류 일체',
        isHighlightable: true,
        sectionIdRef: 7
      },
      { type: 'bullet', text: '입찰참가신청서 및 입찰보증금 납부 확인서(전자증빙)' },
      { type: 'bullet', text: '제안서(정량/정성) 및 제안요약서 PDF 각 1부 (평가본은 기업 식별 정보 삭제 블라인드 처리)' },
      { type: 'bullet', text: '소프트웨어사업자 일반 현황 관리확인서 및 최근 3년간 결산 재무제표 1부' },
      { type: 'bullet', text: '청렴계약이행서약서, 개인정보보호 서약서, 보안서약서 각 1부' }
    ]
  },
  23: {
    pageNumber: 23,
    chapter: '제 8 장. 과업 세부 기술 규격서 (AI 추출 항목 8 : 누락 정보 및 잠재 리스크)',
    subTitle: '1. 시스템 환경 및 기술 제약 사항',
    contentLines: [
      { type: 'heading', text: '8.1 인프라 인터페이스 규격' },
      {
        type: 'quote',
        text: '기존 행정망 서버실 공간 및 네트워크 스위치 포트 수용 능력은 협상 대상자와 별도 협의함.',
        isHighlightable: true,
        sectionIdRef: 8
      },
      { type: 'text', text: '발주기관은 온프레미스 서버실 내 GPU 랙 마운트 공간 및 전력 소모 한도에 대해 구체적인 수치를 본 RFP에 기재하지 않았으므로, 협상 단계에서 정밀 실사가 필요함.' },
      { type: 'bullet', text: '기관 보유 전자문서(HWP/HWPX)의 복잡한 표/문단 구조에 대한 추출 정확도 기준 미비' },
      { type: 'bullet', text: '사내 망분리 보안 게이트웨이(DLP 솔루션)와의 실시간 API 연동 규격 사전 협의 요구됨' }
    ]
  },
  27: {
    pageNumber: 27,
    chapter: '제 9 장. 제안서 설명회(PT) 지침 (AI 추출 항목 9 : 예상 질의)',
    subTitle: '1. 발표 평가 요령 및 질의응답',
    contentLines: [
      { type: 'heading', text: '9.1 발표 평가 운영 기준' },
      {
        type: 'quote',
        text: '제안서 설명회 평가위원 질의응답: 질의 15분, 답변 15분 총 30분 진행',
        isHighlightable: true,
        sectionIdRef: 9
      },
      { type: 'bullet', text: '발표자: 본 사업의 총괄 프로젝트 관리자(PM)가 직접 구두 발표하여야 함' },
      { type: 'bullet', text: '평가위원 주 질의 예상 사항: 망분리 환경 보안 대책, 생성형 AI의 허위정보(환각) 억제 방안, 실제 행정업무 적용 시나리오 실증 방안' }
    ]
  },
  31: {
    pageNumber: 31,
    chapter: '제 10 장. 제안사 우대 및 차별화 요건 (AI 추출 항목 10 : 차별화 포인트)',
    subTitle: '1. 정성 제안 시 권장 차별화 항목',
    contentLines: [
      { type: 'heading', text: '10.1 특화 제안 사항' },
      {
        type: 'quote',
        text: '제안사는 타 사업자와 차별화되는 고유의 수행 방법론 및 기술적 장점을 명확히 기술할 것.',
        isHighlightable: true,
        sectionIdRef: 10
      },
      { type: 'bullet', text: '행정 문서 특화 파인튜닝 모델 보유 여부 및 공공 도메인 벤치마크 평가 결과 제시 권장' },
      { type: 'bullet', text: '구축 완료 후 기관 공무원의 AI 활용 역량 내재화를 위한 단계별 교육·컨설팅 프로그램 제시 우대' }
    ]
  },
  34: {
    pageNumber: 34,
    chapter: '제 11 장. 사용자 요구 및 고충 배경 (AI 추출 항목 11 : 고객 Pain Point)',
    subTitle: '1. 현업 실무자 의견 수렴 결과',
    contentLines: [
      { type: 'heading', text: '11.1 현장 실무 고충 사항' },
      {
        type: 'quote',
        text: '도입 배경: 내부 규정 및 과거 기안문서에 대한 비효율적 검색으로 인한 중복 작업 최소화',
        isHighlightable: true,
        sectionIdRef: 11
      },
      { type: 'bullet', text: '국정감사 및 경영평가 수검 시 과거 3~5개년 데이터 취합에 실무 인력 대거 투입' },
      { type: 'bullet', text: '순환 보직 공무원의 담당 업무 조기 적응을 위한 사규 및 처리 지침 대화형 챗봇 요구 극대화' }
    ]
  },
  36: {
    pageNumber: 36,
    chapter: '제 12 장. 종합 추진 전략 가이드 (AI 추출 항목 12 : 수주 핵심 전략)',
    subTitle: '1. 발주기관 종합 추진 지침',
    contentLines: [
      { type: 'heading', text: '12.1 종합 추진 목표' },
      {
        type: 'quote',
        text: '종합 추진전략: 공공기관 업무 환경에 적합한 실용성과 보안성을 겸비한 전략 제시 필수',
        isHighlightable: true,
        sectionIdRef: 12
      },
      { type: 'bullet', text: '신뢰성: 공공 행정 시스템 구축 경험이 풍부한 전문 인력 전담 배치' },
      { type: 'bullet', text: '안정성: 오픈소스 모델의 무분별한 사용을 지양하고 엔터프라이즈 검증 모델 적용' },
      { type: 'bullet', text: '지속성: 사업 종료 후 자체 운영 및 사내 지식 증분 학습이 가능한 체계 전수' }
    ]
  }
};
