import React, { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, FileText, Printer, X, PlusCircle, MinusCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  Button, Card, Badge, Modal, Input, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table, useToast,
} from '../components/ui';
import type { Invoice, InvoiceItem } from '../types';
import { formatDate, formatCurrency, generateId } from '../lib/utils';

const emptyItem = (): InvoiceItem => ({ id: generateId(), item: '', quantity: 1, price: 0, total: 0 });
const emptyForm = () => ({
  customerName: '', phone: '', address: '',
  items: [emptyItem()],
  notes: '',
  date: new Date().toISOString().split('T')[0],
  subtotal: 0, total: 0,
});

// Print-ready invoice component
const PrintableInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(({ invoice }, ref) => (
  <div ref={ref} dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: 32, color: '#111', background: '#fff', minHeight: '100%' }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, borderBottom: '2px solid #C9963F', paddingBottom: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1B5E2A', margin: 0, letterSpacing: 1 }}>Eleraky Textile</h1>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0', letterSpacing: 2 }}>FACTORY MANAGEMENT</p>
      </div>
      <div style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>فاتورة</h2>
        <p style={{ fontSize: 14, color: '#C9963F', fontWeight: 600, margin: '4px 0 0' }}>{invoice.invoiceNumber}</p>
      </div>
    </div>
    {/* Customer info */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
      <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>العميل</p>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{invoice.customerName}</p>
        <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>{invoice.phone}</p>
        <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>{invoice.address}</p>
      </div>
      <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>تاريخ الفاتورة</p>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{formatDate(invoice.date)}</p>
      </div>
    </div>
    {/* Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
      <thead>
        <tr style={{ background: '#C9963F', color: '#fff' }}>
          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>الصنف</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>الكمية</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>السعر</th>
          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((it, i) => (
          <tr key={it.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
            <td style={{ padding: '9px 12px', fontSize: 13 }}>{it.item}</td>
            <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 13 }}>{it.quantity}</td>
            <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 13 }}>{it.price.toLocaleString('ar-EG')} ج.م</td>
            <td style={{ padding: '9px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{it.total.toLocaleString('ar-EG')} ج.م</td>
          </tr>
        ))}
      </tbody>
    </table>
    {/* Total */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
      <div style={{ background: '#C9963F', color: '#fff', padding: '12px 24px', borderRadius: 8, textAlign: 'center' }}>
        <p style={{ fontSize: 12, margin: '0 0 4px', opacity: 0.8 }}>الإجمالي الكلي</p>
        <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{invoice.total.toLocaleString('ar-EG')} ج.م</p>
      </div>
    </div>
    {invoice.notes && (
      <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>ملاحظات</p>
        <p style={{ fontSize: 13, margin: 0 }}>{invoice.notes}</p>
      </div>
    )}
    <div style={{ marginTop: 32, textAlign: 'center', color: '#aaa', fontSize: 11 }}>
      Eleraky Textile — Threads That Inspire, Fabrics That Last
    </div>
  </div>
));

export const Invoices: React.FC = () => {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useData();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [search,     setSearch]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [viewOpen,   setViewOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected,   setSelected]   = useState<Invoice | null>(null);
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState(emptyForm());
  const [loading,    setLoading]    = useState(false);

  const filtered = useMemo(() => {
    let d = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (search)   d = d.filter(i => i.invoiceNumber.includes(search) || i.customerName.includes(search));
    if (dateFrom) d = d.filter(i => new Date(i.date) >= new Date(dateFrom));
    if (dateTo)   d = d.filter(i => new Date(i.date) <= new Date(dateTo));
    return d;
  }, [invoices, search, dateFrom, dateTo]);

  const totalRevenue = filtered.reduce((s, i) => s + i.total, 0);

  const updateItems = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    setForm(p => ({ ...p, items, subtotal, total: subtotal }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const updated = form.items.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      updated.total = updated.quantity * updated.price;
      return updated;
    });
    updateItems(updated);
  };

  const addItem = () => updateItems([...form.items, emptyItem()]);
  const removeItem = (id: string) => {
    if (form.items.length === 1) return;
    updateItems(form.items.filter(it => it.id !== id));
  };

  const openAdd = () => { setEditing(false); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (inv: Invoice) => {
    setEditing(true); setSelected(inv);
    setForm({ customerName: inv.customerName, phone: inv.phone, address: inv.address,
      items: inv.items, notes: inv.notes || '', date: inv.date.split('T')[0],
      subtotal: inv.subtotal, total: inv.total });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { toast('اسم العميل مطلوب', 'warning'); return; }
    if (form.items.some(it => !it.item.trim())) { toast('اسم الصنف مطلوب لجميع البنود', 'warning'); return; }
    setLoading(true);
    try {
      if (editing && selected) {
        await updateInvoice(selected.id, form);
        toast('تم تحديث الفاتورة');
      } else {
        await addInvoice(form);
        toast('تمت إضافة الفاتورة');
      }
      setModalOpen(false);
    } catch { toast('حدث خطأ', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteInvoice(selected.id);
      toast('تم حذف الفاتورة', 'success');
      setDeleteOpen(false); setSelected(null);
    } catch { toast('حدث خطأ أثناء الحذف', 'error'); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <title>فاتورة ${selected?.invoiceNumber}</title>
        <style>body{margin:0;padding:20px;direction:rtl;}</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  };

  const columns = [
    { key: 'invoiceNumber', title: 'رقم الفاتورة', render: (i: Invoice) => (
      <span className="font-mono font-bold text-gold">{i.invoiceNumber}</span>
    )},
    { key: 'customerName', title: 'العميل', render: (i: Invoice) => (
      <div><p className="font-medium text-white">{i.customerName}</p>
        <p className="text-xs text-gray-500">{i.phone}</p></div>
    )},
    { key: 'date', title: 'التاريخ', render: (i: Invoice) => (
      <span className="text-gray-400">{formatDate(i.date)}</span>
    )},
    { key: 'items', title: 'عدد البنود', render: (i: Invoice) => (
      <Badge color="blue">{i.items.length} بند</Badge>
    )},
    { key: 'total', title: 'الإجمالي', render: (i: Invoice) => (
      <span className="font-bold text-emerald-400">{formatCurrency(i.total)}</span>
    )},
    { key: 'actions', title: '', render: (i: Invoice) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(i); setViewOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          <Eye size={14} />
        </button>
        <button onClick={() => openEdit(i)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
          <Pencil size={14} />
        </button>
        <button onClick={() => { setSelected(i); setDeleteOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="الفواتير"
        subtitle={`${invoices.length} فاتورة — إجمالي الإيرادات: ${formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}`}
        actions={<Button icon={<Plus size={16} />} onClick={openAdd}>فاتورة جديدة</Button>}
      />

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو العميل..." />
          </div>
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-w-40" />
          <Input label="إلى تاريخ" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="min-w-40" />
          {(search || dateFrom || dateTo) && (
            <Button variant="ghost" icon={<X size={14} />} onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}>
              مسح
            </Button>
          )}
          <div className="mr-auto text-left">
            <p className="text-xs text-gray-500">إجمالي المعروض</p>
            <p className="font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={filtered} rowKey={i => i.id}
          emptyText="لا توجد فواتير — أنشئ فاتورة جديدة" emptyIcon={<FileText size={40} />}
          onRowClick={i => { setSelected(i); setViewOpen(true); }} />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'} size="xl"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>
              {editing ? 'حفظ التعديلات' : 'إنشاء الفاتورة'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم العميل *" value={form.customerName}
              onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="اسم العميل" />
            <Input label="رقم الهاتف" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
            <Input label="العنوان" value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="المحافظة، الحي..." />
            <Input label="التاريخ *" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">بنود الفاتورة</p>
              <Button size="sm" variant="ghost" icon={<PlusCircle size={14} />} onClick={addItem}>إضافة بند</Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 text-xs text-gray-500 px-1">
                <span>الصنف</span><span className="text-center">الكمية</span>
                <span className="text-center">السعر (ج.م)</span>
                <span className="text-center">الإجمالي</span><span />
              </div>
              {form.items.map(it => (
                <div key={it.id} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 items-center">
                  <input value={it.item} onChange={e => updateItem(it.id, 'item', e.target.value)}
                    placeholder="اسم الصنف" className="input-dark" />
                  <input type="number" min={1} value={it.quantity} onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))}
                    className="input-dark text-center" />
                  <input type="number" min={0} value={it.price} onChange={e => updateItem(it.id, 'price', Number(e.target.value))}
                    className="input-dark text-center" />
                  <div className="bg-dark-raised border border-dark-border rounded-lg px-3 py-2.5 text-sm text-emerald-400 font-semibold text-center">
                    {it.total.toLocaleString('ar-EG')}
                  </div>
                  <button onClick={() => removeItem(it.id)} disabled={form.items.length === 1}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 disabled:opacity-30">
                    <MinusCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <div className="bg-gold/10 border border-gold/20 rounded-xl px-6 py-3 text-center">
                <p className="text-xs text-gray-500">الإجمالي الكلي</p>
                <p className="text-2xl font-bold text-gold">{formatCurrency(form.total)}</p>
              </div>
            </div>
          </div>

          <Textarea label="ملاحظات" value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* View/Print Modal */}
      {selected && viewOpen && (
        <Modal open={viewOpen} onClose={() => setViewOpen(false)}
          title={`عرض الفاتورة ${selected.invoiceNumber}`} size="xl"
          footer={
            <div className="flex gap-2">
              <Button variant="ghost" icon={<Printer size={14} />} onClick={handlePrint}>طباعة</Button>
              <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => { setViewOpen(false); openEdit(selected); }}>تعديل</Button>
            </div>
          }
        >
          <div className="bg-white rounded-xl overflow-hidden">
            <PrintableInvoice ref={printRef} invoice={selected} />
          </div>
        </Modal>
      )}

      {/* Hidden print target */}
      <div className="hidden">
        {selected && <PrintableInvoice ref={printRef} invoice={selected} />}
      </div>

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة "${selected?.invoiceNumber}" للعميل "${selected?.customerName}"؟`} />
    </div>
  );
};
