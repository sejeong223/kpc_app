# PPT 합성 검증 자료

출처: 로컬 kpc-skill-poc v3.4의 합성 fixture. 고객 자료가 아니다.

- native-template.pptx (50,079 bytes)
- SHA-256: d3b09a2900b346a549fd75b4a4cb398efc0e081b57701855e80879c45378a6c7
- 실제 PowerPoint 표시와 구조 검증 결과는 구분한다.

- skill-comparison.pptx: 동일 PoC 합성 fixture, SHA256 5b944fc515275df8506718ebc82dd74e88fba48b223eb792148a94f1e43e80a5.

- shared-design.pptx: 동일 PoC 합성 fixture, SHA256 9a0e84bec79a6a41b066a7d12f08fafc82391f4ad3db186bd73cf34412d99164.

- shared-groups.pptx: 동일 PoC 합성 fixture, SHA256 86bfae7d660c319122b82b684c91254c1753e0a5aa7c62c343e7344afddfa202.

- native-shared-group.pptx: 동일 PoC 합성 fixture, SHA256 0a6c49f6f17c41ed63fdd3ab7578a3cf12f5536eb24a28468c8c2fe3f0a94f4c.

2026-10-30 현재 앱에서 shared-groups.pptx를 브라우저 업로드·변환·다운로드했다. 출력은 PowerPoint 16.0.20527.20088에서 읽기 전용으로 열고 4장 PNG를 내보내 직접 확인했다. 자세한 검증 수준/제한과 출력 해시는 `.memory/reports/2026-10-30-skill-template-validation.md`에 기록했다. fixture의 화면 밖/축소/겹침 그룹은 보존 여부 검사용이며 최종 제안서 디자인 예제가 아니다.

250 MiB 한도는 작은 File의 size 메타데이터를 재정의해 검사한다. 200장 경계는 동일 슬라이드 참조를 반복한 합성 입력이다. 대용량 실파일의 처리 시간/메모리 성능을 검증한 것으로 해석하지 않는다.
