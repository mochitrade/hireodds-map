import React, { useEffect, useId, useRef, useState } from 'react';
import './select.css';

export type SelectOption = { value: string; label: string };

/** In-app select — never opens the OS/native menu. */
export function TbSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder ?? 'Select';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`tb-select${open ? ' open' : ''}${className ? ` ${className}` : ''}`}>
      <button
        id={id}
        type="button"
        className="tb-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={!selected && placeholder ? 'ph' : undefined}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul id={listId} className="tb-select-menu" role="listbox" aria-activedescendant={selected ? `${listId}-${selected.value}` : undefined}>
          {placeholder ? (
            <li
              role="option"
              aria-selected={!value}
              className={!value ? 'on' : ''}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {placeholder}
            </li>
          ) : null}
          {options.map((o) => (
            <li
              key={o.value}
              id={`${listId}-${o.value}`}
              role="option"
              aria-selected={o.value === value}
              className={o.value === value ? 'on' : ''}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.value === value ? <span className="ck" aria-hidden="true">✓</span> : <span className="ck spacer" aria-hidden="true" />}
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
