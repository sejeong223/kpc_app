export const LOGIN_SUCCESS_MESSAGE = "LOGIN_SUCCESS" as const;

export interface LoginSuccessMessage {
  type: typeof LOGIN_SUCCESS_MESSAGE;
}

export function isTrustedLoginSuccessMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  expected: { origin: string; source: Window | null },
): event is MessageEvent<LoginSuccessMessage> {
  return (
    expected.source !== null &&
    event.origin === expected.origin &&
    event.source === expected.source &&
    typeof event.data === "object" &&
    event.data !== null &&
    "type" in event.data &&
    event.data.type === LOGIN_SUCCESS_MESSAGE
  );
}
