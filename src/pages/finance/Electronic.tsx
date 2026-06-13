import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Smartphone, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, Textarea, SearchInput, ConfirmDialog, SectionHeader, Table, Tabs } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency, paymentMethodLabel } from '../../lib/utils';
import type { ElectronicTransaction, PaymentMethod } from '../../types';

const methodOpts = [
  { value: 'instapay',  label: 'إنستاباي' },
  { value: 'vodafone',  label: 'فودافون كاش' },
  { value: 'orange',    label: 'أورانج كاش' },
  { value: 'etisalat',  label: 'اتصالات كاش' },
  { value: 'we_pay',    label: 'WE Pay' },
  { value: 'bank',      label: 'تحويل بنكي' },
  { value: 'other',     label: 'أخرى' },
];
const typeOpts = [
  { value: 'incoming', label: 'وارد (استلام)' },
  { value: 'outgoing', label: 'صادر (دفع)' },
  { value: 'transfer', label: 'تحويل داخلي' },
];
const blank = {
  type: 'incoming' as ElectronicTransaction['type'],
  method: 'instapay' as PaymentMethod,
  date: new Date().toISOString().split('T')[0],
  party: '', sourceAccount: '', destinationAccount: '',
  amount: 0, fees: 0, referenceNumber: '', description: '', notes: '',
};

export const Electronic: React.FC = () => {
  const { electronic, addElectronic, deleteElectronic } = useData();
  const { toast } = useToast();
  const [tab,      setTab]      = useState<'all'|'incoming'|'outgoing'|'transfer'>('all');
  const [open,     setOpen]     = useState(false);
  const [form,     setForm]     = useState({ ...blank });
  const [search,   setSearch]   = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const filtered = useMemo(() => {
    let list = [...electronic].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (tab !== 'all') list = list.filter(e => e.type === tab);
    if (search) list = list.filter(e => e.party.includes(search) || (e.referenceNumber||'').includes(search));
    return list;
  }, [electronic, tab, search]);

  const stats = useMemo(() => ({
    incoming: electronic.filter(e=>e.type==='incoming').reduce((s,e)=>s+e.netAmount,0),
    outgoing: electronic.filter(e=>e.type==='outgoing').reduce((s,e)=>s+e.netAmount,0),
    fees:     electronic.reduce((s,e)=>s+e.fees,0),
  }), [electronic]);

  const handleSave = async () => {
    if (!form.party || !form.amount || !form.date) { toast('يرجى ملء الحقول المطلوبة', 'error'); return; }
    await addElectronic({ ...form, netAmount: form.amount - form.fees });
    toast('تم إضافة المعاملة');
    setOpen(false); setForm({ ...blank });
  };
  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const typeIcon = (type: ElectronicTransaction['type']) => {
    if (type === 'incoming') return <ArrowDownLeft size={14} className="text-emerald-400" />;
    if (type === 'outgoing') return <ArrowUpRight  size={14} className="text-red-400" />;
    return <ArrowLeftRight size={14} className="text-blue-400" />;
  };
  const typeColor = (type: ElectronicTransaction['type']) =>
    type === 'incoming' ? 'text-emerald-400' : type === 'outgoing' ? 'text-red-400' : 'text-blue-400';

  const columns = [
    { key: 'transactionNumber', title: 'رقم المعاملة', render: (r: ElectronicTransaction) => <span className="font-mono text-green-pale text-xs">{r.transactionNumber}</span> },
    { key: 'date',   title: 'التاريخ', render: (r: ElectronicTransaction) => <span className="text-gray-400 text-xs">{formatDate(r.date)}</span> },
    { key: 'type',   title: 'النوع',   render: (r: ElectronicTransaction) => (
      <div className="flex items-center gap-1.5">{typeIcon(r.type)}<span className={`text-xs font-medium ${typeColor(r.type)}`}>{typeOpts.find(t=>t.value===r.type)?.label}</span></div>
    )},
    { key: 'method', title: 'الوسيلة', render: (r: ElectronicTransaction) => (
      <div className="flex items-center gap-1.5"><Smartphone size={12} className="text-gray-500" /><span className="text-xs text-gray-400">{paymentMethodLabel[r.method]}</span></div>
    )},
    { key: 'party', title: 'الطرف', render: (r: ElectronicTransaction) => <span className="font-medium text-gray-200">{r.party}</span> },
    { key: 'amount', title: 'المبلغ', render: (r: ElectronicTransaction) => <span className={`font-bold text-sm ${typeColor(r.type)}`}>{formatCurrency(r.amount)}</span> },
    { key: 'fees',   title: 'العمولة', render: (r: ElectronicTransaction) => r.fees > 0 ? <span className="text-xs text-gray-500">{formatCurrency(r.fees)}</span> : <span className="text-gray-700">—</span> },
    { key: 'netAmount', title: 'الصافي', render: (r: ElectronicTransaction) => <span className={`font-semibold text-sm ${typeColor(r.type)}`}>{formatCurrency(r.netAmount)}</span> },
    { key: 'ref', title: 'المرجع', render: (r: ElectronicTransaction) => <span className="text-gray-600 text-xs">{r.referenceNumber||'—'}</span> },
    { key: 'actions', title: '', render: (r: ElectronicTransaction) => (
      <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
    ) },
  ];

  const tabs = [
    { key: 'all',      label: 'الكل',    count: electronic.length },
    { key: 'incoming', label: 'واردة',   count: electronic.filter(e=>e.type==='incoming').length },
    { key: 'outgoing', label: 'صادرة',   count: electronic.filter(e=>e.type==='outgoing').length },
    { key: 'transfer', label: 'تحويلات', count: electronic.filter(e=>e.type==='transfer').length },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="المعاملات الإلكترونية" subtitle="إنستاباي، فودافون، أورانج، اتصالات، تحويلات بنكية"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>معاملة جديدة</Button>} />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الوارد</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.incoming)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الصادر</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(stats.outgoing)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي العمولات</p>
          <p className="text-xl font-bold text-gray-400">{formatCurrency(stats.fees)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs tabs={tabs} active={tab} onChange={v=>setTab(v as typeof tab)} />
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." className="w-56" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا توجد معاملات إلكترونية" emptyIcon="📱" />

      <Modal open={open} onClose={()=>setOpen(false)} title="إضافة معاملة إلكترونية" size="md"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave}>حفظ</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع المعاملة *" value={form.type} onChange={e=>set('type',e.target.value as ElectronicTransaction['type'])} options={typeOpts} />
            <Select label="الوسيلة *" value={form.method} onChange={e=>set('method',e.target.value as PaymentMethod)} options={methodOpts} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="التاريخ *" type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
            <Input label={form.type==='incoming'?'المُرسِل':'المُستلِم / الجهة'} value={form.party} onChange={e=>set('party',e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="من حساب" value={form.sourceAccount} onChange={e=>set('sourceAccount',e.target.value)} placeholder="رقم الهاتف / الحساب" />
            <Input label="إلى حساب" value={form.destinationAccount} onChange={e=>set('destinationAccount',e.target.value)} placeholder="رقم الهاتف / الحساب" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="المبلغ *" type="number" value={form.amount||''} onChange={e=>set('amount',Number(e.target.value))} placeholder="0" />
            <Input label="العمولة / الرسوم" type="number" value={form.fees||''} onChange={e=>set('fees',Number(e.target.value))} placeholder="0" />
          </div>
          {form.amount > 0 && (
            <div className="bg-dark-raised border border-dark-border rounded-xl p-3 flex justify-between text-sm">
              <span className="text-gray-500">الصافي بعد العمولة:</span>
              <span className="font-bold text-green-pale">{formatCurrency(form.amount - (form.fees||0))}</span>
            </div>
          )}
          <Input label="رقم المرجع / الكود" value={form.referenceNumber} onChange={e=>set('referenceNumber',e.target.value)} placeholder="REF-..." />
          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{await deleteElectronic(deleteId!); setDeleteId(null); toast('تم الحذف');}}
        title="حذف المعاملة" message="هل تريد حذف هذه المعاملة؟" />
    </div>
  );
};
