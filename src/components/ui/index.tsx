import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, XCircle, ChevronDown, Search, Loader2 } from 'lucide-react';

// =====================================================================
// BUTTON
// =====================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'gold' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, iconPosition = 'start',
  children, disabled, className = '', ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-green text-white hover:bg-green-light shadow-brand-sm hover:shadow-brand',
    ghost:   'border border-dark-border text-gray-300 hover:border-green hover:text-green-light hover:bg-green/5',
    danger:  'bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30',
    success: 'bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/30',
    gold:    'bg-gold text-dark-bg hover:bg-gold-light shadow-gold-sm hover:shadow-gold',
    outline: 'border border-green/40 text-green-light hover:bg-green/10',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3 text-base' };
  return (
    <button disabled={disabled || loading} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
       : icon && iconPosition === 'start' && <span>{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'end' && <span>{icon}</span>}
    </button>
  );
};

// =====================================================================
// BADGE
// =====================================================================
interface BadgeProps { children: React.ReactNode; color?: 'green'|'gold'|'red'|'blue'|'amber'|'purple'|'teal'|'gray'|'emerald'; className?: string; dot?: boolean; }

export const Badge: React.FC<BadgeProps> = ({ children, color = 'green', className = '', dot }) => {
  const colors: Record<string, string> = {
    green:   'bg-green/15 text-green-pale border border-green/25',
    gold:    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    red:     'bg-red-500/15 text-red-400 border border-red-500/30',
    blue:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    amber:   'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    purple:  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    teal:    'bg-teal-500/15 text-teal-400 border border-teal-500/30',
    gray:    'bg-gray-500/15 text-gray-400 border border-gray-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  };
  const dotColors: Record<string, string> = {
    green: 'bg-green-pale', gold: 'bg-amber-400', red: 'bg-red-400', blue: 'bg-blue-400',
    amber: 'bg-amber-400', purple: 'bg-purple-400', teal: 'bg-teal-400', gray: 'bg-gray-400', emerald: 'bg-emerald-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.gray} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] ?? 'bg-gray-400'} animate-pulse`} />}
      {children}
    </span>
  );
};

// =====================================================================
// CARD
// =====================================================================
interface CardProps { children: React.ReactNode; className?: string; hover?: boolean; glow?: boolean; padding?: boolean; }
export const Card: React.FC<CardProps> = ({ children, className = '', hover, glow, padding = true }) => (
  <div className={`bg-dark-card border border-dark-border rounded-xl shadow-card
    ${hover ? 'transition-all duration-300 hover:border-green/30 hover:shadow-brand-sm cursor-pointer' : ''}
    ${glow ? 'border-green/25 shadow-brand-sm' : ''}
    ${padding ? 'p-5' : ''} ${className}`}>
    {children}
  </div>
);

// =====================================================================
// STAT CARD
// =====================================================================
interface StatCardProps {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; trend?: { value: number; label: string };
  color?: 'green' | 'gold' | 'blue' | 'red' | 'purple' | 'amber' | 'emerald';
  className?: string;
}
export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color = 'green', className = '' }) => {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    green:   { bg: 'bg-green/10',    border: 'border-green/20',    icon: 'text-green-pale' },
    gold:    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400' },
    blue:    { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  icon: 'text-blue-400'  },
    red:     { bg: 'bg-red-500/10',   border: 'border-red-500/20',   icon: 'text-red-400'   },
    purple:  { bg: 'bg-purple-500/10',border: 'border-purple-500/20',icon: 'text-purple-400'},
    amber:   { bg: 'bg-orange-500/10',border: 'border-orange-500/20',icon: 'text-orange-400'},
    emerald: { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',icon:'text-emerald-400'},
  };
  const c = colors[color] ?? colors.green;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden bg-dark-card border border-dark-border rounded-xl p-5 shadow-card
        transition-all duration-300 hover:border-green/25 hover:shadow-brand-sm ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-dark-raised opacity-50" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-gray-600">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`${c.bg} ${c.border} border rounded-xl p-3 ${c.icon}`}>{icon}</div>
      </div>
    </motion.div>
  );
};

// =====================================================================
// INPUT
// =====================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: React.ReactNode; hint?: string; }
export const Input: React.FC<InputProps> = ({ label, error, icon, hint, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
      <input className={`w-full bg-dark-surface border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-1
        ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-dark-border focus:border-green focus:ring-green/20'}
        ${icon ? 'pr-10' : ''} ${className}`} {...props} />
    </div>
    {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// =====================================================================
// TEXTAREA
// =====================================================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; }
export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
    <textarea className={`w-full bg-dark-surface border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none transition-all duration-200 focus:outline-none focus:ring-1
      ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-dark-border focus:border-green focus:ring-green/20'} ${className}`}
      rows={3} {...props} />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// =====================================================================
// SELECT
// =====================================================================
interface SelectOption { value: string; label: string }
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; options: SelectOption[]; placeholder?: string; }
export const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
    <div className="relative">
      <select className={`w-full bg-dark-surface border rounded-lg px-4 py-2.5 text-sm text-gray-200 appearance-none cursor-pointer transition-all duration-200 pr-10 focus:outline-none focus:ring-1
        ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-dark-border focus:border-green focus:ring-green/20'} ${className}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// =====================================================================
// SEARCH INPUT
// =====================================================================
interface SearchInputProps { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; }
export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'بحث...', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-dark-surface border border-dark-border rounded-lg pr-10 pl-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20 transition-all duration-200" />
  </div>
);

// =====================================================================
// MODAL
// =====================================================================
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'; footer?: React.ReactNode; }
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md', footer }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`bg-dark-card border border-dark-border rounded-2xl shadow-card-lg w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
            <div className="flex items-center justify-between p-5 border-b border-dark-border flex-shrink-0">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-hover"><X size={18} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{children}</div>
            {footer && <div className="p-5 border-t border-dark-border flex-shrink-0">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =====================================================================
// CONFIRM DIALOG
// =====================================================================
interface ConfirmDialogProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; loading?: boolean; }
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, onClose, onConfirm, title, message, confirmText = 'تأكيد الحذف', loading }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <AlertTriangle className="text-red-400" size={28} />
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
      <div className="flex gap-3 w-full mt-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>إلغاء</Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </div>
  </Modal>
);

// =====================================================================
// TOAST SYSTEM
// =====================================================================
export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: string; type: ToastType; message: string; }
interface ToastContextType { toast: (msg: string, type?: ToastType, dur?: number) => void; }
const ToastContext = React.createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (message: string, type: ToastType = 'success', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  };
  const icons = { success: <CheckCircle size={18} />, error: <XCircle size={18} />, warning: <AlertTriangle size={18} />, info: <Info size={18} /> };
  const colors = { success: 'border-green/30 text-green-pale', error: 'border-red-500/30 text-red-400', warning: 'border-amber-500/30 text-amber-400', info: 'border-blue-500/30 text-blue-400' };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -60, scale: 0.9 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-dark-card shadow-card-lg pointer-events-auto ${colors[t.type]}`}>
              {icons[t.type]}
              <span className="text-sm font-medium text-gray-200">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};

// =====================================================================
// TABLE
// =====================================================================
interface Column<T> { key: string; title: string; render?: (row: T, idx: number) => React.ReactNode; width?: string; align?: 'right'|'left'|'center'; }
interface TableProps<T> { columns: Column<T>[]; data: T[]; loading?: boolean; emptyText?: string; emptyIcon?: React.ReactNode; rowKey: (r: T) => string; onRowClick?: (r: T) => void; }
export function Table<T>({ columns, data, loading, emptyText = 'لا توجد بيانات', emptyIcon, rowKey, onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dark-border">
      <table className="w-full">
        <thead>
          <tr className="bg-dark-raised border-b border-dark-border">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{ width: col.width, textAlign: col.align || 'right' }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-dark-border/50">
              {columns.map(col => <td key={col.key} className="px-4 py-3"><div className="h-4 shimmer-bg rounded" /></td>)}
            </tr>
          )) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-16">
              <div className="flex flex-col items-center gap-3">
                {emptyIcon && <div className="text-gray-700 text-4xl">{emptyIcon}</div>}
                <p className="text-gray-600 text-sm">{emptyText}</p>
              </div>
            </td></tr>
          ) : data.map((row, idx) => (
            <motion.tr key={rowKey(row)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
              className={`border-b border-dark-border/50 transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-dark-hover' : 'hover:bg-dark-hover/50'}`}
              onClick={() => onRowClick?.(row)}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-300" style={{ textAlign: col.align || 'right' }}>
                  {col.render ? col.render(row, idx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================================
// SPINNER / PAGE LOADING
// =====================================================================
export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <Loader2 className={`animate-spin text-green-light ${className}`} size={size} />
);

export const PageLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-green/30 border-t-green animate-spin" />
      <p className="text-gray-500 text-sm">جارٍ التحميل...</p>
    </div>
  </div>
);

// =====================================================================
// EMPTY STATE
// =====================================================================
interface EmptyStateProps { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="w-20 h-20 rounded-2xl bg-dark-raised border border-dark-border flex items-center justify-center text-gray-600">
      {icon}
    </div>
    <div>
      <h3 className="text-white font-semibold text-lg">{title}</h3>
      {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </motion.div>
);

// =====================================================================
// SECTION HEADER
// =====================================================================
interface SectionHeaderProps { title: string; subtitle?: string; actions?: React.ReactNode; className?: string; }
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

// =====================================================================
// PROGRESS BAR
// =====================================================================
interface ProgressBarProps { value: number; max?: number; color?: 'green'|'gold'|'blue'|'red'; showLabel?: boolean; size?: 'sm'|'md'; }
export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'green', showLabel, size = 'md' }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const colors = { green: 'bg-green-light', gold: 'bg-amber-400', blue: 'bg-blue-400', red: 'bg-red-400' };
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-dark-raised rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${colors[color]}`} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8 text-left">{pct}%</span>}
    </div>
  );
};

// =====================================================================
// TABS
// =====================================================================
interface TabItem { key: string; label: string; count?: number }
interface TabsProps { tabs: TabItem[]; active: string; onChange: (k: string) => void; className?: string; }
export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-1 bg-dark-surface border border-dark-border rounded-xl p-1 flex-wrap ${className}`}>
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          active === t.key ? 'bg-green text-white shadow-brand-sm' : 'text-gray-400 hover:text-white hover:bg-dark-hover'}`}>
        {t.label}
        {t.count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === t.key ? 'bg-white/20' : 'bg-dark-raised'}`}>{t.count}</span>}
      </button>
    ))}
  </div>
);

// =====================================================================
// DIVIDER / TOOLTIP
// =====================================================================
export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`border-t border-dark-border ${className}`} />;

interface TooltipProps { children: React.ReactNode; text: string; }
export const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-raised border border-dark-border text-xs text-gray-300 px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
