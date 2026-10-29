import { describe, expect, it } from "vitest";

import type { CommentDraft } from "@/config/comments";
import { findMentionQuery, insertMention, reconcileMentionEdits, splitCommentText } from "@/lib/comments/mentions";

const kim = { id: "kim", name: "김민수", isMock: true };
const lee = { id: "lee", name: "이서연", isMock: true };
const empty = (text: string): CommentDraft => ({ text, mentions: [] });

describe("mention editing", () => {
  it("finds a name at the caret and replaces the entire token", () => {
    const value = empty("😀 @김민수 확인");
    const query = findMentionQuery(value, 5, 5)!;
    expect(query).toEqual({ start: 3, end: 7, query: "김" });
    expect(insertMention(value, query, lee)).toEqual({ draft: { text: "😀 @이서연  확인", mentions: [{ userId: "lee", name: "이서연", start: 3, end: 7 }] }, caret: 8 });
  });
  it.each(["a@b.com", "말@김", "@김 다음"])("does not activate email or unrelated tokens: %s", (text) => {
    expect(findMentionQuery(empty(text), text.length, text.length)).toBeNull();
  });
  it("ignores selections, invalid carets and selected mentions", () => {
    const value = insertMention(empty("@"), { start: 0, end: 1, query: "" }, kim).draft;
    expect(findMentionQuery(value, 2, 2)).toBeNull();
    expect(findMentionQuery(empty("@김"), 1, 2)).toBeNull();
    expect(findMentionQuery(empty("@김"), -1, -1)).toBeNull();
  });
  it("keeps selected users aligned through insertions and removes changed tokens", () => {
    const original = insertMention(empty("@ 확인"), { start: 0, end: 1, query: "" }, kim).draft;
    const prefixed = reconcileMentionEdits(original, "😀 " + original.text);
    expect(prefixed.mentions[0]).toMatchObject({ start: 3, end: 7 });
    const changed = reconcileMentionEdits(prefixed, prefixed.text.replace("김민수", "김수"));
    expect(changed.mentions).toHaveLength(0);
    expect(changed.text).toContain("@김수");
    expect(original.mentions[0].start).toBe(0);
  });
  it("preserves subsequent mentions when an earlier one is edited", () => {
    let value = insertMention(empty("@"), { start: 0, end: 1, query: "" }, kim).draft;
    value = { ...value, text: value.text + "@" };
    value = insertMention(value, findMentionQuery(value, value.text.length, value.text.length)!, lee).draft;
    const changed = reconcileMentionEdits(value, value.text.replace("김민수", "김"));
    expect(changed.mentions).toEqual([{ userId: "lee", name: "이서연", start: 3, end: 7 }]);
  });
  it("renders literal content separately from selected mentions without interpreting HTML", () => {
    const value = insertMention(empty("<b> @"), { start: 4, end: 5, query: "" }, kim).draft;
    expect(splitCommentText(value)).toEqual([{ kind: "text", text: "<b> " }, { kind: "mention", text: "@김민수", userId: "kim" }, { kind: "text", text: " " }]);
    expect(splitCommentText(empty("@김민수"))).toEqual([{ kind: "text", text: "@김민수" }]);
  });
});
