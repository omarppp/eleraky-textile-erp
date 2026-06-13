import type { UserRole, PermissionModule } from '../types';

// Fixed module access per role — no custom permissions
export const ROLE_MODULES: Record<UserRole, PermissionModule[]> = {
  full_admin: [
    'dashboard', 'designs', 'workOrders', 'customers', 'employees',
    'inventory', 'purchases', 'fabricCosting', 'import', 'finance',
    'invoices', 'reports', 'machines', 'settings', 'accessManagement',
    'activityLogs', 'dataSetup',
  ],
  operations_user: [
    'dashboard', 'designs', 'workOrders', 'customers', 'employees',
    'inventory', 'purchases', 'fabricCosting', 'import',
    'invoices', 'reports', 'machines',
  ],
  finance_user: [
    'dashboard', 'finance', 'invoices', 'customers',
    'fabricCosting', 'import', 'reports', 'activityLogs',
  ],
};

export function canAccessModule(role: UserRole, module: PermissionModule): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  full_admin:      'مدير النظام الكامل',
  operations_user: 'عمليات / مبيعات',
  finance_user:    'مالية',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  full_admin:      'bg-green/15 text-green-pale border border-green/30',
  operations_user: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
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
