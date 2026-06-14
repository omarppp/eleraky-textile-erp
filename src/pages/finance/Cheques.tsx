import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, SearchInput, ConfirmDialog, SectionHeader, Table, Tabs } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency, chequeStatusLabel, chequeStatusBadge } from '../../lib/utils';
import type { Cheque, ChequeStatus } from '../../types';

const statusOpts = [
  { value: 'pending',   label: 'معلق' },
  { value: 'collected', label: 'محصّل' },
  { value: 'rejected',  label: 'مرفوض' },
  { value: 'deposited', label: 'مودع' },
];
const blank = {
  chequeNumber: '', bankName: '', customerName: '',
  amount: 0, issueDate: new Date().toISOString().split('T')[0],
  dueDate: '', status: 'pending' as ChequeStatus, notes: '',
};

export const Cheques: React.FC = () => {
  const { cheques, addCheque, updateCheque, deleteCheque } = useData();
  const { toast } = useToast();
  const [tab,      setTab]      = useState<ChequeStatus|'all'>('all');
  const [open,     setOpen]     = useState(false);
  const [form,     setForm]     = useState({ ...blank });
  const [search,   setSearch]   = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [saving,   setSaving]   = useState(false);

  const filtered = useMemo(() => {
    let list = [...cheques].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
    if (tab !== 'all') list = list.filter(c => c.status === tab);
    if (search) list = list.filter(c => c.customerName.includes(search) || c.chequeNumber.includes(search) || c.bankName.includes(search));
    return list;
  }, [cheques, tab, search]);

  const totals = useMemo(() => {
    const byStatus = (s: ChequeStatus) => cheques.filter(c=>c.status===s).reduce((acc,c)=>acc+c.amount,0);
    return {
      pending:   byStatus('pending'),
      collected: byStatus('collected'),
      deposited: byStatus('deposited'),
      rejected:  byStatus('rejected'),
    };
  }, [cheques]);

  const handleSave = async () => {
    if (!form.chequeNumber || !form.customerName || !form.amount || !form.dueDate) {
      toast('يرجى ملء الحقول المطلوبة', 'error'); return;
    }
    setSaving(true);
    try {
      await addCheque(form);
      toast('تم إضافة الشيك');
      setOpen(false); setForm({ ...blank });
    } catch {
      toast('حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: ChequeStatus) => {
    try {
      await updateCheque(id, { status });
      toast(status === 'collected' ? 'تم تحصيل الشيك ✓' : 'تم تحديث الحالة');
    } catch {
      toast('حدث خطأ أثناء تحديث الحالة.', 'error');
    }
  };

  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const columns = [
    { key: 'chequeNumber', title: 'رقم الشيك', render: (r: Cheque) => <span className="font-mono text-green-pale text-xs">{r.chequeNumber}</span> },
    { key: 'bankName',     title: 'البنك',      render: (r: Cheque) => (
      <div className="flex items-center gap-2"><Building2 size={13} className="text-gray-500" /><span className="text-sm text-gray-300">{r.bankName}</span></div>
    )},
    { key: 'customerName', title: 'العميل',    render: (r: Cheque) => <span className="font-medium text-gray-200">{r.customerName}</span> },
    { key: 'amount',       title: 'المبلغ',    render: (r: Cheque) => <span className="font-bold text-amber-400">{formatCurrency(r.amount)}</span> },
    { key: 'issueDate',    title: 'تاريخ الإصدار', render: (r: Cheque) => <span className="text-gray-400 text-xs">{formatDate(r.issueDate)}</span> },
    { key: 'dueDate',      title: 'تاريخ الاستحقاق', render: (r: Cheque) => {
      const days = Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
      return (
        <div>
          <span className="text-gray-300 text-xs">{formatDate(r.dueDate)}</span>
          {r.status === 'pending' && days <= 7 && days >= 0 && <span className="block text-xs text-red-400">({days} أيام)</span>}
          {r.status === 'pending' && days < 0 && <span className="block text-xs text-red-500 font-semibold">متأخر!</span>}
        </div>
      );
    }},
    { key: 'status', title: 'الحالة', render: (r: Cheque) => (
      <span className={`badge ${chequeStatusBadge[r.status]}`}>{chequeStatusLabel[r.status]}</span>
    )},
    { key: 'actions', title: 'إجراءات', render: (r: Cheque) => (
      <div className="flex items-center gap-1">
        {r.status === 'pending' && <>
          <Button variant="ghost" size="sm" icon={<CheckCircle size={13} className="text-emerald-400"/>} onClick={()=>changeStatus(r.id,'collected')} title="محصّل" />
          <Button variant="ghost" size="sm" icon={<XCircle size={13} className="text-red-400"/>} onClick={()=>changeStatus(r.id,'rejected')} title="مرفوض" />
        </>}
        <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
      </div>
    )},
  ];

  const statusTabs = [
    { key: 'all',       label: 'الكل',    count: cheques.length },
    { key: 'pending',   label: 'معلقة',   count: cheques.filter(c=>c.status==='pending').length },
    { key: 'collected', label: 'محصّلة',  count: cheques.filter(c=>c.status==='collected').length },
    { key: 'deposited', label: 'مودعة',   count: cheques.filter(c=>c.status==='deposited').length },
    { key: 'rejected',  label: 'مرفوضة', count: cheques.filter(c=>c.status==='rejected').length },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="تحصيل الشيكات" subtitle="إدارة الشيكات الواردة والمستحقة"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>إضافة شيك</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">معلقة</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(totals.pending)}</p>
          <p className="text-xs text-gray-600 mt-1">{cheques.filter(c=>c.status==='pending').length} شيك</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">محصّلة</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.collected)}</p>
          <p className="text-xs text-gray-600 mt-1">{cheques.filter(c=>c.status==='collected').length} شيك</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">مودعة</p>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(totals.deposited)}</p>
          <p className="text-xs text-gray-600 mt-1">{cheques.filter(c=>c.status==='deposited').length} شيك</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">مرفوضة</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totals.rejected)}</p>
          <p className="text-xs text-gray-600 mt-1">{cheques.filter(c=>c.status==='rejected').length} شيك</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs tabs={statusTabs} active={tab} onChange={v => setTab(v as ChequeStatus|'all')} />
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالعميل / رقم الشيك / البنك..." className="w-64" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r => r.id}
        emptyText="لا توجد شيكات" emptyIcon="🏦" />

      <Modal open={open} onClose={()=>setOpen(false)} title="إضافة شيك جديد" size="md"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الشيك'}</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الشيك *" value={form.chequeNumber} onChange={e=>set('chequeNumber',e.target.value)} placeholder="CHK-001" />
            <Input label="اسم البنك *" value={form.bankName} onChange={e=>set('bankName',e.target.value)} placeholder="البنك الأهلي..." />
          </div>
          <Input label="اسم العميل *" value={form.customerName} onChange={e=>set('customerName',e.target.value)} />
          <Input label="المبلغ (جنيه) *" type="number" value={form.amount||''} onChange={e=>set('amount',Number(e.target.value))} placeholder="0" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ الإصدار *" type="date" value={form.issueDate} onChange={e=>set('issueDate',e.target.value)} />
            <Input label="تاريخ الاستحقاق *" type="date" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)} />
          </div>
          <Select label="الحالة" value={form.status} onChange={e=>set('status',e.target.value as ChequeStatus)} options={statusOpts} />
          <Input label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{ try { await deleteCheque(deleteId!); setDeleteId(null); toast('تم الحذف'); } catch { toast('حدث خطأ أثناء الحذف.', 'error'); } }}
        title="حذف الشيك" message="هل تريد حذف هذا الشيك؟" />
    </div>
  );
};
