import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, FileText, Printer, X, PlusCircle, MinusCircle, ClipboardCheck, ReceiptText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canViewFinance } from '../lib/permissions';
import { handlePrintInvoice } from '../lib/print';
import { InvoicePrintTemplate } from '../components/InvoicePrintTemplate';
import {
  Button, Card, Modal, Input, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table, Tabs, useToast,
} from '../components/ui';
import type { Invoice, InvoiceItem, WorkOrder } from '../types';
import { formatDate, formatCurrency, generateId } from '../lib/utils';

const emptyItem = (): InvoiceItem => ({ id: generateId(), item: '', quantity: 1, price: 0, total: 0 });
const emptyForm = () => ({
  customerName: '', phone: '', address: '',
  items: [emptyItem()],
  notes: '',
  date: new Date().toISOString().split('T')[0],
  subtotal: 0, total: 0, paid: 0,
});

const getDesignPrice = (id: string | undefined, designs: { id: string; price?: number }[]): number => {
  if (!id) return 0;
  return designs.find(d => d.id === id)?.price ?? 0;
};

export const Invoices: React.FC = () => {
  const { invoices, workOrders, designs, addInvoice, updateInvoice, deleteInvoice, updateWorkOrder } = useData();
  const { role } = useAuth();
  const { toast } = useToast();
  const canPrint = canViewFinance(role);
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab,  setActiveTab]  = useState<'invoices' | 'pending'>('invoices');
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
  const [creatingWoId, setCreatingWoId] = useState<string | null>(null);

  // Work orders that need an invoice: completed/delivered, not yet invoiced
  const pendingWorkOrders = useMemo(() => {
    return workOrders
      .filter(w => w.status === 'completed' || w.status === 'delivered')
      .filter(w => w.invoiceStatus !== 'invoiced' && !w.invoiceId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workOrders]);

  const createInvoiceFromWorkOrder = async (wo: WorkOrder) => {
    if (wo.invoiceId || wo.invoiceStatus === 'invoiced') {
      toast('تم إنشاء فاتورة لهذا الأمر بالفعل', 'warning');
      return;
    }
    setCreatingWoId(wo.id);
    try {
      const design = designs.find(d => d.id === wo.designId);
      const unitPrice = getDesignPrice(wo.designId, designs);
      const total = wo.quantity * unitPrice;
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        customerName: wo.customerName,
        phone: '',
        address: '',
        ...(wo.customerId ? { customerId: wo.customerId } : {}),
        workOrderId: wo.id,
        workOrderNumber: wo.orderNumber,
        ...(wo.designId ? { designId: wo.designId } : {}),
        designName: design?.designNumber || wo.designNumber || '',
        item: wo.item,
        quantity: wo.quantity,
        unitPrice,
        items: [{ id: generateId(), item: wo.item, quantity: wo.quantity, price: unitPrice, total }],
        subtotal: total,
        total,
        paid: 0,
        remaining: total,
        status: 'unpaid' as const,
        date: today,
        notes: wo.notes || '',
      };
      const created = await addInvoice(payload);
      await updateWorkOrder(wo.id, {
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
        invoiceStatus: 'invoiced',
        invoicedAt: new Date().toISOString(),
      });
      toast('تم إنشاء الفاتورة بنجاح', 'success');
      setActiveTab('invoices');
      // Open the newly created invoice immediately — the print button is right there
      const now = new Date().toISOString();
      setSelected({ id: created.id, invoiceNumber: created.invoiceNumber, ...payload, createdAt: now, updatedAt: now });
      setViewOpen(true);
    } catch {
      toast('حدث خطأ أثناء إنشاء الفاتورة', 'error');
    } finally {
      setCreatingWoId(null);
    }
  };

  // Deep links from Work Orders: ?workOrderId= auto-creates, ?invoiceId= opens the invoice
  const handledParams = useRef(false);
  useEffect(() => {
    if (handledParams.current) return;
    const woId = searchParams.get('workOrderId');
    const invId = searchParams.get('invoiceId');
    if (!woId && !invId) return;

    if (invId) {
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
        handledParams.current = true;
        setSelected(inv);
        setViewOpen(true);
        setActiveTab('invoices');
        setSearchParams({}, { replace: true });
      }
      return;
    }

    if (woId) {
      const wo = workOrders.find(w => w.id === woId);
      if (!wo) return; // wait for data to load
      handledParams.current = true;
      setSearchParams({}, { replace: true });
      if (wo.invoiceId || wo.invoiceStatus === 'invoiced') {
        toast('تم إنشاء فاتورة لهذا الأمر بالفعل', 'warning');
        setActiveTab('invoices');
      } else {
        setActiveTab('pending');
        createInvoiceFromWorkOrder(wo);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders, invoices, searchParams]);

  const filtered = useMemo(() => {
    let d = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (search)   d = d.filter(i => i.invoiceNumber.includes(search) || i.customerName.includes(search) || (i.workOrderNumber || '').includes(search));
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
      subtotal: inv.subtotal, total: inv.total, paid: inv.paid ?? 0 });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { toast('اسم العميل مطلوب', 'warning'); return; }
    if (form.items.some(it => !it.item.trim())) { toast('اسم الصنف مطلوب لجميع البنود', 'warning'); return; }
    setLoading(true);
    try {
      const paid = Math.max(0, form.paid);
      const remaining = Math.max(0, form.total - paid);
      const status = remaining === 0 && form.total > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
      const payload = { ...form, paid, remaining, status } as typeof form & { remaining: number; status: 'paid' | 'partial' | 'unpaid' };
      if (editing && selected) {
        await updateInvoice(selected.id, payload);
        toast('تم تحديث الفاتورة');
      } else {
        await addInvoice(payload);
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

  const columns = [
    { key: 'invoiceNumber', title: 'رقم الفاتورة', render: (i: Invoice) => (
      <div>
        <span className="font-mono font-bold text-gold">{i.invoiceNumber}</span>
        {i.workOrderNumber && <span className="text-xs text-gray-500 block">أمر {i.workOrderNumber}</span>}
      </div>
    )},
    { key: 'customerName', title: 'العميل', render: (i: Invoice) => (
      <div><p className="font-medium text-white">{i.customerName}</p>
        <p className="text-xs text-gray-500">{i.phone}</p></div>
    )},
    { key: 'date', title: 'التاريخ', render: (i: Invoice) => (
      <span className="text-gray-400">{formatDate(i.date)}</span>
    )},
    { key: 'total', title: 'الإجمالي', render: (i: Invoice) => (
      <span className="font-bold text-emerald-400">{formatCurrency(i.total)}</span>
    )},
    { key: 'paid', title: 'المدفوع', render: (i: Invoice) => (
      <span className="text-blue-400">{formatCurrency(i.paid ?? 0)}</span>
    )},
    { key: 'remaining', title: 'المتبقي', render: (i: Invoice) => {
      const remaining = i.remaining ?? (i.total - (i.paid ?? 0));
      return <span className={remaining > 0 ? 'text-red-400 font-semibold' : 'text-gray-500'}>{formatCurrency(remaining)}</span>;
    }},
    { key: 'actions', title: '', render: (i: Invoice) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(i); setViewOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          <Eye size={14} />
        </button>
        {canPrint && (
          <button onClick={() => handlePrintInvoice(i, msg => toast(msg, 'error'))}
            title="طباعة الفاتورة"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
            <Printer size={14} />
          </button>
        )}
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

  const pendingColumns = [
    { key: 'orderNumber', title: 'رقم الأمر', render: (w: WorkOrder) => (
      <span className="font-mono font-bold text-gold">{w.orderNumber}</span>
    )},
    { key: 'customerName', title: 'العميل', render: (w: WorkOrder) => (
      <span className="text-white font-medium">{w.customerName}</span>
    )},
    { key: 'design', title: 'التصميم', render: (w: WorkOrder) => (
      <span className="text-gray-300">{w.designNumber || '—'}</span>
    )},
    { key: 'item', title: 'الصنف', render: (w: WorkOrder) => (
      <span className="text-gray-300">{w.item}</span>
    )},
    { key: 'quantity', title: 'الكمية', render: (w: WorkOrder) => (
      <span className="text-gray-300">{w.quantity}</span>
    )},
    { key: 'price', title: 'سعر التصميم', render: (w: WorkOrder) => (
      <span className="text-gray-400">{formatCurrency(getDesignPrice(w.designId, designs))}</span>
    )},
    { key: 'total', title: 'الإجمالي المتوقع', render: (w: WorkOrder) => (
      <span className="font-bold text-emerald-400">{formatCurrency(w.quantity * getDesignPrice(w.designId, designs))}</span>
    )},
    { key: 'expectedDelivery', title: 'تاريخ التسليم', render: (w: WorkOrder) => (
      <span className="text-gray-400">{formatDate(w.expectedDelivery)}</span>
    )},
    { key: 'employee', title: 'الموظف المسؤول', render: (w: WorkOrder) => (
      <span className="text-gray-400 text-xs">{w.responsibleEmployeeName || '—'}</span>
    )},
    { key: 'actions', title: '', render: (w: WorkOrder) => (
      <div onClick={e => e.stopPropagation()}>
        <Button size="sm" icon={<FileText size={13} />} loading={creatingWoId === w.id}
          disabled={creatingWoId !== null && creatingWoId !== w.id}
          onClick={() => createInvoiceFromWorkOrder(w)}>
          إنشاء فاتورة
        </Button>
      </div>
    )},
  ];

  const tabs = [
    { key: 'invoices', label: 'الفواتير',              count: invoices.length },
    { key: 'pending',  label: 'أوامر جاهزة للفوترة',   count: pendingWorkOrders.length },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="الفواتير"
        subtitle={`${invoices.length} فاتورة — إجمالي الإيرادات: ${formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}`}
        actions={<Button icon={<Plus size={16} />} onClick={() => setActiveTab('pending')}>إنشاء فاتورة</Button>}
      />

      <Tabs tabs={tabs} active={activeTab} onChange={k => setActiveTab(k as 'invoices' | 'pending')} />

      {activeTab === 'pending' ? (
        <>
          <Card>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <ClipboardCheck size={16} className="text-gold" />
              أوامر الشغل المكتملة أو المسلَّمة التي لم يتم إصدار فاتورة لها بعد
            </div>
          </Card>
          <Card padding={false}>
            <Table
              columns={pendingColumns}
              data={pendingWorkOrders}
              rowKey={w => w.id}
              emptyText="لا توجد أوامر شغل جاهزة للفوترة حاليًا"
              emptyIcon={<ReceiptText size={40} />}
            />
          </Card>
        </>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو العميل أو رقم الأمر..." />
              </div>
              <Input label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-w-40" />
              <Input label="إلى تاريخ" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="min-w-40" />
              {(search || dateFrom || dateTo) && (
                <Button variant="ghost" icon={<X size={14} />} onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}>
                  مسح
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={openAdd}>إضافة فاتورة يدويًا</Button>
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
        </>
      )}

      {/* Add/Edit Modal (manual) */}
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

          <div className="grid grid-cols-2 gap-4">
            <Input label="المدفوع (ج.م)" type="number" min={0} value={form.paid}
              onChange={e => setForm(p => ({ ...p, paid: Number(e.target.value) }))} />
            <div className="bg-dark-raised border border-dark-border rounded-xl px-4 py-2.5">
              <p className="text-xs text-gray-500 mb-1">المتبقي</p>
              <p className="text-sm font-semibold text-red-400">
                {formatCurrency(Math.max(0, form.total - form.paid))}
              </p>
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
              {canPrint && (
                <Button variant="ghost" icon={<Printer size={14} />}
                  onClick={() => handlePrintInvoice(selected, msg => toast(msg, 'error'))}>
                  طباعة الفاتورة
                </Button>
              )}
              <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => { setViewOpen(false); openEdit(selected); }}>تعديل</Button>
            </div>
          }
        >
          <div className="bg-white rounded-xl overflow-x-auto">
            <InvoicePrintTemplate
              invoice={selected}
              workOrder={selected.workOrderId ? workOrders.find(w => w.id === selected.workOrderId) : null}
              design={selected.designId ? designs.find(d => d.id === selected.designId) : null}
            />
          </div>
        </Modal>
      )}

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة "${selected?.invoiceNumber}" للعميل "${selected?.customerName}"؟`} />
    </div>
  );
};
