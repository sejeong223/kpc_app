# Decisions: Login UI Restore

- Date: 2026-09-21
- Status: Confirmed

## D01. 복원 범위
- **Chosen**: `610711a` 커밋의 로그인 화면 시각 디자인만 복원한다.
- **Rationale**: 사용자가 원하는 기존 UI는 인디고 `Languages` 아이콘, 영문 `Sign In` 제목·설명, 작은 Microsoft 로고가 있는 outline button 구성이다.

## D02. 인증·보안 동작
- **Chosen**: 현재 구현된 인증 feature gate, same-origin callback 검증, popup origin/source 검증, popup 차단 오류, `Admin` 권한 부족 계정 전환 흐름을 모두 유지한다.
- **Rationale**: 예전 동작은 callback과 `postMessage` 보안 경계가 부족했으므로 UI 복원을 이유로 되돌리지 않는다.

## D03. 문구와 예외 상태
- **Chosen**: 일반 로그인은 기존 영문 문구를 복원하고, 권한 부족·popup 차단 상태는 현재의 명확한 한국어 안내를 같은 레이아웃에 표시한다.
- **Rationale**: 예전 화면에 없던 예외 상태를 숨기지 않으면서 정상 상태의 원본 인상을 유지한다.

## D04. 의존성 정책
- **Chosen**: 삭제된 `nuqs`나 예전 query-state 구현을 다시 추가하지 않고, 현재 props·Next.js search params 구조 위에서 디자인만 구현한다.
- **Rationale**: 삭제된 dependency를 다시 추가할 기능적 이유가 없고, 현재 구조가 더 명시적이고 테스트 가능하다.

## D05. 화면 범위
- **Chosen**: 메인 로그인 카드와 로그인 page 배치를 복원한다. popup/logout의 흰 배경·spinner는 이미 원본과 동일한 인상이므로 현재 보안 구조를 유지한다.
- **Rationale**: 실제 시각적 차이가 있는 부분에만 변경을 제한해 회귀 위험을 줄인다.
