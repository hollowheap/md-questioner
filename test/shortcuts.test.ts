import { describe, expect, it } from "vitest";
import { resolveShortcut } from "../src/render/shortcuts.js";

describe("resolveShortcut", () => {
  it("maps digits 1-9 to a zero-based option index", () => {
    expect(resolveShortcut({ key: "1" })).toEqual({ type: "select-option", index: 0 });
    expect(resolveShortcut({ key: "5" })).toEqual({ type: "select-option", index: 4 });
    expect(resolveShortcut({ key: "9" })).toEqual({ type: "select-option", index: 8 });
  });

  it("ignores digits outside 1-9", () => {
    expect(resolveShortcut({ key: "0" })).toBeNull();
    expect(resolveShortcut({ key: "10" })).toBeNull();
  });

  it("maps arrow keys to question navigation", () => {
    expect(resolveShortcut({ key: "ArrowLeft" })).toEqual({ type: "previous-question" });
    expect(resolveShortcut({ key: "ArrowRight" })).toEqual({ type: "next-question" });
  });

  it("never maps a key to a hint action", () => {
    expect(resolveShortcut({ key: "h" })).toBeNull();
    expect(resolveShortcut({ key: "H" })).toBeNull();
  });

  it("ignores unrelated keys", () => {
    for (const key of ["Enter", " ", "Tab", "Escape", "a", "Shift"]) {
      expect(resolveShortcut({ key })).toBeNull();
    }
  });

  it("ignores every key while a textarea has focus", () => {
    const target = { tagName: "TEXTAREA" };
    expect(resolveShortcut({ key: "1", target })).toBeNull();
    expect(resolveShortcut({ key: "ArrowRight", target })).toBeNull();
  });

  it("ignores every key while a text input has focus", () => {
    const target = { tagName: "INPUT", type: "text" };
    expect(resolveShortcut({ key: "1", target })).toBeNull();
    expect(resolveShortcut({ key: "ArrowLeft", target })).toBeNull();
  });

  it("ignores every key inside a contentEditable region", () => {
    const target = { tagName: "DIV", isContentEditable: true };
    expect(resolveShortcut({ key: "3", target })).toBeNull();
  });

  it("still selects options with digits while a choice input has focus", () => {
    const target = { tagName: "INPUT", type: "radio" };
    expect(resolveShortcut({ key: "2", target })).toEqual({ type: "select-option", index: 1 });
  });

  it("navigates questions even when a choice input has focus", () => {
    expect(resolveShortcut({ key: "ArrowRight", target: { tagName: "INPUT", type: "radio" } })).toEqual({
      type: "next-question",
    });
    expect(resolveShortcut({ key: "ArrowLeft", target: { tagName: "INPUT", type: "checkbox" } })).toEqual({
      type: "previous-question",
    });
  });

  it("ignores malformed events", () => {
    expect(resolveShortcut({ key: "" })).toBeNull();
    expect(resolveShortcut(undefined as any)).toBeNull();
  });
});
