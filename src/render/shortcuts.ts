export type ShortcutAction =
  | { type: "select-option"; index: number }
  | { type: "previous-question" }
  | { type: "next-question" };

export interface ShortcutTarget {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
}

export interface ShortcutEvent {
  key: string;
  target?: ShortcutTarget | null;
}

const NON_TEXT_INPUT_TYPES = new Set(["radio", "checkbox", "button", "submit", "reset"]);

function tagOf(target?: ShortcutTarget | null): string {
  return (target?.tagName || "").toUpperCase();
}

/** Text entry surfaces own the keyboard: nothing they type may trigger a shortcut. */
function isTextEntry(target?: ShortcutTarget | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = tagOf(target);
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target.type || "text").toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

/** A digit shortcut resolved into a concrete option index for the active question. */
export interface KeyboardSelection {
  index: number;
  nonce: number;
}

export function resolveShortcut(event: ShortcutEvent): ShortcutAction | null {
  if (!event || typeof event.key !== "string") return null;
  if (isTextEntry(event.target)) return null;

  const { key } = event;
  if (key.length === 1 && key >= "1" && key <= "9") {
    return { type: "select-option", index: Number(key) - 1 };
  }
  if (key === "ArrowLeft") {
    return { type: "previous-question" };
  }
  if (key === "ArrowRight") {
    return { type: "next-question" };
  }
  return null;
}
