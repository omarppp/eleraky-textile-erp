import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ClipboardList, CheckCircle2, AlertTriangle, Factory,
  TrendingUp, TrendingDown, FileText, Boxes, Activity,
  ChevronLeft, AlertCircle, Wallet, Ship, Users, ShoppingCart,
  CheckSquare, Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { StatCard, Badge, Card } from '../components/ui';
import { formatDate, formatCurrency, workOrderStatusBadge, workOrderStatusLabel } from '../lib/utils';
import type { WorkOrderStatus, MachineStatus } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-card-lg">
      {label && <p className="text-gray-400 text-xs mb-2">{label}</p>}
      {payload.map((p: { name: string; value: number; color?: string }, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || '#1B5E2A' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { workOrders, designs, inventoryItems, invoices, activity, customers, purchases, imports, cheques, electronic, vouchers } = useData();

  const canSeeFinance   = hasPermission('finance',    'view');
  const canSeePurchases = hasPermission('purchases', 'view');
  const canSeeImports   = hasPermission('import',    'view');
  const canSeeInventory = hasPermission('inventory', 'view');
  const canSeeMachines  = hasPermission('machines',  'view');

  const stats = useMemo(() => {
    const active    = workOrders.filter(w => w.status === 'in_production').length;
    const completed = workOrders.filter(w => w.status === 'completed' || w.status === 'delivered').length;
    const delayed   = workOrders.filter(w => w.status === 'delayed').length;
    const newWO     = workOrders.filter(w => w.status === 'new').length;
    const lowStock  = inventoryItems.filter(i => i.quantity <= i.minStock);

    const machines = Array.from({ length: 10 }, (_, i) => {
      const wo = workOrders.find(w => w.machineNumber === i + 1 && w.status === 'in_production');
      return { number: i + 1, status: (wo ? 'active' : 'idle') as MachineStatus, workOrder: wo };
    });

    // Finance (only meaningful for full_admin / finance_user)
    const totalIncome  = vouchers.filter(v=>v.type==='receipt').reduce((s,v)=>s+v.amount,0)
      + electronic.filter(e=>e.type==='incoming').reduce((s,e)=>s+e.netAmount,0);
    const totalExpense = vouchers.filter(v=>v.type==='payment').reduce((s,v)=>s+v.amount,0)
      + electronic.filter(e=>e.type==='outgoing').reduce((s,e)=>s+e.netAmount,0);
    const pendingCheques = cheques.filter(c=>c.status==='pending');
    const dueCheques     = pendingCheques.filter(c=>new Date(c.dueDate)<=new Date(Date.now()+7*86400000));
    const invoiceRemaining = invoices.reduce((s,i)=>s+(i.total-(i.paid??0)),0);

    // Imports
    const inTransit = imports.filter(i=>['shipped','in_customs'].includes(i.status)).length;

    // Purchases this month
    const now = new Date();
    const purchasesThisMonth = purchases.filter(p=>{
      const d = new Date(p.purchaseDate);
      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d   = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const mon = d.toLocaleDateString('ar-EG', { month: 'short' });
      const wos = workOrders.filter(w => {
        const cd = new Date(w.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      });
      const invs = invoices.filter(inv => {
        const cd = new Date(inv.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      });
      return { month: mon, 'أوامر الشغل': wos.length, 'مبيعات': invs.reduce((s,inv)=>s+inv.total,0) };
    });

    const statusData = [
      { name: 'جديد',       value: newWO,    color: '#3B82F6' },
      { name: 'في الإنتاج', value: active,   color: '#F59E0B' },
      { name: 'مكتمل',      value: completed, color: '#10B981' },
      { name: 'متأخر',      value: delayed,  color: '#EF4444' },
    ].filter(s => s.value > 0);

    const warehouseData = [
      { name: 'اللحمة',  value: inventoryItems.filter(i=>i.warehouse==='weft').reduce((s,i)=>s+i.quantity,0) },
      { name: 'السدا',   value: inventoryItems.filter(i=>i.warehouse==='warp').reduce((s,i)=>s+i.quantity,0) },
      { name: 'نهائي',   value: inventoryItems.filter(i=>i.warehouse==='finished').reduce((s,i)=>s+i.quantity,0) },
      { name: 'POY',     value: inventoryItems.filter(i=>i.warehouse==='poy').reduce((s,i)=>s+i.quantity,0) },
    ];

    return {
      total: workOrders.length, active, completed, delayed, newWO, lowStock, machines,
      totalIncome, totalExpense, pendingCheques, dueCheques, invoiceRemaining, inTransit,
      purchasesThisMonth, monthlyData, statusData, warehouseData,
    };
  }, [workOrders, inventoryItems, invoices, vouchers, electronic, cheques, purchases, imports]);

  const recentWorkOrders = [...workOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  const allActivity      = [...activity].sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  const recentActivity   = canSeeFinance
    ? allActivity.slice(0, 8)
    : allActivity.filter(a => a.type !== 'finance' && a.type !== 'invoice').slice(0, 8);
  const upcomingCheques  = cheques.filter(c=>c.status==='pending').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,4);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'مدير النظام';

  // Show operational section only if at least one item is visible
  const showOpsSection = canSeePurchases || canSeeImports || canSeeFinance;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Hero Header */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl border border-dark-border">
        <div className="absolute inset-0">
          <img src="/ppp.png" alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-l from-dark-bg via-dark-bg/80 to-transparent" />
        </div>
        <div className="relative z-10 flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">مرحباً، {displayName}</h1>
              <p className="text-gray-400 text-sm mt-0.5">لوحة التحكم الرئيسية — <span className="text-green-pale font-semibold">Eleraky Textile</span></p>
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs text-gray-500">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {canSeeFinance && stats.dueCheques.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400 font-semibold">
                <AlertTriangle size={12} />
                <span>{stats.dueCheques.length} شيك مستحق خلال 7 أيام</span>
              </div>
            )}
            {stats.lowStock.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400">
                <AlertCircle size={12} />
                <span>{stats.lowStock.length} صنف مخزون منخفض</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Production KPIs — visible to all */}
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">الإنتاج</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="قيد الإنتاج"     value={stats.active}    icon={<Activity size={22}/>}      color="blue"   subtitle="ماكينات نشطة" />
          <StatCard title="مكتمل ومُسلَّم"  value={stats.completed} icon={<CheckCircle2 size={22}/>}  color="green"  subtitle="أوامر منجزة" />
          <StatCard title="متأخر"            value={stats.delayed}   icon={<AlertTriangle size={22}/>} color="red"    subtitle="يحتاج اهتمام" />
          <StatCard title="التصاميم"         value={designs.length}  icon={<TrendingUp size={22}/>}    color="purple" subtitle="تصميم مسجل" />
        </div>
      </motion.div>

      {/* Finance KPIs — full_admin and finance_user only */}
      {canSeeFinance && (
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">الماليات</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="إجمالي الدخل"    value={formatCurrency(stats.totalIncome)}  icon={<TrendingUp size={22}/>}    color="emerald" />
            <StatCard title="إجمالي الصرف"    value={formatCurrency(stats.totalExpense)} icon={<TrendingDown size={22}/>}  color="red" />
            <StatCard title="شيكات معلقة"     value={stats.pendingCheques.length}        icon={<CheckSquare size={22}/>}   color="amber"  subtitle={formatCurrency(stats.pendingCheques.reduce((s,c)=>s+c.amount,0))} />
            <StatCard title="مستحقات عملاء"   value={formatCurrency(stats.invoiceRemaining)} icon={<Wallet size={22}/>}   color="gold"   subtitle="غير محصّل" />
          </div>
        </motion.div>
      )}

      {/* Operations KPIs — filtered per role */}
      {showOpsSection && (
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">العمليات</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="العملاء" value={customers.length} icon={<Users size={22}/>} color="blue" />
            {canSeePurchases && (
              <StatCard title="المشتريات" value={formatCurrency(purchases.reduce((s,p)=>s+p.finalCost,0))} icon={<ShoppingCart size={22}/>} color="amber" subtitle={`${purchases.length} فاتورة`} />
            )}
            {canSeeImports && (
              <StatCard title="شحنات في الطريق" value={stats.inTransit} icon={<Ship size={22}/>} color="blue" subtitle="استيراد نشط" />
            )}
            {canSeeFinance && (
              <StatCard title="معاملات إلكترونية" value={electronic.length} icon={<Smartphone size={22}/>} color="purple" />
            )}
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {canSeeFinance ? 'الإنتاج والمبيعات الشهرية' : 'أوامر الشغل الشهرية'}
            </h3>
            <Badge color="green">آخر 6 أشهر</Badge>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="gWO"   x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1B5E2A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1B5E2A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9963F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9963F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A22" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="أوامر الشغل" stroke="#3AAE5A" strokeWidth={2} fill="url(#gWO)" />
                {canSeeFinance && (
                  <Area type="monotone" dataKey="مبيعات" stroke="#C9963F" strokeWidth={2} fill="url(#gSales)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-5 border-b border-dark-border">
            <h3 className="font-semibold text-white">توزيع أوامر الشغل</h3>
          </div>
          <div className="p-5">
            {stats.statusData.length === 0 ? (
              <div className="h-[130px] flex flex-col items-center justify-center text-gray-600">
                <ClipboardList size={30} className="opacity-20 mb-2" />
                <p className="text-xs">لا توجد أوامر شغل</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                      dataKey="value" paddingAngle={3}>
                      {stats.statusData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111E13', border: '1px solid #1E3A22', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {stats.statusData.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs text-gray-400">{s.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Inventory + Machines — role gated */}
      {(canSeeInventory || canSeeMachines) && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {canSeeInventory && (
            <Card padding={false}>
              <div className="p-5 border-b border-dark-border flex items-center justify-between">
                <h3 className="font-semibold text-white">ملخص المخزون</h3>
                <Link to="/warehouse/weft" className="text-xs text-green-pale hover:underline flex items-center gap-1">عرض <ChevronLeft size={12}/></Link>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={stats.warehouseData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3A22" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="الكمية (كيلو)" fill="#1B5E2A" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                {stats.lowStock.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1"><AlertTriangle size={11}/>مخزون منخفض:</p>
                    {stats.lowStock.slice(0,3).map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-400">{item.name}</span>
                        <Badge color="amber">{item.quantity} {item.unit}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {canSeeMachines && (
            <Card padding={false}>
              <div className="p-5 border-b border-dark-border flex items-center justify-between">
                <h3 className="font-semibold text-white">حالة الماكينات</h3>
                <Link to="/machines" className="text-xs text-green-pale hover:underline flex items-center gap-1">إدارة <ChevronLeft size={12}/></Link>
              </div>
              <div className="p-4 grid grid-cols-5 gap-2">
                {stats.machines.map(m => (
                  <Link key={m.number} to="/machines">
                    <motion.div whileHover={{ scale: 1.05 }}
                      className={`relative rounded-xl p-2 text-center cursor-pointer border
                        ${m.status === 'active'
                          ? 'bg-green/10 border-green/30'
                          : 'bg-dark-raised border-dark-border'}`}>
                      <div className={`w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center
                        ${m.status === 'active' ? 'bg-green/20' : 'bg-dark-hover'}`}>
                        <Factory size={14} className={m.status === 'active' ? 'text-green-pale' : 'text-gray-600'} />
                      </div>
                      <p className="text-xs font-bold text-white">{m.number}</p>
                      <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${m.status === 'active' ? 'bg-green-pale animate-pulse' : 'bg-gray-600'}`} />
                    </motion.div>
                  </Link>
                ))}
              </div>
              <div className="px-5 pb-4 flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2 h-2 rounded-full bg-green-pale"/>نشطة ({stats.machines.filter(m=>m.status==='active').length})</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2 h-2 rounded-full bg-gray-600"/>خاملة ({stats.machines.filter(m=>m.status==='idle').length})</span>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Upcoming Cheques — finance users only */}
      {canSeeFinance && upcomingCheques.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card padding={false}>
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">شيكات مستحقة قريباً</h3>
                {stats.dueCheques.length > 0 && <Badge color="red" dot>{stats.dueCheques.length} هذا الأسبوع</Badge>}
              </div>
              <Link to="/finance/cheques" className="text-xs text-green-pale hover:underline flex items-center gap-1">إدارة الشيكات <ChevronLeft size={12}/></Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-x-reverse divide-dark-border">
              {upcomingCheques.map(c => {
                const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={c.id} className="p-4">
                    <p className="text-xs text-gray-500">{c.bankName}</p>
                    <p className="font-semibold text-gray-200 text-sm">{c.customerName}</p>
                    <p className="font-bold text-amber-400 mt-1">{formatCurrency(c.amount)}</p>
                    <p className={`text-xs mt-1 ${days <= 3 ? 'text-red-400 font-bold' : days <= 7 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {days < 0 ? 'متأخر!' : days === 0 ? 'اليوم!' : `${days} أيام`}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Work Orders + Activity */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-white">أحدث أوامر الشغل</h3>
            <Link to="/work-orders" className="text-xs text-green-pale hover:underline flex items-center gap-1">عرض الكل <ChevronLeft size={12}/></Link>
          </div>
          {recentWorkOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <ClipboardList size={36} className="opacity-20 mb-3" />
              <p className="text-sm font-medium text-gray-500">لا توجد أوامر شغل بعد</p>
              <p className="text-xs text-gray-600 mt-1">أضف أول أمر شغل من قسم أوامر الشغل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-raised">
                    {['رقم الأمر','العميل','الماكينة','التسليم','الحالة'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentWorkOrders.map(wo => (
                    <tr key={wo.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-green-pale">{wo.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{wo.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">ماكينة {wo.machineNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(wo.expectedDelivery)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${workOrderStatusBadge[wo.status as WorkOrderStatus]}`}>
                          {workOrderStatusLabel[wo.status as WorkOrderStatus]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-5 border-b border-dark-border">
            <h3 className="font-semibold text-white">آخر الأنشطة</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-600">
              <Activity size={28} className="opacity-20 mb-2" />
              <p className="text-xs text-gray-500">لا يوجد نشاط بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/40">
              {recentActivity.map(a => (
                <div key={a.id} className="px-4 py-3 hover:bg-dark-hover transition-colors">
                  <div className="flex gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                      ${a.type==='work_order'?'bg-amber-500/10 text-amber-400'
                      : a.type==='finance'   ?'bg-green/10 text-green-pale'
                      : a.type==='customer'  ?'bg-blue-500/10 text-blue-400'
                      : a.type==='import'    ?'bg-cyan-500/10 text-cyan-400'
                      : a.type==='purchase'  ?'bg-orange-500/10 text-orange-400'
                      : a.type==='invoice'   ?'bg-emerald-500/10 text-emerald-400'
                      : 'bg-purple-500/10 text-purple-400'}`}>
                      {a.type==='work_order'?<ClipboardList size={13}/>
                       :a.type==='finance'  ?<Wallet size={13}/>
                       :a.type==='customer' ?<Users size={13}/>
                       :a.type==='import'   ?<Ship size={13}/>
                       :a.type==='purchase' ?<ShoppingCart size={13}/>
                       :a.type==='invoice'  ?<FileText size={13}/>
                       :<Boxes size={13}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-relaxed truncate">{a.description}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(a.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
};
