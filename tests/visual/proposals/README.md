# Proposal UI Visual Parity

`KPC_AI` commit `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`의 실제 Chromium 출력을 제안서 UI 기준선으로 사용한다.

## 기준선 생성

1. `C:\Users\김세정\Documents\GitHub\KPC_AI`가 지정 commit인지 확인한다.
2. 원본 Vite 서버를 `http://127.0.0.1:3001`에서 실행한다.
3. `$env:KPC_REFERENCE_URL='http://127.0.0.1:3001'; npm.cmd run test:proposal-reference`를 실행한다.

reference project만 snapshot 갱신이 가능하며 commit이 다르면 suite가 즉시 중단된다. target 결과로 기준선을 갱신하지 않는다.

## Target 비교

1. target Next.js 서버를 `http://127.0.0.1:3000`에서 실행한다.
2. `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual`을 실행한다.

비교는 Windows Chromium, device scale factor 1, light color scheme과 3개 desktop viewport에서 수행한다. 최대 허용 pixel 차이는 0.5%다.