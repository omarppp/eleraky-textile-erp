import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Eye, Phone, MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Button, Modal, Input, Textarea, SearchInput, ConfirmDialog, SectionHeader, Table, Badge } from '../components/ui';
import { useToast } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import type { Customer } from '../types';

const blank: Omit<Customer, 'id'|'createdAt'|'updatedAt'> = {
  name: '', phone: '', phone2: '', address: '', companyName: '', email: '',
  openingBalance: 0, notes: '',
};

export const Customers: React.FC = () => {
  const { customers, invoices, vouchers, cheques, addCustomer, deleteCustomer } = useData();
  const { toast } = useToast();
  const [open,     setOpen]     = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Customer|null>(null);
  const [form,     setForm]     = useState({ ...blank });
  const [search,   setSearch]   = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const filtered = useMemo(() => {
    let list = [...customers].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    if (search) list = list.filter(c => c.name.includes(search) || (c.phone||'').includes(search) || (c.companyName||'').includes(search));
    return list;
  }, [customers, search]);

  const getBalance = (c: Customer) => {
    const invoiceTotal = invoices.filter(i=>i.customerName===c.name).reduce((s,i)=>s+i.total,0);
    const invoicePaid  = invoices.filter(i=>i.customerName===c.name).reduce((s,i)=>s+(i.paid??0),0);
    const voucherPaid  = vouchers.filter(v=>v.party===c.name&&v.type==='receipt').reduce((s,v)=>s+v.amount,0);
    const chequesPaid  = cheques.filter(ch=>ch.customerName===c.name&&(ch.status==='collected'||ch.status==='deposited')).reduce((s,ch)=>s+ch.amount,0);
    return invoiceTotal + (c.openingBalance ?? 0) - invoicePaid - voucherPaid - chequesPaid;
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast('الاسم والهاتف مطلوبان', 'error'); return; }
    await addCustomer(form);
    toast('تم إضافة العميل');
    setOpen(false); setForm({ ...blank });
  };

  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleView = (c: Customer) => { setSelected(c); setViewOpen(true); };

  const selectedInvoices = useMemo(() => selected ? invoices.filter(i=>i.customerName===selected.name) : [], [selected, invoices]);
  const selectedVouchers  = useMemo(() => selected ? vouchers.filter(v=>v.party===selected.name) : [], [selected, vouchers]);
  const selectedCheques   = useMemo(() => selected ? cheques.filter(c=>c.customerName===selected.name) : [], [selected, cheques]);

  const columns = [
    { key: 'name', title: 'الاسم', render: (r: Customer) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center text-green-pale font-bold">{r.name.charAt(0)}</div>
        <div><p className="font-semibold text-gray-200">{r.name}</p>{r.companyName && <p className="text-xs text-gray-500">{r.companyName}</p>}</div>
      </div>
    )},
    { key: 'phone', title: 'الهاتف', render: (r: Customer) => (
      <div className="flex items-center gap-1.5"><Phone size={12} className="text-gray-600"/><span className="text-gray-300 text-sm">{r.phone}</span></div>
    )},
    { key: 'address', title: 'العنوان', render: (r: Customer) => (
      r.address ? <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-600"/><span className="text-gray-400 text-xs">{r.address}</span></div> : <span className="text-gray-700">—</span>
    )},
    { key: 'balance', title: 'الرصيد المستحق', render: (r: Customer) => {
      const bal = getBalance(r);
      return <span className={`font-bold text-sm ${bal > 0 ? 'text-amber-400' : bal < 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{formatCurrency(Math.abs(bal))}{bal > 0 ? ' م' : bal < 0 ? ' د' : ''}</span>;
    }},
    { key: 'invoices', title: 'الفواتير', render: (r: Customer) => {
      const cnt = invoices.filter(i=>i.customerName===r.name).length;
      return cnt > 0 ? <Badge color="green">{cnt} فاتورة</Badge> : <span className="text-gray-700">—</span>;
    }},
    { key: 'actions', title: '', render: (r: Customer) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" icon={<Eye size={13}/>} onClick={()=>handleView(r)}>عرض</Button>
        <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="العملاء" subtitle={`${customers.length} عميل مسجل`}
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>عميل جديد</Button>} />

      <div className="flex gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." className="w-72" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا يوجد عملاء" emptyIcon="👥" />

      {/* Add Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="إضافة عميل جديد" size="md"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave}>حفظ العميل</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم *" value={form.name} onChange={e=>set('name',e.target.value)} />
            <Input label="الهاتف *" value={form.phone} onChange={e=>set('phone',e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="هاتف إضافي" value={form.phone2} onChange={e=>set('phone2',e.target.value)} />
            <Input label="البريد الإلكتروني" value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>
          <Input label="اسم الشركة" value={form.companyName} onChange={e=>set('companyName',e.target.value)} />
          <Textarea label="العنوان" value={form.address} onChange={e=>set('address',e.target.value)} rows={2} />
          <Input label="الرصيد الافتتاحي (جنيه)" type="number" value={form.openingBalance||''} onChange={e=>set('openingBalance',Number(e.target.value))} placeholder="0" />
          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />
        </div>
      </Modal>

      {/* View Customer Modal */}
      {selected && (
        <Modal open={viewOpen} onClose={()=>setViewOpen(false)} title={`ملف العميل — ${selected.name}`} size="lg">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-dark-raised rounded-xl border border-dark-border">
              <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center text-2xl font-bold text-green-pale">{selected.name.charAt(0)}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                {selected.companyName && <p className="text-gray-400 text-sm">{selected.companyName}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  {selected.phone && <span className="flex items-center gap-1"><Phone size={12}/>{selected.phone}</span>}
                  {selected.phone2 && <span className="flex items-center gap-1"><Phone size={12}/>{selected.phone2}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">الرصيد المستحق</p>
                <p className={`text-2xl font-black ${getBalance(selected)>0?'text-amber-400':'text-emerald-400'}`}>{formatCurrency(Math.abs(getBalance(selected)))}</p>
                <p className="text-xs text-gray-500">{getBalance(selected)>0?'مستحق على العميل':'مستحق للعميل'}</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">الفواتير</p>
                <p className="text-2xl font-bold text-white">{selectedInvoices.length}</p>
                <p className="text-xs text-gray-600">{formatCurrency(selectedInvoices.reduce((s,i)=>s+i.total,0))}</p>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">المدفوعات</p>
                <p className="text-2xl font-bold text-emerald-400">{selectedVouchers.filter(v=>v.type==='receipt').length}</p>
                <p className="text-xs text-gray-600">{formatCurrency(selectedVouchers.filter(v=>v.type==='receipt').reduce((s,v)=>s+v.amount,0))}</p>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">الشيكات</p>
                <p className="text-2xl font-bold text-amber-400">{selectedCheques.length}</p>
                <p className="text-xs text-gray-600">{formatCurrency(selectedCheques.reduce((s,c)=>s+c.amount,0))}</p>
              </div>
            </div>

            {/* Recent Invoices */}
            {selectedInvoices.length > 0 && (
              <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                <p className="p-3 text-sm font-semibold text-white border-b border-dark-border">الفواتير الأخيرة</p>
                <table className="w-full text-xs">
                  <thead><tr className="bg-dark-raised"><th className="px-3 py-2 text-right text-gray-500">رقم</th><th className="px-3 py-2 text-right text-gray-500">التاريخ</th><th className="px-3 py-2 text-right text-gray-500">الإجمالي</th><th className="px-3 py-2 text-right text-gray-500">المدفوع</th><th className="px-3 py-2 text-right text-gray-500">الباقي</th></tr></thead>
                  <tbody>
                    {selectedInvoices.slice(0,5).map(inv => (
                      <tr key={inv.id} className="border-t border-dark-border/50">
                        <td className="px-3 py-2 font-mono text-green-pale">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-gray-400">{inv.date}</td>
                        <td className="px-3 py-2 text-gray-200">{formatCurrency(inv.total)}</td>
                        <td className="px-3 py-2 text-emerald-400">{formatCurrency(inv.paid??0)}</td>
                        <td className="px-3 py-2 text-amber-400">{formatCurrency(inv.total-(inv.paid??0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{await deleteCustomer(deleteId!); setDeleteId(null); toast('تم الحذف');}}
        title="حذف العميل" message="هل تريد حذف هذا العميل؟ سيتم حذف جميع بياناته." />
    </div>
  );
};
