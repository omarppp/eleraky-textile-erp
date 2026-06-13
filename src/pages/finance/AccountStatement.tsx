import React, { useState, useMemo } from 'react';
import { Printer, Search } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Select, SectionHeader } from '../../components/ui';
import { formatDate, formatCurrency } from '../../lib/utils';

type PartyType = 'customer' | 'supplier';

interface StatRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  source: string;
}

export const AccountStatement: React.FC = () => {
  const { customers, suppliers, invoices, vouchers, cheques } = useData();
  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [partyId,   setPartyId]   = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  const partyOpts = useMemo(() => {
    const list = partyType === 'customer'
      ? customers.map(c => ({ value: c.id, label: c.name }))
      : suppliers.map(s => ({ value: s.id, label: s.name }));
    return [{ value: '', label: '— اختر —' }, ...list];
  }, [partyType, customers, suppliers]);

  const selectedParty = useMemo(() => {
    if (!partyId) return null;
    return partyType === 'customer'
      ? customers.find(c => c.id === partyId)
      : suppliers.find(s => s.id === partyId);
  }, [partyId, partyType, customers, suppliers]);

  const rows: StatRow[] = useMemo(() => {
    if (!partyId || !selectedParty) return [];
    const items: StatRow[] = [];

    if (partyType === 'customer') {
      const openingBalance = (selectedParty as typeof customers[0]).openingBalance ?? 0;
      if (openingBalance !== 0) {
        items.push({ date: '2000-01-01', description: 'رصيد أول المدة', debit: openingBalance, credit: 0, balance: 0, source: 'opening' });
      }

      invoices.filter(i => i.customerName === selectedParty.name).forEach(inv => {
        items.push({ date: inv.date, description: `فاتورة رقم ${inv.invoiceNumber} — ${inv.customerName}`, debit: inv.total, credit: inv.paid ?? 0, balance: 0, source: 'invoice' });
      });

      vouchers.filter(v => v.party === selectedParty.name && v.type === 'receipt').forEach(v => {
        items.push({ date: v.date, description: `إذن استلام ${v.voucherNumber} — ${v.reason}`, debit: 0, credit: v.amount, balance: 0, source: 'voucher' });
      });

      cheques.filter(c => c.customerName === selectedParty.name && (c.status === 'collected' || c.status === 'deposited')).forEach(ch => {
        items.push({ date: ch.dueDate, description: `شيك رقم ${ch.chequeNumber} — ${ch.bankName}`, debit: 0, credit: ch.amount, balance: 0, source: 'cheque' });
      });
    }

    let sorted = items.sort((a, b) => a.date.localeCompare(b.date));

    if (dateFrom) sorted = sorted.filter(r => r.date >= dateFrom);
    if (dateTo)   sorted = sorted.filter(r => r.date <= dateTo);

    let running = 0;
    return sorted.map(r => {
      running = running + r.debit - r.credit;
      return { ...r, balance: running };
    });
  }, [partyId, selectedParty, partyType, invoices, vouchers, cheques, dateFrom, dateTo]);

  const summary = useMemo(() => ({
    totalDebit:  rows.reduce((s,r)=>s+r.debit,0),
    totalCredit: rows.reduce((s,r)=>s+r.credit,0),
    netBalance:  rows.length > 0 ? rows[rows.length - 1].balance : 0,
  }), [rows]);

  return (
    <div className="space-y-5">
      <SectionHeader title="كشف الحساب" subtitle="تفصيل حركات العملاء والموردين"
        actions={<Button variant="ghost" size="sm" icon={<Printer size={15}/>} onClick={()=>window.print()}>طباعة</Button>} />

      {/* Filters */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Select label="نوع الطرف" value={partyType} onChange={e=>{ setPartyType(e.target.value as PartyType); setPartyId(''); }}
          options={[{value:'customer',label:'عميل'},{value:'supplier',label:'مورد'}]} />
        <Select label={partyType==='customer'?'اختر العميل':'اختر المورد'} value={partyId} onChange={e=>setPartyId(e.target.value)} options={partyOpts} />
        <div className="space-y-1">
          <label className="text-xs text-gray-500 block">من تاريخ</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 block">إلى تاريخ</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green/50" />
        </div>
      </div>

      {!partyId ? (
        <div className="bg-dark-card border border-dark-border rounded-xl p-16 text-center">
          <Search size={40} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-500">اختر عميلاً أو مورداً لعرض كشف الحساب</p>
        </div>
      ) : (
        <>
          {/* Party Info + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">بيانات الطرف</p>
              <p className="font-bold text-white text-lg">{selectedParty?.name}</p>
              {'phone' in (selectedParty || {}) && <p className="text-sm text-gray-400">{(selectedParty as {phone?: string}).phone}</p>}
              {'companyName' in (selectedParty || {}) && (selectedParty as {companyName?: string}).companyName && (
                <p className="text-xs text-gray-500">{(selectedParty as {companyName?: string}).companyName}</p>
              )}
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">إجمالي المدين</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(summary.totalDebit)}</p>
                </div>
                <div className="w-px h-10 bg-dark-border" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">إجمالي الدائن</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(summary.totalCredit)}</p>
                </div>
              </div>
            </div>
            <div className={`border rounded-xl p-4 text-center flex flex-col items-center justify-center ${summary.netBalance > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <p className="text-xs text-gray-500 mb-1">الرصيد الصافي</p>
              <p className={`text-2xl font-black ${summary.netBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(Math.abs(summary.netBalance))}</p>
              <p className="text-xs text-gray-500 mt-1">{summary.netBalance > 0 ? 'مستحق للشركة' : summary.netBalance < 0 ? 'مستحق للطرف' : 'متسوية'}</p>
            </div>
          </div>

          {/* Statement Table */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-dark-border print:hidden">
              <h3 className="font-semibold text-white">حركة الحساب — {selectedParty?.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-raised border-b border-dark-border">
                    {['التاريخ','البيان','مدين (له)','دائن (عليه)','الرصيد'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-600">لا توجد حركات في هذه الفترة</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="border-b border-dark-border/40 hover:bg-dark-hover transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-gray-200">{r.description}</td>
                      <td className="px-4 py-3">
                        {r.debit > 0 ? <span className="text-red-400 font-semibold">{formatCurrency(r.debit)}</span> : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.credit > 0 ? <span className="text-emerald-400 font-semibold">{formatCurrency(r.credit)}</span> : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${r.balance > 0 ? 'text-red-400' : r.balance < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {formatCurrency(Math.abs(r.balance))}
                          {r.balance !== 0 && <span className="text-xs mr-1">{r.balance > 0 ? 'م' : 'د'}</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-dark-raised border-t-2 border-dark-border">
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-300">الإجمالي</td>
                    <td className="px-4 py-3 font-bold text-red-400">{formatCurrency(summary.totalDebit)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(summary.totalCredit)}</td>
                    <td className="px-4 py-3 font-bold text-white">{formatCurrency(Math.abs(summary.netBalance))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
