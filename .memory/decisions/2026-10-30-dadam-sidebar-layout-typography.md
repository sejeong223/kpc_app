# Decisions: dadam 사이드바 레이아웃과 타이포그래피

- Date: 2026-10-30
- Status: 사용자 요구 확정 / 세부 수치는 소스 기반 계획 기본값
- Source: 사용자의 memory-plan 요청 및 후속 브라우저 검증 제외 지시
- Plan: 2026-10-30-dadam-sidebar-layout-typography

## D01. 명시적 요청

`C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app/app/_components`의 dadam 사이드바를 기준으로 KPC 사이드바의 크기·레이아웃·폰트 정렬/스타일 계획을 작성한다. 활성화된 메뉴 탭의 디자인은 현재 고려사항에서 제외한다. 앱 구현은 하지 않는다.

## D02. 소스와 공통 기준

`layout/NavSidebar.tsx` 및 `NavSidebarV2.tsx`를 확인했다. 공통 치수는 펼침200/접힘64px, 행 padding10px12px·gap10px·아이콘20px·그룹 gap4px다. 모바일은 NavSidebar의280px drawer를 기준으로 한다. `app/_styles/fonts.ts`, `fluentThemeTokens.ts`, Fluent Text 기본 토큰을 추적해 Spoqa Han Sans Neo, 일반 메뉴14px/20px/400임을 확인했다.

확인 당시 dadam HEAD는9ce748fab9fd7254c7bba89984354e80e81eba0c, KPC HEAD는8a0f76711582bc54b00d8eec073c851fe1c1f3e8이다. 실제 렌더링 측정은 하지 않았다.

## D03. KPC에 맞춘 계획 기본값

- 외곽12px+그룹6px 여백, 행10px12px padding과20px 아이콘·10px gap을 사용한다. 펼친 상태에도 아이콘을 표시한다.
- KPC 브랜드 문구를 유지하면서16px/24px/500으로 조정한다. dadam의24px fallback/이미지를 그대로 대체하지 않는다. 메뉴는14px/20px/400.
- 기존760/761px 전환점과 fixed sidebar/main margin 구조를 유지한다. 전환점 자체 변경·dadam의 모바일 헤더 이식은 하지 않는다.
- footer는 기존 flex 구조로 유지하고 프로필 trigger 폭을100%로 바꾼다. dadam의 absolute footer+112px spacer를 복제하지 않는다.
- 프로필 이름·소속·역할은 유지하고 트리거의 글자/줄 정렬만 맞춘다. 팝오버 내부와 토큰 모달은 범위 밖이다.
- 색 테마·glass·그림자·애니메이션·RadialLauncher는 이번 크기/폰트 범위에 포함하지 않는다.

## D04. 활성 전용 디자인 제외의 의미

현재 `styles.active`와 접힘 aria-current 색, pathname 판정·aria-current는 그대로 둔다. 활성 메뉴도 공통 family/크기/배치를 공유하므로 그 부분은 같이 바뀌지만, 활성 전용 배경·글자색·굵기800·빨간 inset 강조선·hover를 수정하거나 dadam의 선택 테두리·scale을 도입하지 않는다.

## D05. 서체 범위

로컬 원본400/500/700 woff2만 public에 복사하고 globals.css에 font-face와 CSS 변수를 정의한다. 실제 font-family 적용은 brand/link/profile trigger에만 한정한다. root/aside/FluentProvider 전체에 적용하면 inline 프로필 팝오버까지 바뀌므로 금지한다. 앱 전체 서체 변경·추가 Provider·새 의존성은 없다.

폰트 원문과 함께 [공식 LICENSE](https://github.com/spoqa/spoqa-han-sans/blob/main/LICENSE)의 저작권/라이선스 문서를 보관하도록 청사진에 포함했다.

## D06. Task와 검증

새 폭과 메뉴/프로필 배치가 서로 의존하므로 P01-T01 하나로 묶는다. [검증 정책](./2026-10-30-task-validation-policy.md)에 따라 모든 Task의 브라우저 검증은 제외한다. 기존 자동 회귀·타입·lint·build·정적 검토만 완료 조건이다. 브라우저에서 확인하지 않은 내용을 확인했다고 보고하지 않는다.
