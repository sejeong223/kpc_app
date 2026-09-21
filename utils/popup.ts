export function openCenteredPopup(
  url: string,
  target: string,
  width: number,
  height: number,
): Window | null {
  const dualScreenLeft = window.screenX ?? 0;
  const dualScreenTop = window.screenY ?? 0;

  const viewportWidth =
    window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const viewportHeight =
    window.innerHeight ??
    document.documentElement.clientHeight ??
    screen.height;

  const left = dualScreenLeft + (viewportWidth - width) / 2;
  const top = dualScreenTop + (viewportHeight - height) / 2;

  return window.open(
    url,
    target,
    `scrollbars=yes, width=${width}, height=${height}, top=${top}, left=${left}`,
  );
}
