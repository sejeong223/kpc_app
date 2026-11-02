"use client";

import { AddRegular, ChevronRightRegular, Dismiss12Regular } from "@fluentui/react-icons";
import { useId, useRef, useState, type ReactElement } from "react";

import { Button } from "@/components/common";

// Import individual examples into a development surface when needed.
// They are deliberately not connected to an application route or the public barrel.
export function ButtonPresetExamples(): ReactElement {
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <Button>취소</Button>
      <Button className="primary">저장</Button>
      <Button className="ghost">더 보기</Button>
      <Button className="soft">추가</Button>
      <Button className="dark">작업공간 열기</Button>
      <Button className="danger">삭제</Button>
    </div>
  );
}

export function ButtonLayoutExamples(): ReactElement {
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <Button>텍스트만</Button>
      <Button className="primary tw:gap-2">
        <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
        추가
      </Button>
      <Button>
        다음
        <ChevronRightRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
      </Button>
      <Button>
        <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
        항목 만들기
        <ChevronRightRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
      </Button>
      <Button className="soft tw:flex-col tw:h-auto tw:py-2">
        <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
        <span>세로 배치</span>
      </Button>
      <Button className="tw:w-full tw:justify-between">
        <span>전체 폭 양끝 정렬</span>
        <ChevronRightRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
      </Button>
      <Button className="tw:w-full tw:justify-start">왼쪽 정렬</Button>
      <Button className="primary tw:h-10 tw:px-4 tw:gap-2">
        <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
        높이와 여백 조절
      </Button>
      <Button className="ghost tw:w-4 tw:h-5 tw:p-0" aria-label="닫기">
        <Dismiss12Regular aria-hidden="true" className="tw:w-3 tw:h-3 tw:shrink-0" />
      </Button>
      <Button className="tw:h-auto tw:whitespace-normal tw:px-3 tw:py-2 tw:text-left">
        긴 안내 문구가 필요한 버튼은 사용처에서 높이와 줄바꿈을 함께 조절합니다.
      </Button>
    </div>
  );
}

export function ButtonStateExamples(): ReactElement {
  const [selected, setSelected] = useState(false);

  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <Button
        className={selected ? "soft active" : "soft"}
        aria-pressed={selected}
        onClick={() => setSelected((value) => !value)}
      >
        필터 선택
      </Button>
      <Button className="primary" disabled>저장 불가</Button>
      <Button className="soft active" aria-pressed={true} disabled>선택됨 · 변경 불가</Button>
      <Button
        className={
          "soft tw:bg-emerald-50 tw:text-emerald-900 tw:border-emerald-700 " +
          "tw:enabled:hover:bg-emerald-100 tw:[&.active:enabled]:bg-emerald-200 " +
          "tw:disabled:bg-slate-100 tw:disabled:text-slate-400" +
          (selected ? " active" : "")
        }
        aria-pressed={selected}
        onClick={() => setSelected((value) => !value)}
      >
        같은 선택값 · 색상 변경 예시
      </Button>
    </div>
  );
}

export function ButtonFormExample(): ReactElement {
  const formId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <form
        id={formId}
        className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"
        onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}
        onReset={() => setSubmitted(false)}
      >
        <label htmlFor={inputId}>제목</label>
        <input ref={inputRef} id={inputId} name="title" defaultValue="예시" />
        <Button onClick={() => inputRef.current?.focus()}>입력에 포커스</Button>
      </form>
      <div className="tw:flex tw:flex-wrap tw:gap-2">
        <Button ref={buttonRef} type="submit" form={formId} className="primary">제출</Button>
        <Button type="reset" form={formId}>초기화</Button>
        <Button onClick={() => buttonRef.current?.focus()}>제출 버튼에 포커스</Button>
      </div>
      <span role="status">{submitted ? "제출됨" : "제출 전"}</span>
    </div>
  );
}
