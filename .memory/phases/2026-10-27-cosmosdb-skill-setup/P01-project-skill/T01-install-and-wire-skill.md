# Task: T01 Cosmos DB 스킬 고정 설치와 프로젝트 규칙 연결

## Status: done

## Goal

`kpc_app`에서 공식 `cosmosdb-best-practices`를 실제 로컬 파일로 읽을 수 있게 설치하고, Cosmos DB for NoSQL 관련 작업 시 먼저 읽도록 AGENTS.md에 연결한다. 설치 출처를 검증·기록하며 실제 DB·테이블·컨테이너는 생성하지 않는다.

## Decision Summary

- 사용자가 프로젝트 전용 설치와 AGENTS.md의 Cosmos DB 작업 시 우선 적용을 선택했다. 전역 설치·다른 프로젝트 변경은 하지 않는다.
- 검토한 공식 commit `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef`를 고정해 원문을 복사한다. 기존 Cosmos DB 서비스·생성 스크립트·앱 코드는 유지한다.

## Implementation

### I01. 공식 스킬을 프로젝트 경로에 설치

- Related Files:
  - `.agents/skills/cosmosdb-best-practices/**` :: upstream 전체 스킬 bundle — 공식 지침; new
  - `C:\Users\김세정\.codex\skills\.system\skill-installer\SKILL.md` :: 설치 workflow — 실행 전에 적용 사실 알리고 읽기; read-only
  - `C:\Users\김세정\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py` :: `main`, `--ref`, `--dest`, `--method` — 공식 helper 사용; read-only
  - `.agents/skills` :: 기존 grill-me/memory-plan/memory-execute/visualize — 보존; read-only

#### Details

- **Signatures & Types**: 앱 함수·클래스·DB 모델 변경 없음. 외부 helper의 CLI 계약만 사용한다.

  ```text
  python install-skill-from-github.py
    --repo <owner/repo>
    --path <repository-relative-skill-path>
    --ref <immutable-commit>
    --dest <parent-skills-directory>
    --method download
  ```

- **Data & Schema Fields**:
  - repository: `AzureCosmosDB/cosmosdb-agent-kit`
  - ref: `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef`
  - sourcePath: `skills/cosmosdb-best-practices`
  - destination parent: `.agents/skills`
  - installedPath: `.agents/skills/cosmosdb-best-practices`
  - source files: 146개, 모두 일반 파일. `rules/*.md` 142개에는 `_sections.md`, `_template.md`가 포함된다.
  - SKILL.md의 `rules/` 링크: 140개, 확인한 snapshot에서는 모두 존재한다.

- **Execution Flow / Logic**:
  1. 실행 cwd가 `C:\Users\김세정\Documents\GitHub\kpc_app`인지 확인하고 `git status --short`로 사용자 변경을 보존한다. `skill-installer` 적용 사실을 알리고 위 SKILL.md를 읽는다.
  2. 목적지 폴더가 없다면 다음 명령으로 설치한다. `--dest`는 최종 폴더가 아닌 **부모** `.agents/skills`다. 이 옵션을 생략해 사용자 전역에 설치하지 않는다.

     ```powershell
     python 'C:\Users\김세정\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py' --repo AzureCosmosDB/cosmosdb-agent-kit --path skills/cosmosdb-best-practices --ref 51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef --dest .agents/skills --method download
     ```

  3. 현재 설치 경로가 이미 존재하면 자동 덮어쓰기·삭제·중복 폴더 생성을 하지 않는다. 이 Task의 검증으로 동일 snapshot임이 확인되면 재사용하고, 내용이 다르면 차이를 보고해 기존 사용자 파일을 보존한다.
  4. 다운로드 또는 검증에 실패하면 source ref를 최신 main이나 다른 commit으로 바꾸지 않는다. 부분 설치 여부와 실제 오류를 확인해 동일 범위에서 해결한다. 실패를 성공으로 표시하지 않는다.
  5. 설치된 `SKILL.md`, README, metadata, agents YAML, rules를 upstream 원문대로 유지한다. README의 `.copilot/skills` 예시는 이 프로젝트 설치 경로로 오인하지 않는다.
  6. upstream npm/build/테스트 스크립트나 CLI 설치 예시를 실행하지 않는다. 스킬은 지침 파일이며 프로젝트 npm 의존성이 아니다.

### I02. MIT LICENSE와 별도 출처 기록

- Related Files:
  - `.agents/skills/cosmosdb-best-practices/LICENSE` :: upstream 저장소 루트 LICENSE — 같은 snapshot의 고지 보존; new
  - `.agents/skill-sources.json` :: 프로젝트 자체 설치 출처 manifest — 공식 원문과 분리한 재현 정보; new
  - `.gitattributes` :: 설치 폴더에 한정한 `text eol=lf` — Git checkout 후 원문 무결성 보존; new (기존 파일이 생겼다면 append)
  - `.memory/decisions/2026-10-27-cosmosdb-skill-setup.md` :: 인터뷰 출처 — 기존 confirmed 결정; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // JSON 파일의 문서화용 타입이다. 이 타입을 앱 코드에 생성하지 않는다.
  interface ProjectSkillSources {
    schemaVersion: 1;
    skills: {
      "cosmosdb-best-practices": {
        repository: string;
        ref: string;
        sourcePath: string;
        installedPath: string;
        skillMetadataVersion: string;
        packageMetadataVersion: string;
        license: "MIT";
        skillSha256: string;
        licenseSourcePath: "LICENSE";
        licenseSha256: string;
        upstreamFileCount: number;
        upstreamRuleMarkdownCount: number;
        linkedRuleCount: number;
      };
    };
  }
  ```

- **Data & Schema Fields**: `.agents/skill-sources.json`의 해당 entry는 다음 값으로 작성한다. nullable 필드는 없으며 다른 스킬의 기존 entry가 있다면 보존한다.

  ```json
  {
    "schemaVersion": 1,
    "skills": {
      "cosmosdb-best-practices": {
        "repository": "https://github.com/AzureCosmosDB/cosmosdb-agent-kit",
        "ref": "51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef",
        "sourcePath": "skills/cosmosdb-best-practices",
        "installedPath": ".agents/skills/cosmosdb-best-practices",
        "skillMetadataVersion": "1.0.0",
        "packageMetadataVersion": "1.3.0",
        "license": "MIT",
        "skillSha256": "00e0c45a266c82b52fe79d725f59307f4a997d608073776e6cd28141a7d27392",
        "licenseSourcePath": "LICENSE",
        "licenseSha256": "59be3807818335eeec97829762294bd25780c6514454a25b19ff58ed4eafe380",
        "upstreamFileCount": 146,
        "upstreamRuleMarkdownCount": 142,
        "linkedRuleCount": 140
      }
    }
  }
  ```

- **Execution Flow / Logic**:
  1. root LICENSE는 선택한 스킬 하위 폴더에 없으므로 같은 commit의 아래 URL에서 바이트 그대로 받아 설치 폴더의 LICENSE에 추가한다. 이미 동일한 LICENSE가 있다면 재사용한다.
     `https://raw.githubusercontent.com/AzureCosmosDB/cosmosdb-agent-kit/51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef/LICENSE`
  2. 이 추가 고지는 원본 스킬의 기존 파일을 수정하지 않는다. 설치된 파일은 원본 146개 + 추가 LICENSE 1개 = 147개가 된다.
  3. SKILL.md의 metadata version은 `1.0.0`, 같은 snapshot의 metadata.json version은 `1.3.0`이다. 둘을 구별해 기록하고 임의로 통일하지 않는다. 파일의 동일성은 고정 commit과 해시로 확인한다.
  4. `.agents/skill-sources.json`은 이 프로젝트의 자체 출처 기록이다. skills CLI가 생성한 표준 lock 파일이라고 부르거나 사용하지 않은 설치 도구의 결과를 생성하지 않는다.
  5. 날짜·사용자 홈 경로·Azure endpoint·비밀 값은 source manifest에 저장하지 않는다. 재현에 필요한 저장소·commit·프로젝트 상대경로만 사용한다.
  6. 계획 시 `core.autocrlf=true`, `.gitattributes` 없음이 확인됐다. Git 공유 후 줄바꿈 변환으로 해시가 달라지지 않도록 `.gitattributes`에 `/.agents/skills/cosmosdb-best-practices/** text eol=lf`를 적용한다. 기존 파일이 생겼다면 다른 규칙을 보존한다. 사용자 전역 Git 설정·앱 파일의 줄바꿈은 바꾸지 않는다. 원본 파일 자체의 내용을 편집하거나 해시 비교를 생략하는 방식으로 해결하지 않는다. 실행 시 확인한 원문의 줄 끝 공백은 같은 경로의 `whitespace=-blank-at-eol` 속성으로 보존한다.

### I03. Cosmos DB 작업 규칙 연결과 사용법

- Related Files:
  - `AGENTS.md` :: 새 `Cosmos DB 스킬 사용 규칙` 섹션 — 정확한 로컬 경로를 먼저 읽도록 연결; modify
  - `README.md` :: 새 `Cosmos DB 설계 스킬` 섹션 — 설치 범위·소스·사용법 설명; modify
  - `services/CosmosDBService.ts` :: 기존 연결 서비스 — 보존; read-only
  - `scripts/provision-cosmos.ts` :: 기존 명시적 컨테이너 생성 — 보존; read-only
  - `package.json`, `package-lock.json`, `config`, `lib/auth`, `app`, `components` :: 앱과 환경 — 변경하지 않음; read-only

#### Details

- **Signatures & Types**: 앱의 API·함수·세션·Zod·컨테이너 스키마는 변경하지 않는다.
- **Data & Schema Fields**: AGENTS.md에 스킬 경로 `.agents/skills/cosmosdb-best-practices/SKILL.md`와 source manifest 경로 `.agents/skill-sources.json`을 기록한다. 일반 UI 요청에 적용할 전역 규칙은 추가하지 않는다.
- **Execution Flow / Logic**:
  1. AGENTS.md 기존 내용은 유지하고 아래 의미의 독립 섹션을 한 번만 추가한다. 기존 인터뷰/계획/실행 흐름을 덮어쓰지 않는다.
     - Cosmos DB for NoSQL 모델·컨테이너·파티션 키·쿼리·SDK·프로비저닝 작업 전에 정확한 프로젝트 SKILL.md를 읽는다.
     - quick reference만으로 답하지 않고 관련 `rules/*.md` 본문을 읽는다. 사용 파일 경로와 source manifest의 commit을 기록한다.
     - 기존 memory workflow를 따르며 현재 서비스·프로비저닝 경로를 재사용한다. 새 DB 연결 계층을 중복 생성하지 않는다.
     - TypeScript `@azure/cosmos`에서 지원하는 API를 확인하고 Java·.NET 전용 설정이나 예제를 그대로 복사하지 않는다.
     - 실제 업무별 주요 조회·쓰기 패턴·규모를 바탕으로 모델과 파티션 키 후보를 비교한다. 측정 없이 비용·성능을 확정하지 않는다.
     - 리소스 생성·설정 변경은 사용자가 요청한 작업 범위에서 별도 프로비저닝으로 처리한다. 스킬 읽기나 앱 시작이 리소스 자동 생성으로 이어지지 않게 한다. 기존 컨테이너 불일치를 자동 삭제·재생성으로 처리하지 않는다.
     - 이 지침을 UI·비대상 DB 작업에 무조건 적용하지 않는다. 사용자 요청이 프로젝트 관례보다 우선한다.
  2. README에 프로젝트 설치 위치, 공식 저장소와 고정 commit, source manifest 경로를 추가한다. `$cosmosdb-best-practices` 명시 호출과 일반 Cosmos DB 설계 요청 모두의 사용 방법을 짧게 설명한다.
  3. 설치 완료 후 다음 요청에서 새 스킬을 사용할 수 있다고 안내한다. 현재 대화의 catalog가 재탐색됐다고 주장하지 않는다. 다음 대화에서 명시 호출 또는 실제 로컬 경로 읽기를 통해 인식을 확인하도록 설명한다.
  4. 문서에 테이블 생성 시 Cosmos DB의 컨테이너·JSON 문서 모델을 설계한다는 점을 설명하되 샘플 스키마·PK·RU 값을 지금 정하지 않는다.
  5. 설치가 Azure 접속·권한·네트워크 준비를 대신한다는 인상을 주지 않는다. 이번 설치 검증에서 Azure 리소스를 조회하거나 생성하지 않는다.

### I04. 설치 파일·rule 링크·실제 읽기 검증

- Related Files:
  - `.agents/skills/cosmosdb-best-practices/SKILL.md` :: frontmatter, `rules/` 링크 — 실제 읽기; read-only after install
  - `.agents/skills/cosmosdb-best-practices/rules/model-embed-related.md` :: 모델링 지침 — 실제 읽기; read-only after install
  - `.agents/skills/cosmosdb-best-practices/rules/partition-query-patterns.md` :: 조회 패턴과 PK — 실제 읽기; read-only after install
  - `.agents/skills/cosmosdb-best-practices/rules/query-parameterize.md` :: 파라미터 바인딩 — 실제 읽기; read-only after install
  - `.memory/phases/2026-10-27-cosmosdb-skill-setup/P01-project-skill/T01-install-and-wire-skill.md` :: 실행 결과 — 사용 파일·소스·검증 범위 기록; modify on completion

#### Details

1. 설치 완료 직후 로컬 SKILL.md를 실제로 열어 frontmatter name, 적용 범위, rule 본문 읽기 지시를 확인한다. 원격에서만 읽고 로컬 설치 확인을 완료했다고 하지 않는다.
2. 위 세 rule 파일도 실제로 읽고 모델링·PK·쿼리 각각의 요지를 실행 결과에 짧게 남긴다. 벤더 문서의 성능 수치나 예시 PK를 이 프로젝트에서 검증한 결과로 주장하지 않는다.
3. 고정 commit의 GitHub tree에 기록된 각 blob id와 로컬 파일의 Git blob SHA-1을 비교한다. 누락·다른 내용·예상 밖 추가 파일을 검출한다. 원본 146개 중 하나라도 다르면 완료로 처리하지 않는다.
4. LICENSE와 SKILL.md SHA-256, SKILL.md 140개 rule 링크가 모두 설치 루트 안의 파일인지 확인한다. 경로를 벗어나는 상대 링크·symlink가 있으면 성공으로 처리하지 않는다.
5. 검증 스크립트는 아래 Validation의 일회성 읽기용 명령으로 실행한다. 스타일/원문을 복제하는 앱 단위 테스트나 영구 검증 도구 파일을 새로 만들지 않는다.
6. 다음 대화에서의 자동 발견은 현재 턴에서 실제로 관찰할 수 없다. `로컬 설치·읽기 검증 완료`와 `다음 턴의 catalog 인식은 다음 요청에서 확인`을 구분한다. 설치 자체가 실패한 경우와 혼동해 보고하지 않는다.

## Acceptance Criteria

- [x] 정확한 프로젝트 폴더에 고정 commit의 원본 146개 파일과 LICENSE를 설치했다.
- [x] source manifest에 실제 경로·commit·두 버전·해시·파일 수가 정확히 기록된다.
- [x] 설치 폴더에만 LF 정책을 적용해 Git checkout 뒤에도 원문 무결성이 유지된다.
- [x] 원본 전체 파일 blob hash·SKILL.md/라이선스 SHA-256·140개 rule 링크 검증이 통과한다.
- [x] 로컬 SKILL.md와 지정 rule 3개를 실제 읽고 사용한 경로·요지를 기록했다.
- [x] AGENTS.md가 이 스킬을 Cosmos DB 작업에 연결하며 기존 workflow는 보존한다.
- [x] README가 명시 호출·프로젝트 적용·다음 요청에서의 인식 확인을 설명한다.
- [x] 전역 스킬·다른 프로젝트·애플리케이션·의존성·Azure 설정·리소스에 변경이 없다.
- [x] 이미 존재하는 컨테이너의 설정 비교 기능을 이번 범위에 임의 추가하지 않는다.
- [x] 설치와 자동 인식의 검증 범위를 구분하고 한국어 Task 커밋을 남긴다.

## Validation

- `Test-Path -LiteralPath '.agents/skills/cosmosdb-best-practices/SKILL.md'` — true.
- `Get-Content -LiteralPath '.agents/skills/cosmosdb-best-practices/SKILL.md' -Encoding UTF8 -Raw` — 실제 로컬 지침 읽기.
- `Get-Content -LiteralPath '.agents/skills/cosmosdb-best-practices/rules/model-embed-related.md' -Encoding UTF8 -Raw` — 모델링 rule 읽기.
- `Get-Content -LiteralPath '.agents/skills/cosmosdb-best-practices/rules/partition-query-patterns.md' -Encoding UTF8 -Raw` — PK rule 읽기.
- `Get-Content -LiteralPath '.agents/skills/cosmosdb-best-practices/rules/query-parameterize.md' -Encoding UTF8 -Raw` — 쿼리 rule 읽기.
- 아래는 설치 후 실행할 읽기 전용 검증이다. 이 계획 단계에서 실행하지 않는다. stdin 인코딩 때문에 한국어 경로·문서가 깨지지 않도록 PowerShell 출력 인코딩을 설정한다.

  ```powershell
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $env:PYTHONIOENCODING = 'utf-8'
  @'
  from pathlib import Path
  import hashlib, json, re, urllib.request

  ref = '51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef'
  repo = 'AzureCosmosDB/cosmosdb-agent-kit'
  source_prefix = 'skills/cosmosdb-best-practices/'
  root = Path('.agents/skills/cosmosdb-best-practices').resolve()
  def read_url(url):
      request = urllib.request.Request(url, headers={'User-Agent': 'codex-skill-validation'})
      return urllib.request.urlopen(request, timeout=30).read()

  tree = json.loads(read_url(f'https://api.github.com/repos/{repo}/git/trees/{ref}?recursive=1'))
  assert not tree.get('truncated'), 'Incomplete source tree'
  entries = [e for e in tree['tree'] if e['type'] == 'blob' and e['path'].startswith(source_prefix)]
  assert len(entries) == 146
  for entry in entries:
      assert entry['mode'] == '100644'
      path = root / entry['path'][len(source_prefix):]
      assert path.resolve().is_relative_to(root) and path.is_file() and not path.is_symlink()
      content = path.read_bytes()
      digest = hashlib.sha1(f'blob {len(content)}\0'.encode() + content).hexdigest()
      assert digest == entry['sha'], f'Source mismatch: {path}'

  expected_files = {e['path'][len(source_prefix):] for e in entries} | {'LICENSE'}
  actual_files = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
  assert actual_files == expected_files
  assert len(list((root / 'rules').glob('*.md'))) == 142
  skill_bytes = (root / 'SKILL.md').read_bytes()
  skill_text = skill_bytes.decode('utf-8')
  assert 'name: cosmosdb-best-practices' in skill_text
  assert 'version: "1.0.0"' in skill_text
  assert hashlib.sha256(skill_bytes).hexdigest() == '00e0c45a266c82b52fe79d725f59307f4a997d608073776e6cd28141a7d27392'
  assert json.loads((root / 'metadata.json').read_text(encoding='utf-8'))['version'] == '1.3.0'
  links = re.findall(r'\]\((rules/[^)]+)\)', skill_text)
  assert len(links) == 140
  for link in links:
      path = (root / link).resolve()
      assert path.is_relative_to(root) and path.is_file()
  license_bytes = (root / 'LICENSE').read_bytes()
  assert hashlib.sha256(license_bytes).hexdigest() == '59be3807818335eeec97829762294bd25780c6514454a25b19ff58ed4eafe380'
  manifest = json.loads(Path('.agents/skill-sources.json').read_text(encoding='utf-8-sig'))
  record = manifest['skills']['cosmosdb-best-practices']
  assert manifest['schemaVersion'] == 1 and record['ref'] == ref
  assert record['repository'] == 'https://github.com/' + repo
  assert record['sourcePath'] == source_prefix.rstrip('/')
  assert record['installedPath'] == '.agents/skills/cosmosdb-best-practices'
  assert record['skillMetadataVersion'] == '1.0.0' and record['packageMetadataVersion'] == '1.3.0'
  assert record['skillSha256'] == hashlib.sha256(skill_bytes).hexdigest()
  assert record['license'] == 'MIT' and record['licenseSourcePath'] == 'LICENSE'
  assert record['licenseSha256'] == hashlib.sha256(license_bytes).hexdigest()
  assert (record['upstreamFileCount'], record['upstreamRuleMarkdownCount'], record['linkedRuleCount']) == (146, 142, 140)
  agents = Path('AGENTS.md').read_text(encoding='utf-8-sig')
  assert agents.count('## Cosmos DB 스킬 사용 규칙') == 1
  assert '.agents/skills/cosmosdb-best-practices/SKILL.md' in agents
  assert '.agents/skill-sources.json' in agents
  print(json.dumps({'upstream_files_verified': 146, 'installed_files': 147, 'linked_rules_verified': 140, 'source_manifest': 'passed'}))
  '@ | python -
  ```

- `git diff -- AGENTS.md README.md` — 기존 workflow·서비스 설명을 보존하고 필요한 섹션만 추가했는지 검토.
- `git check-attr text eol -- .agents/skills/cosmosdb-best-practices/SKILL.md .agents/skills/cosmosdb-best-practices/rules/query-parameterize.md` — 두 경로 모두 text set, eol lf. `git config --get core.autocrlf`는 기존 값을 유지한다.
- `git status --short`, `git diff --name-only`, `git diff --cached --check` — 이 Task의 설치 폴더·manifest·scoped .gitattributes·AGENTS·README·memory 진행 파일만 stage하고, 다른 사용자 변경은 보존.
- 코드·npm 패키지를 변경하지 않는 지침 설치이므로 npm 설치·앱 빌드·앱 단위 테스트를 검증 대신 실행하지 않는다. Azure 호출 역시 없다.

## Commit Message

```text
chore(skills): Cosmos DB 설계 스킬과 프로젝트 적용 규칙 추가

Plan: 2026-10-27-cosmosdb-skill-setup
Phase: P01-project-skill
Task: T01-install-and-wire-skill

- 공식 Cosmos DB 스킬을 고정 커밋으로 프로젝트에 설치하고 출처 검증
- Cosmos DB 작업 시 스킬과 관련 규칙을 먼저 읽도록 프로젝트 지침 연결
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task의 설치 파일·프로젝트 지침·완료 기록을 포함한 동일 커밋. 위 Plan/Phase/Task 식별자로 `git log`에서 확인한다.

## Execution Result — 2026-10-27

- `skill-installer`의 공식 helper에 `--ref 51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef --dest .agents/skills --method download`를 명시해 프로젝트 경로에 설치했다. 전역 스킬과 다른 프로젝트는 수정하지 않았다.
- 고정 소스: `AzureCosmosDB/cosmosdb-agent-kit`, commit `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef`, source `skills/cosmosdb-best-practices`. 동일 commit의 MIT LICENSE를 추가 보존했다.
- GitHub tree의 원본 146개 파일 Git blob SHA-1이 로컬 바이트와 모두 일치했다. 추가 LICENSE를 포함한 설치 파일은 147개, `rules/*.md`는 142개, SKILL.md의 규칙 링크는 140개이며 모두 설치 폴더 내부 실제 파일이다. SKILL.md·LICENSE SHA-256과 source manifest의 버전·경로·개수도 통과했다.
- 로컬 `.agents/skills/cosmosdb-best-practices/SKILL.md`를 실제로 읽었다. `name: cosmosdb-best-practices`, SKILL metadata version `1.0.0`, package metadata version `1.3.0`을 구별해 기록했다. 원문 버전·README는 수정하지 않았다.
- 실제로 읽은 모델링 규칙: `.agents/skills/cosmosdb-best-practices/rules/model-embed-related.md`. 함께 읽는 관련 데이터가 크기 제한 안에 머무는지, 갱신과 원자성 요구가 어떤지 확인한 뒤 임베딩 여부를 판단한다.
- 실제로 읽은 파티션 규칙: `.agents/skills/cosmosdb-best-practices/rules/partition-query-patterns.md`. 주요 조회·쓰기 패턴에서 파티션 키 후보를 도출하며, 예시 키를 모든 컨테이너의 기본값으로 정하지 않는다.
- 실제로 읽은 쿼리 규칙: `.agents/skills/cosmosdb-best-practices/rules/query-parameterize.md`. SQL 문자열 보간 대신 매개변수 바인딩을 사용한다. 문서의 언어별 예제를 TypeScript `@azure/cosmos` API로 그대로 복사하거나 성능 수치를 이 프로젝트 측정값으로 주장하지 않는다.
- `git check-attr text eol`은 설치 파일에 `text: set`, `eol: lf`를 확인했다. 기존 `core.autocrlf=true`는 유지했다. AGENTS.md·README diff를 검토해 기존 workflow와 서비스 설명을 보존했다.
- 원본 문서의 Markdown 줄바꿈용 공백 등을 포함한 줄 끝 공백 393곳은 원문 바이트 보존 대상이다. 설치 폴더에만 `whitespace=-blank-at-eol`을 지정해 해당 종류의 검사에서 제외했다. 원본 파일 해시 검사는 유지하고 프로젝트의 다른 파일·공백 검사 규칙은 바꾸지 않았다. 최종 `git diff --cached --check`가 통과했다.
- 설치 폴더·출처 기록·프로젝트 문서·memory 외 앱 코드나 npm 의존성은 변경하지 않았다. 텍스트 설치 검증으로 충분하므로 npm 설치·앱 빌드·앱 테스트를 실행하지 않았고 Azure 인증·데이터 조회·리소스 생성도 하지 않았다.
- 로컬 설치·파일 읽기는 검증 완료다. 현재 턴의 스킬 목록 갱신은 주장하지 않으며, 다음 요청에서 `$cosmosdb-best-practices` 또는 실제 로컬 SKILL.md 경로로 인식을 확인한다.
- 기존 컨테이너 설정 비교 기능 부재는 결정 D07에 따라 그대로 보류한다. 실제 프로비저닝 작업에서 별도 검토한다.
