'use client';

import { cloneElement, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from 'react';

const controlClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 transition focus:border-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100';

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'quiet' }) {
  const variants = {
    primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    secondary: 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    quiet: 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800',
  };
  return <button className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function FormField({ id, label, description, error, required, children }: {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }>;
}) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const control = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    required,
  };

  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-800">{label}{required && <span aria-hidden="true"> *</span>}</label>
    {cloneElement(children, control)}
    {description && <p id={descriptionId} className="text-sm text-slate-600">{description}</p>}
    {error && <p id={errorId} className="text-sm text-red-700" role="alert">{error}</p>}
  </div>;
}

export type TableColumn<Row> = { key: string; header: ReactNode; render: (row: Row) => ReactNode; className?: string };

export function Table<Row>({ columns, rows, getRowKey, caption, emptyMessage = 'No results.' }: {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  caption: string;
  emptyMessage?: string;
}) {
  return <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500"><tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3.5 ${column.className ?? ''}`}>{column.header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => <tr key={getRowKey(row)} className="align-top transition-colors hover:bg-emerald-50/40">{columns.map((column) => <td key={column.key} className={`px-4 py-3.5 ${column.className ?? ''}`}>{column.render(row)}</td>)}</tr>) : <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-10 text-center text-slate-600">{emptyMessage}</td></tr>}
      </tbody>
    </table>
  </div>;
}

export function Pagination({ page, pageSize, total, onPageChange, disabled = false }: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm text-slate-600">{start}-{end} of {total}</p>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">Previous</Button>
      <span className="flex min-h-10 items-center px-2 text-sm text-slate-700" aria-live="polite">Page {page} of {totalPages}</span>
      <Button variant="secondary" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">Next</Button>
    </div>
  </nav>;
}

const badgeVariants = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-emerald-100 text-emerald-800',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof badgeVariants }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeVariants[tone]}`}>{children}</span>;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="py-8 text-sm text-slate-600" role="status" aria-live="polite">{label}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <section className="py-8 text-center" aria-label={title}><h2 className="text-base font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}{action && <div className="mt-4">{action}</div>}</section>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><span>{message}</span>{retry && <Button variant="secondary" onClick={retry}>Retry</Button>}</div>;
}

export function Dialog({ open, title, description, onClose, children, footer }: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => { if (open) onClose(); }} className="m-auto w-[min(34rem,calc(100%-2rem))] max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
    <div className="p-5 sm:p-6"><header className="mb-5"><h2 id={titleId} className="text-lg font-semibold">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-slate-600">{description}</p>}</header>
      <div>{children}</div>{footer && <footer className="mt-6 flex justify-end gap-2">{footer}</footer>}
    </div>
  </dialog>;
}
