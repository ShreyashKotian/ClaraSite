/**
 * A themed select.
 *
 * A native <select> draws its option list with the operating system, so on a
 * dark page it opens as a white panel with the OS highlight colour — nothing
 * CSS can reach. This renders the list itself so it matches the app, while
 * keeping the keyboard behaviour people expect from a select.
 */

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronIcon } from "./icons";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string };

export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled,
}: {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Which option the keyboard is on, which is not the same as the chosen one.
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      const elTop = activeEl.offsetTop;
      const elBottom = elTop + activeEl.offsetHeight;
      const listTop = listRef.current.scrollTop;
      const listBottom = listTop + listRef.current.clientHeight;
      if (elTop < listTop) {
        listRef.current.scrollTop = elTop;
      } else if (elBottom > listBottom) {
        listRef.current.scrollTop = elBottom - listRef.current.clientHeight;
      }
    }
  }, [open, activeIndex]);

  // Opening seeds the keyboard onto the current choice rather than the top of
  // the list. This has to happen here and not in an effect: callers build the
  // options array inline, so an effect watching it would re-run on every parent
  // render — and the mic meter re-renders every animation frame — wiping out
  // whatever the arrow keys had just selected.
  function openList() {
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>{selected?.label ?? placeholder}</span>
        <span className={styles.chevron} data-open={open}>
          <ChevronIcon size={16} />
        </span>
      </button>

      {open && (
        <div className={styles.list} role="listbox" ref={listRef} tabIndex={-1}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              className={styles.option}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {option.value === value && <CheckIcon size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
