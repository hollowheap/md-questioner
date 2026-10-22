import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { transitions } from "./motion.js";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

interface Placement {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  above: boolean;
}

const POPUP_MAX_HEIGHT = 280;

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [highlighted, setHighlighted] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const above = spaceBelow < POPUP_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.max(96, Math.min(POPUP_MAX_HEIGHT, above ? spaceAbove : spaceBelow));
    const next = {
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight,
      top: above ? undefined : rect.bottom + 6,
      bottom: above ? window.innerHeight - rect.top + 6 : undefined,
      above,
    };
    // Avoid a re-render on every scroll frame when nothing moved.
    setPlacement((prev) =>
      prev &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight &&
      prev.top === next.top &&
      prev.bottom === next.bottom &&
      prev.above === next.above
        ? prev
        : next
    );
  }, []);

  const close = useCallback((focusTrigger = false) => {
    setIsOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    measure();
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [disabled, measure, selectedIndex]);

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      onChange(option.value);
      close(true);
    },
    [close, onChange, options]
  );

  useLayoutEffect(() => {
    if (!isOpen) return;
    measure();
    listRef.current?.focus();
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onReflow = () => measure();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [isOpen, close, measure]);

  useEffect(() => {
    if (!isOpen || highlighted < 0) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted, isOpen]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) open();
    }
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((index) => Math.min(options.length - 1, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        event.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(highlighted);
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div className="mdq-select">
      <button
        ref={triggerRef}
        type="button"
        className="mdq-select-trigger"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={label}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? "mdq-select-value" : "mdq-select-placeholder"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="mdq-select-chevron" aria-hidden="true" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && placement && (
              <motion.div
                key="mdq-select-popup"
                ref={listRef}
                id={listId}
                data-testid="mdq-select-popup"
                role="listbox"
                tabIndex={-1}
                aria-label={label}
                aria-activedescendant={
                  highlighted >= 0 ? `${listId}-option-${highlighted}` : undefined
                }
                className="mdq-select-popup"
                style={{
                  left: placement.left,
                  width: placement.width,
                  maxHeight: placement.maxHeight,
                  top: placement.top,
                  bottom: placement.bottom,
                }}
                initial={{ opacity: 0, y: placement.above ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: placement.above ? 4 : -4, scale: 0.98 }}
                transition={transitions.fast}
                onKeyDown={onListKeyDown}
              >
                {options.map((option, index) => (
                  <button
                    key={`${option.value}-${index}`}
                    id={`${listId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    data-index={index}
                    data-highlighted={index === highlighted ? "true" : "false"}
                    className="mdq-select-option"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => choose(index)}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default Select;
