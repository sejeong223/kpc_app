"use client";
import { Tab, TabList } from "@fluentui/react-components";
import { useEffect,useRef } from "react";
interface AdminTabsProps<T extends string> { label: string; value: T; options: readonly { value: T; label: string }[]; onChange(value: T): void }
export default function AdminTabs<T extends string>({ label, value, options, onChange }: AdminTabsProps<T>): React.ReactElement {
  const scroll=useRef<HTMLDivElement>(null);
  function reveal(element:Element|null){
    const container=scroll.current;if(!container||!element)return;
    const bounds=container.getBoundingClientRect(),tab=element.getBoundingClientRect();
    if(tab.left<bounds.left)container.scrollLeft+=tab.left-bounds.left;
    else if(tab.right>bounds.right)container.scrollLeft+=tab.right-bounds.right;
  }
  useEffect(()=>{
    // Fluent의 선택·포커스 반영이 끝난 프레임에서 가로 위치만 보정한다.
    const frame=requestAnimationFrame(()=>reveal(scroll.current?.querySelector('[role="tab"][aria-selected="true"]')??null));
    return()=>cancelAnimationFrame(frame);
  },[value,label,options]);
  return <div ref={scroll} className="tw:w-full tw:min-w-0 tw:max-w-full tw:overflow-x-auto" onFocusCapture={event=>{
    const target=event.target.closest('[role="tab"]');
    requestAnimationFrame(()=>{if(target&&scroll.current?.contains(target))reveal(target);});
  }}>
    <TabList className="tw:w-max tw:min-w-full" aria-label={label} selectedValue={value} onTabSelect={(_, data) => { const option = options.find((o) => o.value === data.value); if (option) onChange(option.value); }}>
    {options.map((o) => <Tab key={o.value} value={o.value}>{o.label}</Tab>)}
    </TabList>
  </div>;
}
