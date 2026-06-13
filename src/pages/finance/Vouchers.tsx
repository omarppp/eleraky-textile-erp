import React, { useState, useMemo, useRef } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, Textarea, SearchInput, ConfirmDialog, SectionHeader, Tabs, Table } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency, paymentMethodLabel } from '../../lib/utils';
import type { CashVoucher, VoucherType, PaymentMethod } from '../../types';

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
const partyOpts = [
  { value: 'customer', label: 'عميل' },
  { value: 'supplier', label: 'مورد' },
  { value: 'employee', label: 'موظف' },
  { value: 'other',    label: 'أخرى' },
];

const blank = {
  type: 'receipt' as VoucherType, date: new Date().toISOString().split('T')[0],
  amount: 0, party: '', partyType: 'customer' as CashVoucher['partyType'],
  reason: '', paymentMethod: 'cash' as PaymentMethod,
  receivedBy: '', approvedBy: '', notes: '',
};

export const Vouchers: React.FC = () => {
  const { vouchers, addVoucher, deleteVoucher } = useData();
  const { toast } = useToast();
  const [tab,     setTab]     = useState<'receipt'|'payment'>('receipt');
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState({ ...blank });
  const [search,  setSearch]  = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [printing, setPrinting] = useState<CashVoucher|null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = vouchers.filter(v => v.type === tab).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if (search) list = list.filter(v => v.party.includes(search) || v.reason.includes(search));
    return list;
  }, [vouchers, tab, search]);

  const totals = useMemo(() => ({
    receipt: vouchers.filter(v=>v.type==='receipt').reduce((s,v)=>s+v.amount,0),
    payment: vouchers.filter(v=>v.type==='payment').reduce((s,v)=>s+v.amount,0),
  }), [vouchers]);

  const handleSave = async () => {
    if (!form.party || !form.reason || !form.amount) { toast('يرجى ملء الحقول المطلوبة', 'error'); return; }
    await addVoucher({ ...form, type: tab });
    toast(tab==='receipt' ? 'تم إنشاء إذن الاستلام' : 'تم إنشاء إذن الصرف');
    setOpen(false); setForm({ ...blank });
  };

  const handlePrint = (v: CashVoucher) => { setPrinting(v); setTimeout(()=>window.print(), 300); };
  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const columns = [
    { key: 'voucherNumber', title: 'رقم الإذن', render: (r: CashVoucher) => <span className="font-mono text-green-pale text-xs">{r.voucherNumber}</span> },
    { key: 'date',   title: 'التاريخ', render: (r: CashVoucher) => <span className="text-gray-400 text-xs">{formatDate(r.date)}</span> },
    { key: 'party',  title: tab==='receipt'?'المستلم منه':'المدفوع له', render: (r: CashVoucher) => <span className="font-medium text-gray-200">{r.party}</span> },
    { key: 'reason', title: 'السبب', render: (r: CashVoucher) => <span className="text-gray-400 text-xs">{r.reason}</span> },
    { key: 'amount', title: 'المبلغ', render: (r: CashVoucher) => <span className={`font-bold text-sm ${tab==='receipt'?'text-emerald-400':'text-red-400'}`}>{formatCurrency(r.amount)}</span> },
    { key: 'paymentMethod', title: 'الوسيلة', render: (r: CashVoucher) => <span className="text-gray-500 text-xs">{paymentMethodLabel[r.paymentMethod]}</span> },
    { key: 'actions', title: 'إجراءات', render: (r: CashVoucher) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" icon={<Printer size={13}/>} onClick={()=>handlePrint(r)} />
        <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="إذونات النقد" subtitle="استلام ومدفوعات نقدية"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>{tab==='receipt'?'إذن استلام':'إذن صرف'} جديد</Button>} />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الاستلامات</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totals.receipt)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي المدفوعات</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.payment)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs tabs={[{key:'receipt',label:'إذونات الاستلام',count:vouchers.filter(v=>v.type==='receipt').length},{key:'payment',label:'إذونات الصرف',count:vouchers.filter(v=>v.type==='payment').length}]}
          active={tab} onChange={v=>setTab(v as 'receipt'|'payment')} />
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." className="w-56" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا توجد إذونات" emptyIcon="🧾" />

      {/* Add Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title={tab==='receipt'?'إذن استلام نقدي':'إذن صرف نقدي'} size="md"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave}>حفظ الإذن</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="التاريخ *" type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
            <Input label="المبلغ (جنيه) *" type="number" value={form.amount||''} onChange={e=>set('amount',Number(e.target.value))} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={tab==='receipt'?'المستلم منه *':'المدفوع له *'} value={form.party} onChange={e=>set('party',e.target.value)} />
            <Select label="نوع الطرف" value={form.partyType} onChange={e=>set('partyType',e.target.value as CashVoucher['partyType'])} options={partyOpts} />
          </div>
          <Input label="سبب / البيان *" value={form.reason} onChange={e=>set('reason',e.target.value)} />
          <Select label="وسيلة الدفع" value={form.paymentMethod} onChange={e=>set('paymentMethod',e.target.value as PaymentMethod)} options={methodOpts} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={tab==='receipt'?'استلم بواسطة':'اعتمد بواسطة'} value={tab==='receipt'?form.receivedBy:form.approvedBy}
              onChange={e=>set(tab==='receipt'?'receivedBy':'approvedBy',e.target.value)} />
          </div>
          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />
        </div>
      </Modal>

      {/* Print Voucher */}
      {printing && (
        <div ref={printRef} className="hidden print:block fixed inset-0 bg-white p-8 z-[200] print:relative print:inset-auto" dir="rtl">
          <div className="max-w-md mx-auto border-2 border-gray-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="" className="w-12 h-12 object-contain" />
                <div><h3 className="font-bold text-gray-800 tracking-wide">Eleraky Textile</h3><p className="text-xs text-gray-500">Threads That Inspire, Fabrics That Last</p></div>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{printing.type==='receipt'?'إذن استلام نقدي':'إذن صرف نقدي'}</p>
                <p className="text-sm text-gray-500">رقم: {printing.voucherNumber}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span className="font-medium">{formatDate(printing.date)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{printing.type==='receipt'?'استُلم من:':'صُرف لـ:'}</span><span className="font-bold text-lg">{printing.party}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المبلغ:</span><span className="font-bold text-xl text-green-700">{formatCurrency(printing.amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الوسيلة:</span><span>{paymentMethodLabel[printing.paymentMethod]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">البيان:</span><span>{printing.reason}</span></div>
              {printing.notes && <div className="flex justify-between"><span className="text-gray-500">ملاحظات:</span><span>{printing.notes}</span></div>}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center text-xs text-gray-500">
              <div className="border-t border-dashed border-gray-300 pt-8">{printing.type==='receipt'?'توقيع المستلم':'توقيع المعتمد'}</div>
              <div className="border-t border-dashed border-gray-300 pt-8">توقيع العميل / المورد</div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={async()=>{await deleteVoucher(deleteId!);setDeleteId(null);toast('تم الحذف');}}
        title="حذف الإذن" message="هل تريد حذف هذا الإذن؟ لا يمكن التراجع." />
    </div>
  );
};
