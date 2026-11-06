import type { ManufacturingPrompt } from '@/types/workspace-production';

export const MFG_DEMO_PROJECT_ID = 'production-html-mfg-demo';
export const MFG_DEMO_REVISION = 'mfg-v13-1';
export const MFG_DEMO_PROJECT_NAME = '제조업 특화 산업 데이터 연계 AI 자율공정 PoC 구축';
export const MFG_DEMO_ORGANIZATION = '한국스마트제조혁신추진단';
export type ManufacturingSectionId = 's11' | 's21' | 's31' | 's32' | 's33' | 's41';
export type ManufacturingLayout = 'cards' | 'process' | 'kpi' | 'table';
export interface ManufacturingSlideSeed {
  id: string; sectionId: ManufacturingSectionId; title: string; lead: string;
  layout: ManufacturingLayout; items: readonly (readonly [string, string])[];
}
export interface ManufacturingFileSeed {
  id: string; round: 1; name: string; type: string; priority: string; sizeLabel: string;
  by: string; at: string; category: 'proposal' | 'related'; main: boolean;
}
// v13 최종 mfg 리터럴. 원본 스크립트는 실행하지 않고 데이터만 옮겼다.
export const MFG_DEMO_CHAPTERS = [
  {
    "id": "c1",
    "title": "사업 이해"
  },
  {
    "id": "c2",
    "title": "추진 전략"
  },
  {
    "id": "c3",
    "title": "기술 부문"
  },
  {
    "id": "c4",
    "title": "사업 관리"
  }
] as const;
export const MFG_DEMO_SECTIONS = [
  {
    "id": "s11",
    "chapterId": "c1",
    "title": "사업 배경 및 목표",
    "assignee": "이서연",
    "state": "done"
  },
  {
    "id": "s21",
    "chapterId": "c2",
    "title": "PoC 추진 전략",
    "assignee": "이서연",
    "state": "done"
  },
  {
    "id": "s31",
    "chapterId": "c3",
    "title": "공정 데이터 연계 체계",
    "assignee": "정소담",
    "state": "writing"
  },
  {
    "id": "s32",
    "chapterId": "c3",
    "title": "AI 자율공정 제어 모델",
    "assignee": "김민수",
    "state": "writing"
  },
  {
    "id": "s33",
    "chapterId": "c3",
    "title": "현장 실증 및 검증",
    "assignee": "정소담",
    "state": "writing"
  },
  {
    "id": "s41",
    "chapterId": "c4",
    "title": "추진 일정 및 WBS",
    "assignee": "이서연",
    "state": "writing"
  }
] as const;
export const MFG_DEMO_SLIDES: readonly ManufacturingSlideSeed[] = [
  {
    "id": "mfg-s11-1",
    "sectionId": "s11",
    "title": "사업 추진 배경",
    "lead": "제조 현장의 숙련 인력 감소와 품질 편차가 생산성 저하의 핵심 원인입니다",
    "layout": "cards",
    "items": [
      [
        "인력 구조",
        "숙련공 고령화로 공정 노하우 단절 위험 확대"
      ],
      [
        "품질 편차",
        "작업자별 설정값 차이로 불량률 3~5% 변동"
      ],
      [
        "데이터 활용",
        "설비 데이터 수집은 늘었으나 분석 · 제어 연계 부족"
      ]
    ]
  },
  {
    "id": "mfg-s11-2",
    "sectionId": "s11",
    "title": "현황 및 문제점",
    "lead": "참여기업 3사의 공정 데이터는 설비별로 흩어져 있어 실시간 활용이 어렵습니다",
    "layout": "table",
    "items": [
      [
        "데이터 수집",
        "PLC · MES · 검사장비 데이터가 서로 다른 형식으로 저장"
      ],
      [
        "공정 제어",
        "설정값 변경이 작업자 경험에 의존"
      ],
      [
        "품질 관리",
        "불량 발생 후 사후 분석 중심"
      ]
    ]
  },
  {
    "id": "mfg-s11-3",
    "sectionId": "s11",
    "title": "사업 목표",
    "lead": "데이터 연계부터 AI 제어 · 실증까지 하나의 PoC로 검증합니다",
    "layout": "process",
    "items": [
      [
        "연계",
        "3사 공정 데이터를 표준 플랫폼으로 수집"
      ],
      [
        "학습",
        "공정 조건 · 품질 상관관계 AI 모델 학습"
      ],
      [
        "제어",
        "최적 설정값 자동 추천 및 반자율 제어"
      ]
    ]
  },
  {
    "id": "mfg-s11-4",
    "sectionId": "s11",
    "title": "기대 효과",
    "lead": "불량률과 에너지 사용량을 함께 낮추는 것을 목표로 합니다",
    "layout": "kpi",
    "items": [
      [
        "20%",
        "공정 불량률 감소 목표"
      ],
      [
        "15%",
        "에너지 사용량 절감 목표"
      ],
      [
        "3사",
        "실증 참여 제조기업"
      ]
    ]
  },
  {
    "id": "mfg-s11-5",
    "sectionId": "s11",
    "title": "RFP 핵심 요구 분석",
    "lead": "데이터 표준 준수와 현장 실증 결과가 평가의 핵심입니다",
    "layout": "table",
    "items": [
      [
        "SFR-001~008",
        "공정 데이터 수집 · 정제 · 저장 기능"
      ],
      [
        "SFR-009~014",
        "AI 모델 학습 · 추론 · 제어 연계"
      ],
      [
        "PMR-001~004",
        "실증 계획 · 성과 측정 · 확산 방안"
      ]
    ]
  },
  {
    "id": "mfg-s11-6",
    "sectionId": "s11",
    "title": "사업 범위",
    "lead": "플랫폼 구축 · 모델 개발 · 현장 실증 3개 영역으로 구성됩니다",
    "layout": "cards",
    "items": [
      [
        "플랫폼",
        "공정 데이터 연계 플랫폼 구축"
      ],
      [
        "모델",
        "품질 예측 · 설정값 최적화 모델 개발"
      ],
      [
        "실증",
        "3사 현장 적용 및 효과 검증"
      ]
    ]
  },
  {
    "id": "mfg-s11-7",
    "sectionId": "s11",
    "title": "정책 연계",
    "lead": "제조 AI 전환 정책과 스마트공장 고도화 사업 방향에 부합합니다",
    "layout": "cards",
    "items": [
      [
        "제조 AI 전환",
        "산업 AI 내재화 전략 핵심 과제"
      ],
      [
        "스마트공장",
        "고도화 단계 기업 대상 AI 적용 확산"
      ],
      [
        "표준화",
        "제조 데이터 표준 기반 확산 모델 제시"
      ]
    ]
  },
  {
    "id": "mfg-s11-8",
    "sectionId": "s11",
    "title": "사업 배경 및 목표 요약",
    "lead": "제조 현장의 숙련 인력 감소와 품질 편차가 생산성 저하의 핵심 원인입니다",
    "layout": "cards",
    "items": [
      [
        "사업 추진 배경",
        "숙련공 고령화로 공정 노하우 단절 위험 확대"
      ],
      [
        "현황 및 문제점",
        "PLC · MES · 검사장비 데이터가 서로 다른 형식으로 저장"
      ],
      [
        "사업 목표",
        "3사 공정 데이터를 표준 플랫폼으로 수집"
      ]
    ]
  },
  {
    "id": "mfg-s21-1",
    "sectionId": "s21",
    "title": "추진 전략 개요",
    "lead": "표준 기반 · 단계적 확대 · 현장 중심의 3대 전략으로 추진합니다",
    "layout": "cards",
    "items": [
      [
        "표준 기반",
        "KS X 9101 데이터 모델로 확장성 확보"
      ],
      [
        "단계적 확대",
        "1개 라인 실증 후 3사 전체로 확대"
      ],
      [
        "현장 중심",
        "작업자 참여형 모델 검증"
      ]
    ]
  },
  {
    "id": "mfg-s21-2",
    "sectionId": "s21",
    "title": "단계별 추진 로드맵",
    "lead": "진단 → 구축 → 실증 → 확산 4단계로 진행합니다",
    "layout": "process",
    "items": [
      [
        "진단",
        "3사 공정 · 데이터 현황 분석"
      ],
      [
        "구축",
        "연계 플랫폼 · AI 모델 개발"
      ],
      [
        "실증",
        "라인 적용 및 성과 측정"
      ]
    ]
  },
  {
    "id": "mfg-s21-3",
    "sectionId": "s21",
    "title": "추진 체계",
    "lead": "발주기관 · 수행사 · 참여기업이 함께하는 실증 협의체를 운영합니다",
    "layout": "table",
    "items": [
      [
        "발주기관",
        "사업 총괄 · 성과 점검"
      ],
      [
        "KPC",
        "플랫폼 구축 · AI 모델 · 실증 운영"
      ],
      [
        "참여기업 3사",
        "현장 데이터 제공 · 실증 참여"
      ]
    ]
  },
  {
    "id": "mfg-s21-4",
    "sectionId": "s21",
    "title": "차별화 전략",
    "lead": "공정 컨설팅과 AI 기술을 결합한 실행 중심 PoC를 제시합니다",
    "layout": "cards",
    "items": [
      [
        "공정 진단 역량",
        "생산성 컨설팅 기반 병목 공정 선정"
      ],
      [
        "AI 기술",
        "품질 예측 모델 실증 경험 보유"
      ],
      [
        "확산 모델",
        "업종별 적용 가이드 제공"
      ]
    ]
  },
  {
    "id": "mfg-s21-5",
    "sectionId": "s21",
    "title": "핵심 성과지표",
    "lead": "정량 지표로 PoC 효과를 객관적으로 검증합니다",
    "layout": "kpi",
    "items": [
      [
        "20%",
        "불량률 감소"
      ],
      [
        "15%",
        "에너지 절감"
      ],
      [
        "90%",
        "설정값 추천 채택률 목표"
      ]
    ]
  },
  {
    "id": "mfg-s21-6",
    "sectionId": "s21",
    "title": "리스크 관리 방안",
    "lead": "데이터 품질과 현장 수용성 리스크를 사전에 관리합니다",
    "layout": "table",
    "items": [
      [
        "데이터 품질",
        "수집 초기 2주간 정합성 점검"
      ],
      [
        "현장 수용성",
        "작업자 교육 및 피드백 반영"
      ],
      [
        "일정 지연",
        "라인 가동 일정 사전 협의"
      ]
    ]
  },
  {
    "id": "mfg-s21-7",
    "sectionId": "s21",
    "title": "확산 전략",
    "lead": "실증 결과를 업종별 표준 모델로 정리해 확산합니다",
    "layout": "process",
    "items": [
      [
        "정리",
        "실증 결과 · 모델 문서화"
      ],
      [
        "표준화",
        "업종별 적용 가이드 작성"
      ],
      [
        "확산",
        "유사 업종 기업 대상 설명회"
      ]
    ]
  },
  {
    "id": "mfg-s21-8",
    "sectionId": "s21",
    "title": "PoC 추진 전략 요약",
    "lead": "표준 기반 · 단계적 확대 · 현장 중심의 3대 전략으로 추진합니다",
    "layout": "cards",
    "items": [
      [
        "추진 전략 개요",
        "KS X 9101 데이터 모델로 확장성 확보"
      ],
      [
        "단계별 추진 로드맵",
        "3사 공정 · 데이터 현황 분석"
      ],
      [
        "추진 체계",
        "사업 총괄 · 성과 점검"
      ]
    ]
  },
  {
    "id": "mfg-s31-1",
    "sectionId": "s31",
    "title": "데이터 연계 체계 개요",
    "lead": "설비 · 시스템 · 검사 데이터를 하나의 플랫폼으로 연계합니다",
    "layout": "process",
    "items": [
      [
        "수집",
        "PLC · MES · 검사장비 데이터 수집"
      ],
      [
        "정제",
        "결측 · 이상치 처리 및 표준화"
      ],
      [
        "저장",
        "시계열 DB 기반 통합 저장"
      ]
    ]
  },
  {
    "id": "mfg-s31-2",
    "sectionId": "s31",
    "title": "연계 대상 데이터",
    "lead": "3사 공정에서 12종의 핵심 데이터를 연계합니다",
    "layout": "table",
    "items": [
      [
        "설비 데이터",
        "온도 · 압력 · 속도 등 공정 조건 8종"
      ],
      [
        "품질 데이터",
        "검사 결과 · 불량 유형 3종"
      ],
      [
        "운영 데이터",
        "작업 지시 · 생산 실적"
      ]
    ]
  },
  {
    "id": "mfg-s31-3",
    "sectionId": "s31",
    "title": "데이터 표준 모델",
    "lead": "KS X 9101 기반 공통 데이터 모델을 적용합니다",
    "layout": "cards",
    "items": [
      [
        "공통 모델",
        "설비 · 공정 · 품질 엔터티 정의"
      ],
      [
        "메타데이터",
        "태그 명명 규칙 표준화"
      ],
      [
        "확장성",
        "신규 설비 추가 시 설정만으로 연계"
      ]
    ]
  },
  {
    "id": "mfg-s31-4",
    "sectionId": "s31",
    "title": "수집 아키텍처",
    "lead": "엣지 게이트웨이로 현장 데이터를 안전하게 수집합니다",
    "layout": "process",
    "items": [
      [
        "엣지",
        "현장 게이트웨이에서 1초 주기 수집"
      ],
      [
        "전송",
        "암호화 구간으로 플랫폼 전송"
      ],
      [
        "저장",
        "시계열 DB · 데이터 레이크 이중 저장"
      ]
    ]
  },
  {
    "id": "mfg-s31-5",
    "sectionId": "s31",
    "title": "데이터 품질 관리",
    "lead": "수집 단계부터 품질을 자동 점검합니다",
    "layout": "table",
    "items": [
      [
        "정합성",
        "센서 범위 · 단위 자동 검증"
      ],
      [
        "완전성",
        "결측 구간 탐지 및 보정"
      ],
      [
        "적시성",
        "수집 지연 실시간 모니터링"
      ]
    ]
  },
  {
    "id": "mfg-s31-6",
    "sectionId": "s31",
    "title": "연계 성능 목표",
    "lead": "실시간 제어를 위한 수집 · 처리 성능을 확보합니다",
    "layout": "kpi",
    "items": [
      [
        "1초",
        "데이터 수집 주기"
      ],
      [
        "99.5%",
        "수집 성공률 목표"
      ],
      [
        "12종",
        "연계 데이터 유형"
      ]
    ]
  },
  {
    "id": "mfg-s31-7",
    "sectionId": "s31",
    "title": "데이터 보안",
    "lead": "공정 데이터 외부 유출을 막는 보안 체계를 적용합니다",
    "layout": "cards",
    "items": [
      [
        "접근 통제",
        "역할 기반 권한 관리"
      ],
      [
        "암호화",
        "전송 · 저장 구간 암호화"
      ],
      [
        "감사 로그",
        "데이터 조회 이력 1년 보관"
      ]
    ]
  },
  {
    "id": "mfg-s31-8",
    "sectionId": "s31",
    "title": "공정 데이터 연계 체계 요약",
    "lead": "설비 · 시스템 · 검사 데이터를 하나의 플랫폼으로 연계합니다",
    "layout": "cards",
    "items": [
      [
        "데이터 연계 체계 개요",
        "PLC · MES · 검사장비 데이터 수집"
      ],
      [
        "연계 대상 데이터",
        "온도 · 압력 · 속도 등 공정 조건 8종"
      ],
      [
        "데이터 표준 모델",
        "설비 · 공정 · 품질 엔터티 정의"
      ]
    ]
  },
  {
    "id": "mfg-s32-1",
    "sectionId": "s32",
    "title": "AI 모델 개요",
    "lead": "품질 예측과 설정값 최적화 두 가지 모델을 개발합니다",
    "layout": "cards",
    "items": [
      [
        "품질 예측",
        "공정 조건으로 불량 발생 확률 예측"
      ],
      [
        "설정값 최적화",
        "목표 품질을 위한 최적 조건 추천"
      ],
      [
        "이상 감지",
        "설비 이상 징후 조기 탐지"
      ]
    ]
  },
  {
    "id": "mfg-s32-2",
    "sectionId": "s32",
    "title": "모델 개발 절차",
    "lead": "데이터 분석부터 현장 배포까지 단계별로 검증합니다",
    "layout": "process",
    "items": [
      [
        "분석",
        "공정 변수 · 품질 상관관계 분석"
      ],
      [
        "학습",
        "예측 · 최적화 모델 학습"
      ],
      [
        "배포",
        "현장 엣지 환경 배포"
      ]
    ]
  },
  {
    "id": "mfg-s32-3",
    "sectionId": "s32",
    "title": "품질 예측 모델",
    "lead": "공정 조건 변화에 따른 불량 가능성을 실시간으로 예측합니다",
    "layout": "table",
    "items": [
      [
        "입력",
        "온도 · 압력 · 속도 등 8개 공정 변수"
      ],
      [
        "출력",
        "불량 확률 및 주요 원인 변수"
      ],
      [
        "목표",
        "예측 정확도 90% 이상"
      ]
    ]
  },
  {
    "id": "mfg-s32-4",
    "sectionId": "s32",
    "title": "설정값 최적화",
    "lead": "목표 품질을 만족하는 공정 조건을 자동으로 추천합니다",
    "layout": "cards",
    "items": [
      [
        "최적화 기법",
        "베이지안 최적화 기반 탐색"
      ],
      [
        "제약 조건",
        "설비 허용 범위 내 추천"
      ],
      [
        "설명 가능성",
        "추천 근거 변수 함께 제시"
      ]
    ]
  },
  {
    "id": "mfg-s32-5",
    "sectionId": "s32",
    "title": "반자율 제어 연계",
    "lead": "작업자 승인 후 설정값이 적용되는 반자율 방식으로 운영합니다",
    "layout": "process",
    "items": [
      [
        "추천",
        "AI가 최적 설정값 제시"
      ],
      [
        "승인",
        "작업자 확인 및 승인"
      ],
      [
        "적용",
        "PLC 설정값 자동 반영"
      ]
    ]
  },
  {
    "id": "mfg-s32-6",
    "sectionId": "s32",
    "title": "모델 성능 목표",
    "lead": "현장 적용 가능한 수준의 성능을 목표로 합니다",
    "layout": "kpi",
    "items": [
      [
        "90%",
        "불량 예측 정확도"
      ],
      [
        "1초",
        "추론 응답 시간"
      ],
      [
        "월 1회",
        "모델 재학습 주기"
      ]
    ]
  },
  {
    "id": "mfg-s32-7",
    "sectionId": "s32",
    "title": "모델 운영 관리",
    "lead": "성능 저하를 감지해 재학습하는 MLOps 체계를 갖춥니다",
    "layout": "table",
    "items": [
      [
        "모니터링",
        "예측 정확도 일 단위 추적"
      ],
      [
        "재학습",
        "성능 저하 시 자동 재학습"
      ],
      [
        "버전 관리",
        "모델 이력 · 롤백 지원"
      ]
    ]
  },
  {
    "id": "mfg-s32-8",
    "sectionId": "s32",
    "title": "AI 자율공정 제어 모델 요약",
    "lead": "품질 예측과 설정값 최적화 두 가지 모델을 개발합니다",
    "layout": "cards",
    "items": [
      [
        "AI 모델 개요",
        "공정 조건으로 불량 발생 확률 예측"
      ],
      [
        "모델 개발 절차",
        "공정 변수 · 품질 상관관계 분석"
      ],
      [
        "품질 예측 모델",
        "온도 · 압력 · 속도 등 8개 공정 변수"
      ]
    ]
  },
  {
    "id": "mfg-s33-1",
    "sectionId": "s33",
    "title": "실증 계획 개요",
    "lead": "3사 핵심 라인에서 단계적으로 실증합니다",
    "layout": "process",
    "items": [
      [
        "1단계",
        "A사 사출 라인 실증"
      ],
      [
        "2단계",
        "B사 · C사 라인 확대"
      ],
      [
        "3단계",
        "성과 분석 및 개선"
      ]
    ]
  },
  {
    "id": "mfg-s33-2",
    "sectionId": "s33",
    "title": "실증 대상 공정",
    "lead": "불량률이 높고 데이터 확보가 쉬운 공정을 우선 선정합니다",
    "layout": "table",
    "items": [
      [
        "A사",
        "사출 성형 공정 (불량률 4.2%)"
      ],
      [
        "B사",
        "도장 공정 (불량률 3.6%)"
      ],
      [
        "C사",
        "가공 공정 (불량률 3.1%)"
      ]
    ]
  },
  {
    "id": "mfg-s33-3",
    "sectionId": "s33",
    "title": "성과 측정 방법",
    "lead": "실증 전후 동일 기간을 비교해 효과를 검증합니다",
    "layout": "cards",
    "items": [
      [
        "비교 기간",
        "실증 전후 각 4주"
      ],
      [
        "측정 지표",
        "불량률 · 에너지 · 생산량"
      ],
      [
        "검증 주체",
        "발주기관 · 외부 전문가 공동 검증"
      ]
    ]
  },
  {
    "id": "mfg-s33-4",
    "sectionId": "s33",
    "title": "현장 운영 체계",
    "lead": "작업자 교육과 현장 지원 인력을 함께 운영합니다",
    "layout": "cards",
    "items": [
      [
        "교육",
        "작업자 대상 사용 교육 2회"
      ],
      [
        "현장 지원",
        "실증 기간 상주 엔지니어 배치"
      ],
      [
        "피드백",
        "주간 현장 협의회 운영"
      ]
    ]
  },
  {
    "id": "mfg-s33-5",
    "sectionId": "s33",
    "title": "실증 성과 목표",
    "lead": "정량 성과를 실증 보고서로 제시합니다",
    "layout": "kpi",
    "items": [
      [
        "20%",
        "불량률 감소"
      ],
      [
        "15%",
        "에너지 절감"
      ],
      [
        "3건",
        "업종별 적용 사례"
      ]
    ]
  },
  {
    "id": "mfg-s33-6",
    "sectionId": "s33",
    "title": "실증 결과 보고",
    "lead": "실증 결과를 표준 보고서와 적용 가이드로 정리합니다",
    "layout": "process",
    "items": [
      [
        "분석",
        "공정별 효과 분석"
      ],
      [
        "보고",
        "실증 결과 보고서 작성"
      ],
      [
        "가이드",
        "업종별 적용 가이드 제공"
      ]
    ]
  },
  {
    "id": "mfg-s33-7",
    "sectionId": "s33",
    "title": "현장 실증 및 검증 요약",
    "lead": "3사 핵심 라인에서 단계적으로 실증합니다",
    "layout": "cards",
    "items": [
      [
        "실증 계획 개요",
        "A사 사출 라인 실증"
      ],
      [
        "실증 대상 공정",
        "사출 성형 공정 (불량률 4.2%)"
      ],
      [
        "성과 측정 방법",
        "실증 전후 각 4주"
      ]
    ]
  },
  {
    "id": "mfg-s41-1",
    "sectionId": "s41",
    "title": "추진 일정 총괄",
    "lead": "8개월 동안 4단계로 수행합니다",
    "layout": "process",
    "items": [
      [
        "진단 · 설계 (2개월)",
        "현황 분석 · 플랫폼 설계"
      ],
      [
        "구축 · 개발 (3개월)",
        "연계 플랫폼 · AI 모델"
      ],
      [
        "실증 · 확산 (3개월)",
        "현장 실증 · 결과 보고"
      ]
    ]
  },
  {
    "id": "mfg-s41-2",
    "sectionId": "s41",
    "title": "WBS 상세",
    "lead": "단계별 산출물과 검토 시점을 명확히 정의합니다",
    "layout": "table",
    "items": [
      [
        "진단 · 설계",
        "착수계, 현황 분석서, 설계서"
      ],
      [
        "구축 · 개발",
        "플랫폼 · 모델 개발 결과서"
      ],
      [
        "실증 · 확산",
        "실증 결과 보고서, 적용 가이드"
      ]
    ]
  },
  {
    "id": "mfg-s41-3",
    "sectionId": "s41",
    "title": "투입 인력 계획",
    "lead": "단계별 핵심 인력을 집중 투입합니다",
    "layout": "table",
    "items": [
      [
        "PM",
        "이서연 (생산성 컨설팅 15년)"
      ],
      [
        "데이터 엔지니어",
        "2명 (제조 데이터 연계)"
      ],
      [
        "AI 엔지니어",
        "2명 (품질 예측 모델)"
      ]
    ]
  },
  {
    "id": "mfg-s41-4",
    "sectionId": "s41",
    "title": "품질 관리 계획",
    "lead": "단계별 품질 검토로 산출물 품질을 보장합니다",
    "layout": "cards",
    "items": [
      [
        "단계 검토",
        "단계 종료 시 품질 검토 회의"
      ],
      [
        "테스트",
        "기능 · 성능 · 보안 테스트"
      ],
      [
        "외부 검증",
        "실증 결과 외부 전문가 검토"
      ]
    ]
  },
  {
    "id": "mfg-s41-5",
    "sectionId": "s41",
    "title": "보고 체계",
    "lead": "정기 보고와 수시 보고로 진행 상황을 공유합니다",
    "layout": "table",
    "items": [
      [
        "주간 보고",
        "진척 · 이슈 공유"
      ],
      [
        "월간 보고",
        "성과 · 리스크 점검"
      ],
      [
        "단계 보고",
        "단계 종료 시 결과 보고"
      ]
    ]
  },
  {
    "id": "mfg-s41-6",
    "sectionId": "s41",
    "title": "사업 관리 지표",
    "lead": "일정 · 품질 · 성과를 정량 지표로 관리합니다",
    "layout": "kpi",
    "items": [
      [
        "100%",
        "일정 준수 목표"
      ],
      [
        "0건",
        "중대 결함 목표"
      ],
      [
        "4회",
        "단계별 보고"
      ]
    ]
  },
  {
    "id": "mfg-s41-7",
    "sectionId": "s41",
    "title": "추진 일정 및 WBS 요약",
    "lead": "8개월 동안 4단계로 수행합니다",
    "layout": "cards",
    "items": [
      [
        "추진 일정 총괄",
        "현황 분석 · 플랫폼 설계"
      ],
      [
        "WBS 상세",
        "착수계, 현황 분석서, 설계서"
      ],
      [
        "투입 인력 계획",
        "이서연 (생산성 컨설팅 15년)"
      ]
    ]
  }
];
export const MFG_DEMO_FILES: readonly ManufacturingFileSeed[] = [
  {
    "id": "mfgf1",
    "round": 1,
    "name": "제조 AI 자율공정 PoC 제안요청서.pdf",
    "type": "RFP (공고문)",
    "priority": "필수 참조",
    "sizeLabel": "4.2 MB",
    "by": "정소담",
    "at": "2026.10.12",
    "category": "proposal",
    "main": true
  },
  {
    "id": "mfgf2",
    "round": 1,
    "name": "스마트공장 데이터 표준(KS X 9101) 요약.pdf",
    "type": "기술자료",
    "priority": "우선 참조",
    "sizeLabel": "1.8 MB",
    "by": "정소담",
    "at": "2026.10.13",
    "category": "related",
    "main": false
  },
  {
    "id": "mfgf3",
    "round": 1,
    "name": "참여기업 3사 공정 현황 조사표.xlsx",
    "type": "고객 제공자료",
    "priority": "우선 참조",
    "sizeLabel": "0.6 MB",
    "by": "정소담",
    "at": "2026.10.14",
    "category": "proposal",
    "main": false
  },
  {
    "id": "mfgf4",
    "round": 1,
    "name": "제조 AI 실증 수행사례 정리.docx",
    "type": "수행 사례",
    "priority": "일반 참조",
    "sizeLabel": "2.4 MB",
    "by": "정소담",
    "at": "2026.10.15",
    "category": "related",
    "main": false
  }
];
export const MFG_DEMO_REQUIREMENTS = [
  {
    "id": "SFR-001",
    "sectionId": "s11",
    "title": "숙련공 고령화로 공정 노하우 단절 위험 확대",
    "coverage": "full",
    "page": 3
  },
  {
    "id": "SFR-002",
    "sectionId": "s11",
    "title": "작업자별 설정값 차이로 불량률 3~5% 변동",
    "coverage": "full",
    "page": 6
  },
  {
    "id": "SFR-003",
    "sectionId": "s21",
    "title": "KS X 9101 데이터 모델로 확장성 확보",
    "coverage": "full",
    "page": 9
  },
  {
    "id": "SFR-004",
    "sectionId": "s21",
    "title": "1개 라인 실증 후 3사 전체로 확대",
    "coverage": "full",
    "page": 12
  },
  {
    "id": "SFR-005",
    "sectionId": "s31",
    "title": "PLC · MES · 검사장비 데이터 수집",
    "coverage": "partial",
    "page": 15
  },
  {
    "id": "SFR-006",
    "sectionId": "s31",
    "title": "결측 · 이상치 처리 및 표준화",
    "coverage": "partial",
    "page": 18
  },
  {
    "id": "SFR-007",
    "sectionId": "s32",
    "title": "공정 조건으로 불량 발생 확률 예측",
    "coverage": "partial",
    "page": 21
  },
  {
    "id": "SFR-008",
    "sectionId": "s32",
    "title": "목표 품질을 위한 최적 조건 추천",
    "coverage": "partial",
    "page": 24
  },
  {
    "id": "SER-001",
    "sectionId": "s33",
    "title": "A사 사출 라인 실증",
    "coverage": "partial",
    "page": 27
  },
  {
    "id": "SER-002",
    "sectionId": "s33",
    "title": "B사 · C사 라인 확대",
    "coverage": "partial",
    "page": 30
  },
  {
    "id": "PMR-001",
    "sectionId": "s41",
    "title": "현황 분석 · 플랫폼 설계",
    "coverage": "partial",
    "page": 33
  },
  {
    "id": "PMR-002",
    "sectionId": "s41",
    "title": "연계 플랫폼 · AI 모델",
    "coverage": "partial",
    "page": 36
  }
] as const;

export function manufacturingSlideSeed(key: string): ManufacturingSlideSeed | null {
  return MFG_DEMO_SLIDES.find(slide => slide.id === key) ?? null;
}
export function manufacturingSectionPrompt(sectionId: ManufacturingSectionId): ManufacturingPrompt {
  const first = MFG_DEMO_SLIDES.find(slide => slide.sectionId === sectionId)!;
  return { intro: first.lead, bullets: first.items.map(([heading, text]) => heading + ': ' + text) };
}
