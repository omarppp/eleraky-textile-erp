import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, Download } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from '../../components/PermissionGate';
import type { ActivityItem } from '../../types';

const TYPE_LABELS: Record<ActivityItem['type'], string> = {
  work_order: 'أوامر الشغل',
  inventory:  'المستودع',
  invoice:    'الفواتير',
  design:     'التصميمات',
  purchase:   'المشتريات',
  import:     'الاستيراد',
  finance:    'المالية',
  customer:   'العملاء',
  employee:   'الموظفين',
  costing:    'التكاليف',
};

const TYPE_COLORS: Record<ActivityItem['type'], string> = {
  work_order: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  inventory:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  invoice:    'bg-green/10 text-green-pale border border-green/20',
  design:     'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  purchase:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  import:     'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  finance:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  customer:   'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  employee:   'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  costing:    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
};

export const ActivityLogs: React.FC = () => {
  const { hasPermission } = useAuth();
  const { activity } = useData();

  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityItem['type'] | 'all'>('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 50;

  const canView = hasPermission('activityLogs', 'view');
  const canExport = hasPermission('activityLogs', 'export');

  const filtered = useMemo(() => {
    return [...activity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(item => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (search && !item.description.includes(search) && !item.action.includes(search)) return false;
        if (dateFrom && item.timestamp < dateFrom) return false;
        if (dateTo   && item.timestamp > dateTo + 'T23:59:59') return false;
        return true;
      });
  }, [activity, typeFilter, search, dateFrom, dateTo]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > page * PAGE_SIZE;

  const handleExport = () => {
    const rows = [
      ['الوقت', 'النوع', 'الإجراء', 'الوصف'],
      ...filtered.map(i => [
        new Date(i.timestamp).toLocaleString('ar-EG'),
        TYPE_LABELS[i.type] ?? i.type,
        i.action,
        i.description,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!canView) return <AccessDenied />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
            <Activity size={20} className="text-green-pale" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">سجل النشاط</h1>
            <p className="text-gray-400 text-sm">{filtered.length} سجل من أصل {activity.length}</p>
          </div>
        </div>
        {canExport && filtered.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-pale border border-dark-border rounded-xl px-3 py-2 hover:border-green/30 transition-colors">
            <Download size={14} /> تصدير CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-44 relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث في النشاط..."
              className="w-full bg-dark-surface border border-dark-border rounded-xl pr-9 pl-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as ActivityItem['type'] | 'all'); setPage(1); }}
            className="bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green/50">
            <option value="all">كل الأنواع</option>
            {(Object.keys(TYPE_LABELS) as ActivityItem['type'][]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green/50" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green/50" />
          {(search || typeFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-red-400 border border-dark-border rounded-xl px-3 py-2 transition-colors">
              مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Activity size={32} className="mx-auto mb-3 opacity-30" />
            <p>لا يوجد نشاط مسجل</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {paginated.map((item, i) => (
              <motion.div key={item.id + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-dark-hover/20 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${TYPE_COLORS[item.type]}`}>
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-green-pale text-xs font-bold">{item.action}</span>
                    <span className="text-gray-300 text-sm truncate">{item.description}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-gray-500 text-xs">
                    {new Date(item.timestamp).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-gray-600 text-[10px]">
                    {new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="text-center">
          <button onClick={() => setPage(p => p + 1)}
            className="text-sm text-gray-400 hover:text-green-pale border border-dark-border rounded-xl px-6 py-2 hover:border-green/30 transition-colors">
            تحميل المزيد ({filtered.length - paginated.length} متبقي)
          </button>
        </div>
      )}
    </div>
  );
};
