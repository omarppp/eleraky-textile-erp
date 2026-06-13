import React from 'react';
import { Database, Cloud, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AccessDenied } from '../../components/PermissionGate';

export const DataSetup: React.FC = () => {
  const { hasPermission } = useAuth();
  const {
    designs, workOrders, inventoryItems, inventoryMovements,
    invoices, customers, suppliers, purchases, imports,
    journal, vouchers, cheques, electronic,
    employees, fabricCostings, activity,
  } = useData();

  if (!hasPermission('dataSetup', 'view')) return <AccessDenied />;

  const collections = [
    { label: 'التصميمات',               icon: '🎨', count: designs.length },
    { label: 'أوامر الشغل',             icon: '📋', count: workOrders.length },
    { label: 'عناصر المخزون',           icon: '📦', count: inventoryItems.length },
    { label: 'حركات المخزون',           icon: '🔄', count: inventoryMovements.length },
    { label: 'الفواتير',                icon: '🧾', count: invoices.length },
    { label: 'العملاء',                 icon: '👥', count: customers.length },
    { label: 'الموردين',                icon: '🏭', count: suppliers.length },
    { label: 'المشتريات',               icon: '🛒', count: purchases.length },
    { label: 'الاستيراد',               icon: '🚢', count: imports.length },
    { label: 'اليومية المالية',         icon: '📒', count: journal.length },
    { label: 'إذونات النقد',            icon: '🧾', count: vouchers.length },
    { label: 'الشيكات',                 icon: '✅', count: cheques.length },
    { label: 'المعاملات الإلكترونية',   icon: '📱', count: electronic.length },
    { label: 'الموظفين',                icon: '👤', count: employees.length },
    { label: 'تكاليف القماش',           icon: '🧵', count: fabricCostings.length },
    { label: 'سجل النشاط',             icon: '📜', count: activity.length },
  ];

  const totalRecords = collections.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
          <Database size={20} className="text-green-pale" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">بيانات النظام</h1>
          <p className="text-gray-400 text-sm">قاعدة البيانات السحابية — {totalRecords.toLocaleString('ar-EG')} سجل إجمالي</p>
        </div>
      </div>

      {/* Cloud storage info */}
      <div className="bg-green/5 border border-green/20 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Cloud size={20} className="text-green-pale" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-pale mb-1">البيانات محفوظة في السحابة</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            جميع بيانات النظام مخزنة في السحابة ومتزامنة في الوقت الفعلي.
            لا توجد بيانات محلية — البيانات تُقرأ مباشرة من الخادم عند تسجيل الدخول.
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'التصميمات',   value: designs.length },
          { label: 'أوامر الشغل', value: workOrders.length },
          { label: 'العملاء',     value: customers.length },
          { label: 'الموظفين',    value: employees.length },
        ].map(s => (
          <div key={s.label} className="bg-dark-card border border-dark-border rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value.toLocaleString('ar-EG')}</p>
          </div>
        ))}
      </div>

      {/* Collection table */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-dark-border flex items-center gap-2">
          <Package size={16} className="text-green-pale" />
          <h2 className="text-sm font-bold text-white">مجموعات قاعدة البيانات</h2>
          <span className="mr-auto text-xs text-gray-500">{totalRecords.toLocaleString('ar-EG')} سجل</span>
        </div>
        <div className="divide-y divide-dark-border/50">
          {collections.map(c => (
            <div key={c.label} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{c.icon}</span>
                <p className="text-sm text-white">{c.label}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${c.count > 0 ? 'text-green-pale' : 'text-gray-600'}`}>
                {c.count.toLocaleString('ar-EG')} سجل
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
