# Task: T02 PPT boolean 판독과 원본 보존

## Status: done

## Goal
동일한 의미의 OOXML boolean 표현 때문에 숨김·반전 요소가 수정되거나 굵기·병합·공유 표시 상태가 달라지지 않게 한다.

## Decision Summary
- F03 수정. W3C boolean의 true/1과 false/0을 공통 함수로 판독한다. 기존 상속·기본값·미지원 요소 보존 정책은 유지한다.
- T01 이후 순차 실행하며 중간 커밋은 보류한다. 저장 모델이나 지원 도형 범위는 확대하지 않는다.

## Implementation

### I01. 공통 XML boolean 판독
- Related Files:
  - `lib/pptx/pptx-xml.ts` :: `readXmlBoolean` — 순수 판독 함수; modify
  - `lib/pptx/template-read.ts` :: `style`, `readObject`, `readGroupMembers`, `readTemplate` — 속성 판독 통일; modify
  - `lib/pptx/shared-design.ts` :: 공유 편집의 blocker/access 판정 — 기존 reasons 흐름 검토; read-only

#### Details
- Signatures & Types:
```typescript
function readXmlBoolean(raw: string | null | undefined, fallback?: boolean): boolean;
```
- Data & Schema Fields: fallback 기본값은 false. trim 후 `true`/`1`은 true, `false`/`0`은 false. null/undefined/빈값/잘못된 표현은 fallback. 대소문자 자동 보정이나 `Boolean(raw)`를 쓰지 않는다. 미지원 입력 전체에 대한 새 예외는 추가하지 않는다.
- Execution Flow / Logic:
  1. 일반 요소 cNvPr.hidden, xfrm.flipH/flipV를 helper로 판독한다. 회전 rot 숫자 검사는 기존 그대로다.
  2. 그룹 상위 hidden/flip 판독도 helper로 교체한다. 그룹 내부 요소도 일반 판독을 공유한다.
  3. TextStyle.bold는 로컬 b가 누락되었을 때 기존 def/fallback에서 값을 가져온 뒤 판독한다. 명시적인 false/0은 상속된 true를 덮어야 한다. 누락과 false를 혼동하지 않는다.
  4. 표 hMerge/vMerge는 helper, gridSpan/rowSpan은 기존 숫자 검사다. 병합 셀의 행·열/분할 보존 정책을 바꾸지 않는다.
  5. slide/layout의 showMasterSp는 누락 기본값 true로 판독한다. 숨김 공유 요소를 새로 노출하지 않는다.
  6. boolean 관련 비교를 대상 모듈에서 다시 검색해 같은 의미의 비교가 분산되어 남지 않게 한다. 입력 XML의 문자열을 일괄 정규화하여 기록하지 않는다.
- Errors/Return: 기존 `PptxError`, XML 파싱·경로·DTD·용량 검증은 유지. 비정상 bool을 임의로 true로 확대하지 않는다.
- 명세 근거: [W3C boolean lexical mapping](https://www.w3.org/TR/xmlschema11-2/#boolean).

### I02. 요소·파트 보존 검사
- Related Files:
  - `tests/lib/pptx/xml-booleans.test.ts` :: 값 표 검사; new
  - `tests/lib/pptx/template-read.test.ts` :: 굵기/병합/표시 상태; modify
  - `tests/lib/pptx/template-apply.test.ts` :: 숨김/반전 보존; modify
  - `tests/lib/pptx/shared-groups.test.ts` :: 그룹 부모·내부 true/1; modify
  - `tests/lib/pptx/fixture.ts` :: `setupXmlDom`, `alteredFixture`, `fixtureBytes`; read-only
  - `tests/lib/pptx/transform-fixture.ts` :: `transformFixture`, `preservedParts`; read-only
- Tests:
  - true/1, false/0, 공백·누락·invalid와 fallback=true/false 조합.
  - 동일 fixture의 같은 제목에 hidden=1/true를 각각 넣고 둘 다 skipped 및 해당 도형 XML 동일. false/0은 동일한 지원 요소로 판독한다.
  - flipH와 flipV 각각 true/1 보존, false/0 일반 처리. 회전/그룹 보존 사유가 사라지지 않는다.
  - 로컬 b=false가 상속 true를 덮는 경우, b 누락 시 상속하는 경우.
  - hMerge/vMerge의 true/1 동일 판정. 기존 span 병합 검사도 유지.
  - showMasterSp false/0에서 decorations 제외, true/1 및 누락에서 기존 표시 유지.
  - 그룹 부모·내부 hidden=true가 공유 편집 허용 범위를 확대하지 않는다. 미변경 관계·미디어·임베딩 파트는 그대로다.

## Acceptance Criteria
- [x] hidden=true/1 모두 실제 출력에서 원본 도형을 보존한다.
- [x] 반전·굵기·병합·공유 표시의 동등성/상속을 검사했다.
- [x] 기존 공유 그룹 편집과 ZIP/XML 안전성 검사가 통과한다.

## Validation
- `npm.cmd test -- tests/lib/pptx` — 전체 PPT 단위 검사 통과.
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- T07에서 변경 전/후 PPT와 PowerPoint 확인 여부를 별도 기록한다.

## Commit Message
```text
fix(pptx): OOXML boolean 판독과 요소 보존 규칙 통일

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T02-ooxml-booleans

- true/1 및 false/0 판독 공통화
- 숨김·반전·상속·병합 원본 보존 검사
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: PPT 7개 파일 37개 테스트, typecheck, lint 통과. 동등성 검사는 xml-booleans.test.ts로 모았다.

- 최종 확인: T07 출력 검증: hidden/flipH/flipV × 1/true 총 6개 출력의 대상 도형 XML 및 각 35개 미수정 파트 보존, PowerPoint 24장 렌더링 통과. bool 전용 검사는 tests/lib/pptx/xml-booleans.test.ts에 모았다.
