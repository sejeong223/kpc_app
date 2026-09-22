# Proposal Screen Manifest

Source of truth: `KPC_AI@8f074e51f7a16db063ef5206e6ac927c6e87c2a4`

| Scenario | Source entry action | Expected surface | Automation |
| --- | --- | --- | --- |
| `header-proposal-active` | `#gnb-proposals-btn` | 제안서 AI active line, 56px Header, 208px Sidebar | T01 |
| `header-profile-dropdown` | `#user-profile-badge` | 사용자, 사용량, 알림, 설정, 권한 dropdown | T01 |
| `pipeline-kanban` | 제안서 AI 진입 | 4 stage, fixture 3/3/3/1 | T01 |
| `pipeline-list` | `#pipeline-view-list-btn` | 동일 fixture의 table view | T01 |
| `project-registration` | `#register-project-main-btn` | 직접 등록 form과 RFP upload | T01 |
| `project-review` | 첫 `검토시작` | RFP viewer와 P-Win 2-column review | T01 |
| `setup` | 첫 `작성시작` | active project 01 기본설정 | T01 |
| `analysis` | setup의 `RFP 분석 시작` | 분석 결과, uploaded files | P03-T01 |
| `requirements` | 분석 완료 후 `03 체크리스트` | 요구사항 filters/table | P03-T01 |
| `structure` | editor 내 목차 관리 | 제안서 목차 tree | P03-T02 |
| `tasks` | editor 내 작성 관리 | 담당자별 section task | P03-T02 |
| `editor` | 분석 완료 후 `04 작성` | source editor 전체 pane | P03-T02 |
| `matrix` | 분석 완료 후 `05 검토` | 전체 문서, matrix, fact check | P03-T03 |
| `library` | `#lnb-library-btn` | category/search/library cards | T01 |
| `settings` | `#lnb-settings-btn` | 6개 설정 tab | T01 |
| `proposal-convert` | 연결된 source action 없음 | JSX는 있으나 사용자 도달 불가 | source-unreachable |
| `opportunity-search` | `App.tsx` render branch 없음 | import-only component | source-unreachable |
| `rfp-detail` | `App.tsx` render branch 없음 | import-only component | source-unreachable |
| `rfp-upload-view` | `App.tsx` render branch 없음 | type/fixture export만 사용 | source-unreachable |
| `proposal-projects-list` | `App.tsx` render branch 없음 | import-only component | source-unreachable |

각 구현 Task는 담당 scenario의 stable action과 screenshot을 같은 spec에 추가한다. 다른 GNB category content는 이 manifest와 baseline에 포함하지 않는다.