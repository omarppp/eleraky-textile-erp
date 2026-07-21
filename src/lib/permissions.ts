import type { UserRole, PermissionModule } from '../types';

export const ROLE_MODULES: Record<UserRole, PermissionModule[]> = {
  full_admin: [
    'dashboard', 'designs', 'workOrders', 'customers', 'employees',
    'inventory', 'purchases', 'fabricCosting', 'import', 'finance',
    'invoices', 'reports', 'machines', 'settings', 'accessManagement',
    'activityLogs', 'dataSetup',
  ],
  // Tashgheel — production & operational, NO financial data
  operations_user: [
    'dashboard', 'designs', 'workOrders', 'customers',
    'employees', 'inventory', 'machines',
  ],
  // Marketing & Sales — customer-facing, NO financial data
  marketing_user: [
    'dashboard', 'designs', 'workOrders', 'customers',
  ],
  // Finance — financial modules only
  finance_user: [
    'dashboard', 'finance', 'invoices', 'reports', 'customers',
  ],
};

export function canAccessModule(role: UserRole, module: PermissionModule): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

// Financial data (prices, invoices, totals) — visible to full_admin & finance_user only
export const FINANCE_ROLES: UserRole[] = ['full_admin', 'finance_user'];
export function canViewFinance(role: UserRole): boolean {
  return FINANCE_ROLES.includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  full_admin:      'مدير النظام الكامل',
  operations_user: 'تشغيل',
  marketing_user:  'ماركتينج / مبيعات',
  finance_user:    'مالية',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  full_admin:      'bg-green/15 text-green-pale border border-green/30',
  operations_user: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  marketing_user:  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  finance_user:    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard:        'لوحة التحكم',
  designs:          'التصميمات',
  workOrders:       'أوامر الشغل',
  customers:        'العملاء',
  employees:        'الموظفين',
  inventory:        'المستودعات',
  purchases:        'المشتريات',
  fabricCosting:    'تكاليف القماش',
  import:           'الاستيراد',
  finance:          'المالية',
  invoices:         'الفواتير',
  reports:          'التقارير',
  machines:         'الماكينات',
  settings:         'الإعدادات',
  accessManagement: 'إدارة الصلاحيات',
  activityLogs:     'سجلات النشاط',
  dataSetup:        'تهيئة البيانات',
};
