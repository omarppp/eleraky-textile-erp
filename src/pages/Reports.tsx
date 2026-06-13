import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ClipboardList, Boxes, FileText, Factory,
  Users, AlertTriangle, TrendingDown, Printer,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card, Badge, SectionHeader, Button, Input } from '../components/ui';
import { formatDate, formatCurrency, workOrderStatusLabel, workOrderStatusBadge, warehouseLabel } from '../lib/utils';
import type { WorkOrderStatus } from '../types';

const COLORS = ['#C9963F', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const ChartTooltip: React.FC<{ active?: boolean; payload?: { name: string; value: number; fill?: string; color?: string }[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-card-lg text-sm">
      {label && <p className="text-gray-500 text-xs mb-2">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || '#C9963F' }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name.includes('مبلغ') ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const REPORT_TYPES = [
  { key: 'work_orders',  label: 'أوامر الشغل',       icon: <ClipboardList size={16} /> },
  { key: 'inventory',    label: 'المخزون',             icon: <Boxes size={16} /> },
  { key: 'invoices',     label: 'الفواتير',            icon: <FileText size={16} /> },
  { key: 'machines',     label: 'الماكينات',           icon: <Factory size={16} /> },
  { key: 'customers',    label: 'العملاء',             icon: <Users size={16} /> },
  { key: 'low_stock',    label: 'مخزون منخفض',        icon: <AlertTriangle size={16} /> },
  { key: 'delayed',      label: 'طلبات متأخرة',       icon: <TrendingDown size={16} /> },
];

export const Reports: React.FC = () => {
  const { workOrders, inventoryItems, invoices } = useData();
  const [activeReport, setActiveReport] = useState('work_orders');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const filterByDate = <T extends { createdAt?: string; date?: string }>(arr: T[]) => {
    return arr.filter(item => {
      const d = new Date(item.createdAt || item.date || '');
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo   && d > new Date(dateTo))   return false;
      return true;
    });
  };

  const handlePrint = () => window.print();

  // ---- Work Orders Report Data ----
  const woData = useMemo(() => {
    const filtered = filterByDate(workOrders);
    const byStatus = Object.keys(workOrderStatusLabel).map(s => ({
      name: workOrderStatusLabel[s as WorkOrderStatus],
      value: filtered.filter(w => w.status === s).length,
    }));
    const byMachine = Array.from({ length: 10 }, (_, i) => ({
      machine: `م${i + 1}`,
      count: filtered.filter(w => w.machineNumber === i + 1).length,
      completed: filtered.filter(w => w.machineNumber === i + 1 && (w.status === 'completed' || w.status === 'delivered')).length,
    }));
    return { filtered, byStatus, byMachine };
  }, [workOrders, dateFrom, dateTo]);

  // ---- Inventory Report Data ----
  const invData = useMemo(() => {
    const byWarehouse = [
      { name: 'اللحمة',            items: inventoryItems.filter(i => i.warehouse === 'weft'),    total: inventoryItems.filter(i => i.warehouse === 'weft').reduce((s, i) => s + i.quantity, 0) },
      { name: 'السدا',             items: inventoryItems.filter(i => i.warehouse === 'warp'),    total: inventoryItems.filter(i => i.warehouse === 'warp').reduce((s, i) => s + i.quantity, 0) },
      { name: 'نهائي',             items: inventoryItems.filter(i => i.warehouse === 'finished'),total: inventoryItems.filter(i => i.warehouse === 'finished').reduce((s, i) => s + i.quantity, 0) },
      { name: 'إعادة استخدام',    items: inventoryItems.filter(i => i.warehouse === 'reusable'),total: inventoryItems.filter(i => i.warehouse === 'reusable').reduce((s, i) => s + i.quantity, 0) },
    ];
    const lowStock = inventoryItems.filter(i => i.quantity <= i.minStock);
    return { byWarehouse, lowStock };
  }, [inventoryItems]);

  // ---- Invoices Report Data ----
  const invReport = useMemo(() => {
    const filtered = filterByDate(invoices);
    const totalRevenue = filtered.reduce((s, i) => s + i.total, 0);
    const avgInvoice   = filtered.length ? totalRevenue / filtered.length : 0;
    const byCustomer   = Object.entries(
      filtered.reduce((acc, inv) => {
        acc[inv.customerName] = (acc[inv.customerName] || 0) + inv.total;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, total }));
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const month = d.toLocaleDateString('ar-EG', { month: 'short' });
      const monthInvs = filtered.filter(inv => {
        const id = new Date(inv.date);
        return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
      });
      return { month, total: monthInvs.reduce((s, inv) => s + inv.total, 0), count: monthInvs.length };
    });
    return { filtered, totalRevenue, avgInvoice, byCustomer, monthly };
  }, [invoices, dateFrom, dateTo]);

  // ---- Customer Report ----
  const customerData = useMemo(() => {
    const customers = [...new Set(workOrders.map(w => w.customerName))];
    return customers.map(name => {
      const orders   = workOrders.filter(w => w.customerName === name);
      const invs     = invoices.filter(i => i.customerName === name);
      const revenue  = invs.reduce((s, i) => s + i.total, 0);
      const delayed  = orders.filter(w => w.status === 'delayed').length;
      return { name, orders: orders.length, invoices: invs.length, revenue, delayed };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [workOrders, invoices]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="التقارير والتحليلات"
        subtitle="عرض وطباعة جميع تقارير المصنع"
        actions={
          <Button variant="ghost" icon={<Printer size={16} />} onClick={handlePrint}>طباعة</Button>
        }
      />

      {/* Date filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-w-40" />
          <Input label="إلى تاريخ" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="min-w-40" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" onClick={() => { setDateFrom(''); setDateTo(''); }}>مسح</Button>
          )}
        </div>
      </Card>

      {/* Report Type Navigation */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(r => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${activeReport === r.key
                ? 'bg-gold text-dark-bg shadow-brand-sm'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gold/30'}`}
          >
            {r.icon}
            {r.label}
          </button>
        ))}
      </div>

      {/* ---- WORK ORDERS REPORT ---- */}
      {activeReport === 'work_orders' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center"><p className="text-3xl font-bold text-white">{woData.filtered.length}</p><p className="text-xs text-gray-500 mt-1">إجمالي الأوامر</p></Card>
            <Card className="text-center"><p className="text-3xl font-bold text-emerald-400">{woData.filtered.filter(w=>w.status==='completed'||w.status==='delivered').length}</p><p className="text-xs text-gray-500 mt-1">مكتمل</p></Card>
            <Card className="text-center"><p className="text-3xl font-bold text-amber-400">{woData.filtered.filter(w=>w.status==='in_production').length}</p><p className="text-xs text-gray-500 mt-1">في الإنتاج</p></Card>
            <Card className="text-center"><p className="text-3xl font-bold text-red-400">{woData.filtered.filter(w=>w.status==='delayed').length}</p><p className="text-xs text-gray-500 mt-1">متأخر</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card padding={false}>
              <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">توزيع الحالات</h3></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={woData.byStatus.filter(d=>d.value>0)} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {woData.byStatus.filter(d=>d.value>0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12 }} />
                    <Legend formatter={(v) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card padding={false}>
              <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">أوامر لكل ماكينة</h3></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={woData.byMachine} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                    <XAxis dataKey="machine" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="إجمالي" fill="#C9963F" radius={[4,4,0,0]} />
                    <Bar dataKey="completed" name="مكتمل" fill="#10B981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card padding={false}>
            <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">تفاصيل أوامر الشغل</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-dark-raised border-b border-dark-border">
                  {['رقم الأمر','العميل','الصنف','الكمية','المنتج','الماكينة','التسليم','الحالة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {woData.filtered.map(wo => (
                    <tr key={wo.id} className="border-b border-dark-border/50 hover:bg-dark-hover">
                      <td className="px-4 py-3 text-sm font-mono text-gold">{wo.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{wo.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.producedQuantity}</td>
                      <td className="px-4 py-3 text-sm"><Badge color="purple">م{wo.machineNumber}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(wo.expectedDelivery)}</td>
                      <td className="px-4 py-3"><span className={`badge ${workOrderStatusBadge[wo.status]}`}>{workOrderStatusLabel[wo.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ---- INVENTORY REPORT ---- */}
      {activeReport === 'inventory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {invData.byWarehouse.map((w, i) => (
              <Card key={i} className="text-center">
                <p className="text-2xl font-bold text-white">{w.total.toLocaleString('ar-EG')}</p>
                <p className="text-xs text-gray-500 mt-1">{w.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{w.items.length} مادة</p>
              </Card>
            ))}
          </div>

          <Card padding={false}>
            <div className="p-4 border-b border-dark-border">
              <h3 className="font-semibold text-white">تفاصيل المخزون الكامل</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-dark-raised border-b border-dark-border">
                  {['اسم المادة','النوع','المستودع','الكمية','الوحدة','الحد الأدنى','الحالة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {inventoryItems.map(item => (
                    <tr key={item.id} className={`border-b border-dark-border/50 hover:bg-dark-hover ${item.quantity <= item.minStock ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm"><Badge color="blue">{item.type}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-400">{warehouseLabel[item.warehouse]}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${item.quantity <= item.minStock ? 'text-red-400' : 'text-white'}`}>{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.minStock}</td>
                      <td className="px-4 py-3">
                        {item.quantity <= item.minStock
                          ? <Badge color="red"><AlertTriangle size={10} className="ml-1" />منخفض</Badge>
                          : <Badge color="green">طبيعي</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ---- INVOICES REPORT ---- */}
      {activeReport === 'invoices' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="text-center"><p className="text-3xl font-bold text-white">{invReport.filtered.length}</p><p className="text-xs text-gray-500 mt-1">إجمالي الفواتير</p></Card>
            <Card className="text-center"><p className="text-2xl font-bold text-emerald-400">{formatCurrency(invReport.totalRevenue)}</p><p className="text-xs text-gray-500 mt-1">إجمالي الإيرادات</p></Card>
            <Card className="text-center"><p className="text-2xl font-bold text-gold">{formatCurrency(invReport.avgInvoice)}</p><p className="text-xs text-gray-500 mt-1">متوسط قيمة الفاتورة</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card padding={false}>
              <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">الإيرادات الشهرية</h3></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={invReport.monthly} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                    <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="total" name="مبلغ الإيرادات" stroke="#C9963F" strokeWidth={2} dot={{ fill: '#C9963F', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card padding={false}>
              <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">أفضل العملاء</h3></div>
              <div className="p-4 space-y-3">
                {invReport.byCustomer.slice(0, 8).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-dark-raised text-xs text-gray-500 flex items-center justify-center">{i+1}</span>
                      <span className="text-sm text-gray-300">{c.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ---- CUSTOMERS REPORT ---- */}
      {activeReport === 'customers' && (
        <Card padding={false}>
          <div className="p-4 border-b border-dark-border"><h3 className="font-semibold text-white">تقرير العملاء</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-dark-raised border-b border-dark-border">
                {['العميل','أوامر الشغل','الفواتير','الإيرادات','متأخرة'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {customerData.map(c => (
                  <tr key={c.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                    <td className="px-4 py-3 text-sm font-medium text-white">{c.name}</td>
                    <td className="px-4 py-3 text-sm"><Badge color="blue">{c.orders}</Badge></td>
                    <td className="px-4 py-3 text-sm"><Badge color="gold">{c.invoices}</Badge></td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{formatCurrency(c.revenue)}</td>
                    <td className="px-4 py-3 text-sm">{c.delayed > 0 ? <Badge color="red">{c.delayed}</Badge> : <span className="text-gray-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---- LOW STOCK REPORT ---- */}
      {activeReport === 'low_stock' && (
        <div className="space-y-4">
          {invData.lowStock.length === 0 ? (
            <Card className="text-center py-16">
              <p className="text-emerald-400 text-lg font-semibold">✓ جميع المواد فوق الحد الأدنى</p>
              <p className="text-gray-500 text-sm mt-1">لا توجد مواد تحت الحد الأدنى حالياً</p>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="p-4 border-b border-dark-border flex items-center justify-between">
                <h3 className="font-semibold text-white">مواد تحت الحد الأدنى</h3>
                <Badge color="red">{invData.lowStock.length} مادة</Badge>
              </div>
              <div className="divide-y divide-dark-border/50">
                {invData.lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-xs text-gray-500">{warehouseLabel[item.warehouse]}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-bold text-red-400">{item.quantity} {item.unit}</p>
                      <p className="text-xs text-gray-500">الحد الأدنى: {item.minStock} {item.unit}</p>
                      <p className="text-xs text-red-400 font-medium">نقص: {item.minStock - item.quantity} {item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ---- DELAYED REPORT ---- */}
      {activeReport === 'delayed' && (
        <Card padding={false}>
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-white">أوامر الشغل المتأخرة</h3>
            <Badge color="red">{workOrders.filter(w=>w.status==='delayed').length} أمر</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-dark-raised border-b border-dark-border">
                {['رقم الأمر','العميل','الصنف','الكمية','تاريخ التسليم','أيام التأخير','الماكينة'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {workOrders.filter(w => w.status === 'delayed').map(wo => {
                  const delayDays = Math.abs(Math.ceil((new Date(wo.expectedDelivery).getTime() - Date.now()) / 86400000));
                  return (
                    <tr key={wo.id} className="border-b border-dark-border/50 bg-red-500/5 hover:bg-dark-hover">
                      <td className="px-4 py-3 text-sm font-mono text-gold">{wo.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{wo.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{wo.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.quantity}</td>
                      <td className="px-4 py-3 text-sm text-red-400">{formatDate(wo.expectedDelivery)}</td>
                      <td className="px-4 py-3"><Badge color="red">{delayDays} يوم</Badge></td>
                      <td className="px-4 py-3"><Badge color="purple">م{wo.machineNumber}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---- MACHINES REPORT ---- */}
      {activeReport === 'machines' && (
        <div className="space-y-5">
          {Array.from({length: 10}, (_, i) => i + 1).map(num => {
            const mWOs = workOrders.filter(w => w.machineNumber === num);
            const totalM = mWOs.reduce((s, w) => s + w.producedQuantity, 0);
            const active = mWOs.find(w => w.status === 'in_production');
            return (
              <Card key={num} padding={false}>
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-dark-raised border border-dark-border'}`}>
                      <Factory size={18} className={active ? 'text-emerald-400' : 'text-gray-500'} />
                    </div>
                    <h3 className="font-semibold text-white">ماكينة {num}</h3>
                    <Badge color={active ? 'green' : 'gray'}>{active ? 'نشطة' : 'خاملة'}</Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-gold">{totalM.toLocaleString('ar-EG')} م</p>
                    <p className="text-xs text-gray-500">إجمالي الإنتاج</p>
                  </div>
                </div>
                {mWOs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="bg-dark-raised border-b border-dark-border/50">
                        {['رقم الأمر','العميل','الكمية','المنتج','التسليم','الحالة'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-right text-xs text-gray-600 font-medium">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {mWOs.map(wo => (
                          <tr key={wo.id} className="border-b border-dark-border/30 hover:bg-dark-hover">
                            <td className="px-4 py-2.5 text-xs font-mono text-gold">{wo.orderNumber}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-300">{wo.customerName}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{wo.quantity}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{wo.producedQuantity}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(wo.expectedDelivery)}</td>
                            <td className="px-4 py-2.5"><span className={`badge text-xs ${workOrderStatusBadge[wo.status]}`}>{workOrderStatusLabel[wo.status]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {mWOs.length === 0 && (
                  <div className="p-4 text-center text-gray-600 text-sm">لا توجد أوامر شغل لهذه الماكينة</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
