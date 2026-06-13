import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Palette, Package, ClipboardList, FileText,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Factory, Boxes, Layers, Recycle, Archive, ChevronDown,
  Users, ShoppingCart, Ship, Wallet, BookOpen, Receipt,
  CreditCard, CheckSquare, Smartphone, UserCheck, Calculator,
  Activity, Database, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface NavItem {
  label: string; path?: string; icon: React.ReactNode;
  badge?: number; children?: NavItem[];
}

const Logo: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-border">
    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-brand-sm">
      <img src="/logo.png" alt="Eleraky Textile" className="w-full h-full object-contain bg-white p-0.5" />
    </div>
    <AnimatePresence>
      {!collapsed && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="overflow-hidden">
          <p className="text-white font-bold text-sm leading-tight tracking-wide">Eleraky Textile</p>
          <p className="text-green-pale/70 text-[10px] tracking-widest uppercase">Factory ERP</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const NavGroup: React.FC<{ item: NavItem; collapsed: boolean; depth?: number }> = ({ item, collapsed, depth = 0 }) => {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => location.pathname.startsWith(c.path || '')) || false
  );
  const isActive = item.path
    ? location.pathname === item.path
    : (item.children?.some(c => location.pathname.startsWith(c.path || '')) || false);

  if (!item.children) {
    return (
      <NavLink to={item.path!}>
        {({ isActive: active }) => (
          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 group relative
            ${active ? 'bg-green/15 text-green-pale border border-green/20' : 'text-gray-400 hover:text-white hover:bg-dark-hover'}
            ${depth > 0 ? 'mr-4 pr-3' : ''}`}>
            <span className={`flex-shrink-0 ${active ? 'text-green-pale' : 'text-gray-500 group-hover:text-gray-300'}`}>{item.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 truncate">{item.label}</motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{item.badge}</span>
            )}
            {collapsed && (
              <div className="absolute right-full mr-2 bg-dark-raised border border-dark-border text-gray-300 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </div>
            )}
          </div>
        )}
      </NavLink>
    );
  }

  return (
    <div>
      <button onClick={() => !collapsed && setOpen(p => !p)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative
          ${isActive ? 'text-green-pale' : 'text-gray-400 hover:text-white hover:bg-dark-hover'}`}>
        <span className={`flex-shrink-0 ${isActive ? 'text-green-pale' : 'text-gray-500 group-hover:text-gray-300'}`}>{item.icon}</span>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 text-right">{item.label}</motion.span>
          )}
        </AnimatePresence>
        {!collapsed && <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />}
        {collapsed && (
          <div className="absolute right-full mr-2 bg-dark-raised border border-dark-border text-gray-300 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            {item.label}
          </div>
        )}
      </button>
      <AnimatePresence>
        {open && !collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mr-4 border-r border-dark-border/50 pr-2 mt-1 space-y-0.5">
              {item.children!.map(child => <NavGroup key={child.path || child.label} item={child} collapsed={collapsed} depth={1} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { logout, hasPermission, userProfile } = useAuth();
  const { inventoryItems, workOrders, cheques, employees } = useData();

  const perm = (mod: Parameters<typeof hasPermission>[0]) => hasPermission(mod, 'view');

  const lowStock   = inventoryItems.filter(i => i.quantity <= i.minStock).length;
  const delayedWO  = workOrders.filter(w => w.status === 'delayed').length;
  const dueCheques = cheques.filter(c => c.status === 'pending' && new Date(c.dueDate) <= new Date(Date.now() + 7 * 86400000)).length;
  const activeEmp  = employees.filter(e => e.status === 'active').length;

  const operationsItems: NavItem[] = [
    perm('dashboard')     ? { label: 'لوحة التحكم',     path: '/',              icon: <LayoutDashboard size={17} /> } : null,
    perm('designs')       ? { label: 'التصميمات',       path: '/designs',       icon: <Palette size={17} /> } : null,
    perm('workOrders')    ? { label: 'أوامر الشغل',     path: '/work-orders',   icon: <ClipboardList size={17} />, badge: delayedWO } : null,
    perm('inventory')     ? {
      label: 'المستودعات', icon: <Boxes size={17} />,
      children: [
        { label: 'مخزن اللحمة',          path: '/warehouse/weft',     icon: <Package size={15} /> },
        { label: 'مخزن السدا',           path: '/warehouse/warp',     icon: <Layers size={15} /> },
        { label: 'المنتج النهائي',        path: '/warehouse/finished', icon: <Archive size={15} /> },
        { label: 'قابل إعادة الاستخدام', path: '/warehouse/reusable', icon: <Recycle size={15} /> },
        { label: 'مخزن POY',             path: '/warehouse/poy',      icon: <Package size={15} /> },
      ],
    } : null,
    perm('machines')      ? { label: 'الماكينات',       path: '/machines',      icon: <Factory size={17} />, badge: lowStock } : null,
    perm('purchases')     ? { label: 'المشتريات',       path: '/purchases',     icon: <ShoppingCart size={17} /> } : null,
    perm('import')        ? { label: 'الاستيراد',       path: '/imports',       icon: <Ship size={17} /> } : null,
    perm('employees')     ? { label: 'الموظفين',        path: '/employees',     icon: <Users size={17} />, badge: activeEmp } : null,
    perm('fabricCosting') ? { label: 'تكاليف القماش',  path: '/costing/fabric', icon: <Calculator size={17} /> } : null,
  ].filter(Boolean) as NavItem[];

  const salesItems: NavItem[] = [
    perm('customers') ? { label: 'العملاء',  path: '/customers', icon: <Users size={17} /> } : null,
    perm('invoices')  ? { label: 'الفواتير', path: '/invoices',  icon: <FileText size={17} /> } : null,
  ].filter(Boolean) as NavItem[];

  const financeItems: NavItem[] = perm('finance') ? [
    { label: 'لوحة المالية',          path: '/finance',              icon: <Wallet size={17} />, badge: dueCheques },
    { label: 'اليومية',               path: '/finance/journal',      icon: <BookOpen size={17} /> },
    { label: 'إذونات النقد',          path: '/finance/vouchers',     icon: <Receipt size={17} /> },
    { label: 'تحصيل الشيكات',        path: '/finance/cheques',      icon: <CheckSquare size={17} /> },
    { label: 'المعاملات الإلكترونية', path: '/finance/electronic',   icon: <Smartphone size={17} /> },
    { label: 'كشف الحساب',            path: '/finance/statement',    icon: <CreditCard size={17} /> },
  ] : [];

  const reportItems: NavItem[] = perm('reports')
    ? [{ label: 'التقارير', path: '/reports', icon: <BarChart3 size={17} /> }]
    : [];

  const settingsItems: NavItem[] = [
    perm('settings')         ? { label: 'إعدادات النظام',   path: '/settings',            icon: <Settings size={17} /> } : null,
    perm('accessManagement') ? { label: 'إدارة الصلاحيات', path: '/settings/access',     icon: <Shield size={17} /> } : null,
    perm('activityLogs')     ? { label: 'سجل النشاط',       path: '/settings/logs',       icon: <Activity size={17} /> } : null,
    perm('dataSetup')        ? { label: 'تهيئة البيانات',   path: '/settings/data-setup', icon: <Database size={17} /> } : null,
  ].filter(Boolean) as NavItem[];

  const renderGroup = (title: string, items: NavItem[]) => {
    if (!items.length) return null;
    return (
      <div className="mb-2">
        {!collapsed && <p className="px-3 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">{title}</p>}
        <div className="space-y-0.5">
          {items.map(item => <NavGroup key={item.path || item.label} item={item} collapsed={collapsed} />)}
        </div>
      </div>
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen bg-dark-surface border-l border-dark-border flex flex-col fixed right-0 top-0 z-40 overflow-hidden">
      <Logo collapsed={collapsed} />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0 no-scrollbar">
        {renderGroup('عمليات', operationsItems)}
        {renderGroup('مبيعات', salesItems)}
        {financeItems.length > 0 && renderGroup('مالية', financeItems)}
        {reportItems.length > 0 && renderGroup('تقارير', reportItems)}
        {settingsItems.length > 0 && renderGroup('إدارة', settingsItems)}
      </nav>

      <div className="border-t border-dark-border p-2">
        {userProfile && !collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
              <UserCheck size={13} className="text-green-pale" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{userProfile.displayName}</p>
              <p className="text-gray-500 text-[10px] truncate">{userProfile.email}</p>
            </div>
          </div>
        )}
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>

      <button onClick={onToggle}
        className="absolute -left-3 top-20 w-6 h-6 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-gray-400 hover:text-green-light hover:border-green/30 transition-all duration-200 shadow-card z-50">
        {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </motion.aside>
  );
};
