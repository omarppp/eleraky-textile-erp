import type {
  WorkOrderStatus, MachineStatus, MovementType, WarehouseType,
  ImportStatus, ChequeStatus, VoucherType, PaymentMethod, UserRole,
} from '../types';

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  try { return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d)); }
  catch { return String(d); }
};

export const formatDateInput = (d: string | Date | null | undefined): string => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; }
  catch { return ''; }
};

export const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n ?? 0);

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('ar-EG').format(n ?? 0);

// ---- Work Order ----
export const workOrderStatusLabel: Record<WorkOrderStatus, string> = {
  new: 'جديد', in_production: 'في الإنتاج', waiting: 'في الانتظار',
  completed: 'مكتمل', delivered: 'تم التسليم', delayed: 'متأخر', cancelled: 'ملغي',
};
export const workOrderStatusBadge: Record<WorkOrderStatus, string> = {
  new:           'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  in_production: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  waiting:       'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  completed:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  delivered:     'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  delayed:       'bg-red-500/15 text-red-400 border border-red-500/30',
  cancelled:     'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};

// ---- Machine ----
export const machineStatusLabel: Record<MachineStatus, string> = {
  active: 'تعمل', idle: 'خاملة', maintenance: 'صيانة', stopped: 'متوقفة',
};
export const machineStatusBadge: Record<MachineStatus, string> = {
  active:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  idle:        'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  maintenance: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  stopped:     'bg-red-500/15 text-red-400 border border-red-500/30',
};

// ---- Warehouse ----
export const warehouseLabel: Record<WarehouseType, string> = {
  weft:     'مخزن خامات اللحمة',
  warp:     'مخزن خامات السدا',
  finished: 'مخزن المنتج النهائي',
  reusable: 'مخزن قابل لإعادة الاستخدام',
  poy:      'مخزن POY',
};

// ---- Movement ----
export const movementTypeLabel: Record<MovementType, string> = {
  add: 'إضافة', withdraw: 'سحب', adjust: 'تسوية', transfer: 'تحويل', auto_deduction: 'خصم تلقائي',
};
export const movementTypeBadge: Record<MovementType, string> = {
  add:            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  withdraw:       'bg-red-500/15 text-red-400 border border-red-500/30',
  adjust:         'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  transfer:       'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  auto_deduction: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

// ---- Import ----
export const importStatusLabel: Record<ImportStatus, string> = {
  planned: 'مخطط', ordered: 'تم الطلب', shipped: 'شحن', in_customs: 'في الجمارك',
  cleared: 'تم التخليص', received: 'تم الاستلام', cancelled: 'ملغي',
};
export const importStatusBadge: Record<ImportStatus, string> = {
  planned:    'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  ordered:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  shipped:    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  in_customs: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  cleared:    'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  received:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled:  'bg-red-500/15 text-red-400 border border-red-500/30',
};

// ---- Cheque ----
export const chequeStatusLabel: Record<ChequeStatus, string> = {
  pending: 'معلق', collected: 'محصّل', rejected: 'مرفوض', deposited: 'مودع',
};
export const chequeStatusBadge: Record<ChequeStatus, string> = {
  pending:   'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  collected: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  rejected:  'bg-red-500/15 text-red-400 border border-red-500/30',
  deposited: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};

// ---- Voucher ----
export const voucherTypeLabel: Record<VoucherType, string> = { receipt: 'إذن استلام', payment: 'إذن صرف' };

// ---- Payment Method ----
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'نقدي', bank: 'تحويل بنكي', instapay: 'إنستاباي',
  vodafone: 'فودافون كاش', orange: 'أورانج كاش', etisalat: 'اتصالات كاش',
  we_pay: 'WE Pay', cheque: 'شيك', other: 'أخرى',
};

// ---- Role ----
export const roleLabel: Record<UserRole, string> = {
  full_admin:      'مدير النظام الكامل',
  operations_user: 'عمليات / مبيعات',
  finance_user:    'مالية',
};

// ---- Date helpers ----
export const isOverdue = (d: string) => new Date(d) < new Date();
export const getDaysUntil = (d: string): number =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// ---- Number sequence ----
export const nextNumber = (items: { id: string }[], prefix: string): string =>
  `${prefix}-${String(items.length + 1).padStart(3, '0')}`;
