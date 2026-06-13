import React, { useState, useMemo } from 'react';
import { Plus, Printer } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, Textarea, SearchInput, Badge, SectionHeader, Table } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency, paymentMethodLabel } from '../../lib/utils';
import type { JournalEntry, JournalEntryType, PaymentMethod } from '../../types';

const typeOpts = [
  { value: 'income',   label: 'دخل' },
  { value: 'expense',  label: 'مصروف' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'manual',   label: 'قيد يدوي' },
];
const methodOpts = [
  { value: 'cash',      label: 'نقدي' },
  { value: 'bank',      label: 'تحويل بنكي' },
  { value: 'instapay',  label: 'إنستاباي' },
  { value: 'vodafone',  label: 'فودافون كاش' },
  { value: 'orange',    label: 'أورانج كاش' },
  { value: 'etisalat',  label: 'اتصالات كاش' },
  { value: 'we_pay',    label: 'WE Pay' },
  { value: 'cheque',    label: 'شيك' },
  { value: 'other',     label: 'أخرى' },
];
const typeBadge: Record<JournalEntryType, string> = {
  income:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  expense:  'bg-red-500/15 text-red-400 border border-red-500/30',
  transfer: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  manual:   'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};
const typeLabel: Record<JournalEntryType, string> = { income:'دخل', expense:'مصروف', transfer:'تحويل', manual:'قيد يدوي' };

const blank = { type:'income' as JournalEntryType, date:new Date().toISOString().split('T')[0], description:'', account:'', debit:0, credit:0, paymentMethod:'cash' as PaymentMethod, notes:'' };

export const Journal: React.FC = () => {
  const { journal, addJournalEntry } = useData();
  const { toast } = useToast();
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState(blank);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  const filtered = useMemo(() => {
    let list = [...journal].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (filter !== 'all') list = list.filter(j => j.type === filter);
    if (search) list = list.filter(j => j.description.includes(search) || j.account.includes(search));
    return list;
  }, [journal, filter, search]);

  const totals = useMemo(() => ({
    debit:  journal.reduce((s,j)=>s+j.debit,0),
    credit: journal.reduce((s,j)=>s+j.credit,0),
  }), [journal]);

  const handleSave = async () => {
    if (!form.description || !form.date) { toast('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
    await addJournalEntry(form);
    toast('تم إضافة القيد بنجاح');
    setOpen(false); setForm(blank);
  };

  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const columns = [
    { key: 'entryNumber', title: 'رقم القيد', render: (r: JournalEntry) => <span className="font-mono text-green-pale text-xs">{r.entryNumber}</span> },
    { key: 'date', title: 'التاريخ', render: (r: JournalEntry) => <span className="text-gray-400 text-xs">{formatDate(r.date)}</span> },
    { key: 'type', title: 'النوع', render: (r: JournalEntry) => <span className={`badge ${typeBadge[r.type]}`}>{typeLabel[r.type]}</span> },
    { key: 'description', title: 'البيان', render: (r: JournalEntry) => <span className="text-gray-200">{r.description}</span> },
    { key: 'account', title: 'الحساب', render: (r: JournalEntry) => <span className="text-gray-400 text-xs">{r.account}</span> },
    { key: 'debit', title: 'مدين', render: (r: JournalEntry) => r.debit > 0 ? <span className="text-emerald-400 font-semibold text-sm">{formatCurrency(r.debit)}</span> : <span className="text-gray-700">—</span> },
    { key: 'credit', title: 'دائن', render: (r: JournalEntry) => r.credit > 0 ? <span className="text-red-400 font-semibold text-sm">{formatCurrency(r.credit)}</span> : <span className="text-gray-700">—</span> },
    { key: 'paymentMethod', title: 'وسيلة', render: (r: JournalEntry) => <Badge color="gray">{paymentMethodLabel[r.paymentMethod]}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="اليومية المالية" subtitle="سجل جميع القيود المالية اليومية"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Printer size={15}/>} onClick={()=>window.print()}>طباعة</Button>
            <Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>قيد جديد</Button>
          </div>
        }/>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي المدين</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.debit)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الدائن</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totals.credit)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">الرصيد الصافي</p>
          <p className={`text-xl font-bold ${totals.debit >= totals.credit ? 'text-green-pale' : 'text-amber-400'}`}>{formatCurrency(totals.debit - totals.credit)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في اليومية..." className="w-64" />
        <div className="flex gap-1 bg-dark-surface border border-dark-border rounded-xl p-1">
          {[{v:'all',l:'الكل'},{v:'income',l:'دخل'},{v:'expense',l:'مصروف'},{v:'transfer',l:'تحويل'},{v:'manual',l:'يدوي'}].map(t=>(
            <button key={t.v} onClick={()=>setFilter(t.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter===t.v?'bg-green text-white':'text-gray-400 hover:text-white'}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا توجد قيود في اليومية" emptyIcon="📒" />

      {/* Add Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="إضافة قيد يومية" size="md"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave}>حفظ القيد</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع القيد *" value={form.type} onChange={e=>set('type',e.target.value as JournalEntryType)} options={typeOpts} />
            <Input label="التاريخ *" type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
          </div>
          <Input label="البيان *" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="وصف القيد..." />
          <Input label="اسم الحساب" value={form.account} onChange={e=>set('account',e.target.value)} placeholder="مبيعات / مصروفات / مدينون..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="مدين" type="number" value={form.debit || ''} onChange={e=>set('debit',Number(e.target.value))} placeholder="0" />
            <Input label="دائن" type="number" value={form.credit || ''} onChange={e=>set('credit',Number(e.target.value))} placeholder="0" />
          </div>
          <Select label="وسيلة الدفع" value={form.paymentMethod} onChange={e=>set('paymentMethod',e.target.value as PaymentMethod)} options={methodOpts} />
          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
