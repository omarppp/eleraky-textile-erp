import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, CheckSquare, Clock, Smartphone, BookOpen, Receipt, CreditCard, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { StatCard, Card, Badge } from '../../components/ui';
import { formatCurrency, formatDate, chequeStatusBadge, chequeStatusLabel, paymentMethodLabel } from '../../lib/utils';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export const Finance: React.FC = () => {
  const { vouchers, cheques, electronic, journal, invoices } = useData();

  const stats = useMemo(() => {
    const totalIncome  = vouchers.filter(v => v.type === 'receipt').reduce((s, v) => s + v.amount, 0)
      + electronic.filter(e => e.type === 'incoming').reduce((s, e) => s + e.netAmount, 0);
    const totalExpense = vouchers.filter(v => v.type === 'payment').reduce((s, v) => s + v.amount, 0)
      + electronic.filter(e => e.type === 'outgoing').reduce((s, e) => s + e.netAmount, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthIncome  = vouchers.filter(v => v.type === 'receipt' && v.createdAt >= monthStart).reduce((s,v)=>s+v.amount,0)
      + electronic.filter(e => e.type==='incoming' && e.createdAt >= monthStart).reduce((s,e)=>s+e.netAmount,0);
    const monthExpense = vouchers.filter(v => v.type === 'payment' && v.createdAt >= monthStart).reduce((s,v)=>s+v.amount,0)
      + electronic.filter(e => e.type==='outgoing' && e.createdAt >= monthStart).reduce((s,e)=>s+e.netAmount,0);

    const pendingCheques   = cheques.filter(c => c.status === 'pending');
    const dueCheques       = pendingCheques.filter(c => new Date(c.dueDate) <= new Date(Date.now() + 7*86400000));
    const pendingChequesTotal = pendingCheques.reduce((s,c)=>s+c.amount,0);
    const collectedCheques = cheques.filter(c => c.status === 'collected').reduce((s,c)=>s+c.amount,0);

    const invoiceTotal     = invoices.reduce((s,i)=>s+i.total,0);
    const invoicePaid      = invoices.reduce((s,i)=>s+(i.paid??0),0);
    const invoiceRemaining = invoiceTotal - invoicePaid;

    return { totalIncome, totalExpense, monthIncome, monthExpense, pendingCheques, dueCheques, pendingChequesTotal, collectedCheques, invoiceRemaining };
  }, [vouchers, electronic, cheques, invoices]);

  const recentVouchers   = [...vouchers].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  const recentElectronic = [...electronic].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  const upcomingCheques  = cheques.filter(c=>c.status==='pending').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,6);

  const quickLinks = [
    { path: '/finance/journal',    icon: <BookOpen size={20}/>,    label: 'اليومية',             count: journal.length },
    { path: '/finance/vouchers',   icon: <Receipt size={20}/>,     label: 'إذونات النقد',        count: vouchers.length },
    { path: '/finance/cheques',    icon: <CheckSquare size={20}/>, label: 'الشيكات',             count: cheques.length },
    { path: '/finance/electronic', icon: <Smartphone size={20}/>,  label: 'معاملات إلكترونية',  count: electronic.length },
    { path: '/finance/statement',  icon: <CreditCard size={20}/>,  label: 'كشف الحساب',         count: null },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة الماليات</h1>
          <p className="text-gray-500 text-sm mt-0.5">ملخص الوضع المالي — <span className="text-green-pale font-semibold">Eleraky Textile</span></p>
        </div>
        <div className="text-left text-xs text-gray-600">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </motion.div>

      {/* Quick links */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickLinks.map(l => (
          <Link key={l.path} to={l.path}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-green/30 hover:shadow-brand-sm transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center text-green-pale">{l.icon}</div>
              <p className="text-xs font-medium text-gray-300 text-center">{l.label}</p>
              {l.count !== null && <p className="text-xs text-gray-600">{l.count} سجل</p>}
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الدخل"    value={formatCurrency(stats.totalIncome)}  icon={<TrendingUp size={22}/>}  color="emerald" subtitle="كل العمليات" />
        <StatCard title="إجمالي الصرف"    value={formatCurrency(stats.totalExpense)} icon={<TrendingDown size={22}/>} color="red"    subtitle="كل العمليات" />
        <StatCard title="دخل هذا الشهر"  value={formatCurrency(stats.monthIncome)}  icon={<Wallet size={22}/>}      color="green"   subtitle={new Date().toLocaleDateString('ar-EG',{month:'long'})} />
        <StatCard title="صافي الشهر"     value={formatCurrency(stats.monthIncome - stats.monthExpense)} icon={<TrendingUp size={22}/>} color={stats.monthIncome >= stats.monthExpense ? 'emerald' : 'red'} subtitle="دخل — مصروف" />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="شيكات معلقة"     value={formatCurrency(stats.pendingChequesTotal)} icon={<Clock size={22}/>}       color="amber"   subtitle={`${stats.pendingCheques.length} شيك`} />
        <StatCard title="شيكات مستحقة"   value={stats.dueCheques.length}                   icon={<AlertTriangle size={22}/>} color="red"     subtitle="خلال 7 أيام" />
        <StatCard title="شيكات محصّلة"   value={formatCurrency(stats.collectedCheques)}    icon={<CheckSquare size={22}/>}  color="emerald" />
        <StatCard title="مستحقات عملاء"   value={formatCurrency(stats.invoiceRemaining)}    icon={<CreditCard size={22}/>}   color="gold"    subtitle="غير محصّل" />
      </motion.div>

      {/* Main content */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Vouchers */}
        <Card padding={false}>
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-white">آخر إذونات النقد</h3>
            <Link to="/finance/vouchers" className="text-xs text-green-pale hover:underline flex items-center gap-1">عرض الكل <ChevronLeft size={12}/></Link>
          </div>
          <div className="divide-y divide-dark-border/40">
            {recentVouchers.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">لا توجد إذونات</p>
            ) : recentVouchers.map(v => (
              <div key={v.id} className="px-5 py-3 hover:bg-dark-hover transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${v.type==='receipt' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {v.type==='receipt' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">{v.party}</p>
                    <p className="text-xs text-gray-500">{v.reason}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${v.type==='receipt'?'text-emerald-400':'text-red-400'}`}>{formatCurrency(v.amount)}</p>
                  <p className="text-xs text-gray-600">{formatDate(v.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Electronic */}
        <Card padding={false}>
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-semibold text-white">معاملات إلكترونية أخيرة</h3>
            <Link to="/finance/electronic" className="text-xs text-green-pale hover:underline flex items-center gap-1">عرض الكل <ChevronLeft size={12}/></Link>
          </div>
          <div className="divide-y divide-dark-border/40">
            {recentElectronic.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">لا توجد معاملات</p>
            ) : recentElectronic.map(e => (
              <div key={e.id} className="px-5 py-3 hover:bg-dark-hover transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${e.type==='incoming'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>
                    <Smartphone size={14}/>
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">{e.party}</p>
                    <p className="text-xs text-gray-500">{paymentMethodLabel[e.method]}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${e.type==='incoming'?'text-emerald-400':'text-red-400'}`}>{formatCurrency(e.netAmount)}</p>
                  <p className="text-xs text-gray-600">{formatDate(e.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Upcoming Cheques */}
      {upcomingCheques.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card padding={false}>
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">الشيكات المستحقة القريبة</h3>
                {stats.dueCheques.length > 0 && <Badge color="red" dot>{stats.dueCheques.length} مستحق خلال 7 أيام</Badge>}
              </div>
              <Link to="/finance/cheques" className="text-xs text-green-pale hover:underline flex items-center gap-1">إدارة الشيكات <ChevronLeft size={12}/></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-dark-raised border-b border-dark-border">
                  {['رقم الشيك','البنك','العميل','المبلغ','تاريخ الاستحقاق','الحالة'].map(h=>(
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {upcomingCheques.map(c => {
                    const daysLeft = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={c.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-green-pale">{c.chequeNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{c.bankName}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{c.customerName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-amber-400">{formatCurrency(c.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          <span>{formatDate(c.dueDate)}</span>
                          {daysLeft <= 7 && daysLeft >= 0 && <span className="mr-2 text-xs text-red-400">({daysLeft} أيام)</span>}
                          {daysLeft < 0 && <span className="mr-2 text-xs text-red-500">(متأخر)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${chequeStatusBadge[c.status]}`}>{chequeStatusLabel[c.status]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
