// StrictMode의 즉시 재연결은 유지하고 실제 unmount만 다음 microtask에서 정리한다.
export function createDisposalLease(dispose:()=>void):()=>()=>void {
  let generation=0;
  return ()=>{const current=++generation;return ()=>{queueMicrotask(()=>{if(current===generation)dispose();});};};
}
