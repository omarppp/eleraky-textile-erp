import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, ClipboardList, X, Printer, FileText, ReceiptText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canViewFinance } from '../lib/permissions';
import {
  Button, Card, Badge, Modal, Input, Select, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table,
  ProgressBar, Tabs, useToast,
} from '../components/ui';
import type { WorkOrder, WorkOrderStatus, FingerOrderItem, Design } from '../types';
import { formatDate, workOrderStatusBadge, workOrderStatusLabel, formatDateInput } from '../lib/utils';

const MACHINE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `ماكينة ${i + 1}` }));
const STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = [
  { value: 'new',           label: 'جديد' },
  { value: 'in_production', label: 'في الإنتاج' },
  { value: 'waiting',       label: 'في الانتظار' },
  { value: 'completed',     label: 'مكتمل' },
  { value: 'delivered',     label: 'تم التسليم' },
  { value: 'delayed',       label: 'متأخر' },
  { value: 'cancelled',     label: 'ملغي' },
];

const emptyFinger = (): FingerOrderItem => ({ fingerNumber: '', orderValue: '', notes: '' });

const getDesignWefts = (d: Design) => {
  if (d.wefts && d.wefts.length > 0) return d.wefts;
  if (d.weft) return [{ name: d.weft }];
  return [];
};

const PrintableWorkOrder = React.forwardRef<HTMLDivElement, { wo: WorkOrder; design?: Design | null }>(
  ({ wo, design }, ref) => {
    const wefts = design ? getDesignWefts(design) : [];
    return (
      <div ref={ref} dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: 32, color: '#111', background: '#fff', minHeight: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, borderBottom: '2px solid #C9963F', paddingBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1B5E2A', margin: 0, letterSpacing: 1 }}>Eleraky Textile</h1>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0', letterSpacing: 2 }}>FACTORY MANAGEMENT</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>أمر شغل</h2>
            <p style={{ fontSize: 14, color: '#C9963F', fontWeight: 600, margin: '4px 0 0' }}>{wo.orderNumber}</p>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ background: '#f0f7f0', border: '1px solid #1B5E2A', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#1B5E2A' }}>
            {workOrderStatusLabel[wo.status]}
          </span>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'العميل',                value: wo.customerName },
            { label: 'الصنف',                 value: wo.item },
            { label: 'رقم التصميم',           value: wo.designNumber || '—' },
            { label: 'رقم الماكينة',          value: `ماكينة ${wo.machineNumber}` },
            { label: 'الكمية المطلوبة',        value: `${wo.quantity} متر` },
            { label: 'الكمية المنتجة',         value: `${wo.producedQuantity} متر` },
            { label: 'تاريخ التسليم المتوقع',  value: formatDate(wo.expectedDelivery) },
            { label: 'الموظف المسؤول',         value: wo.responsibleEmployeeName || '—' },
          ].map(r => (
            <div key={r.label} style={{ background: '#f9f9f9', padding: '8px 12px', borderRadius: 6 }}>
              <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px' }}>{r.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{r.value}</p>
            </div>
          ))}
        </div>

        {/* Wefts Table */}
        {wefts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#C9963F', borderBottom: '1px solid #eee', paddingBottom: 6, marginBottom: 8 }}>اللحمات</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>#</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>نوع اللحمة</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {wefts.map((w, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #eee' }}>اللحمة {i + 1}</td>
                    <td style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #eee' }}>{w.name}</td>
                    <td style={{ padding: '6px 10px', fontSize: 12, color: '#888', border: '1px solid #eee' }}>{w.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Finger Order Table */}
        {wo.fingerOrder && wo.fingerOrder.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1B5E2A', borderBottom: '1px solid #eee', paddingBottom: 6, marginBottom: 8 }}>ترتيب الصوابع</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>رقم الصابع</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>الترتيب</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, border: '1px solid #eee' }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {wo.fingerOrder.map((fi, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #eee' }}>{fi.fingerNumber || `صابع ${i + 1}`}</td>
                    <td style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #eee' }}>{fi.orderValue}</td>
                    <td style={{ padding: '6px 10px', fontSize: 12, color: '#888', border: '1px solid #eee' }}>{fi.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {wo.notes && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>ملاحظات</p>
            <p style={{ fontSize: 13, margin: 0 }}>{wo.notes}</p>
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center', color: '#aaa', fontSize: 11 }}>
          Eleraky Textile — Threads That Inspire, Fabrics That Last
        </div>
      </div>
    );
  }
);
PrintableWorkOrder.displayName = 'PrintableWorkOrder';

const emptyForm = () => ({
  customerName: '', designId: '', designNumber: '', item: '',
  quantity: 1, producedQuantity: 0,
  expectedDelivery: '', machineNumber: 1,
  status: 'new' as WorkOrderStatus,
  responsibleEmployeeId: '', responsibleEmployeeName: '',
  notes: '',
  fingerOrder: [] as FingerOrderItem[],
});

export const WorkOrders: React.FC = () => {
  const { workOrders, designs, employees, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useData();
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const canSeeInvoicing = canViewFinance(role);

  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [machineF,   setMachineF]   = useState('');
  const [customerF,  setCustomerF]  = useState('');
  const [activeTab,  setActiveTab]  = useState('all');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected,   setSelected]   = useState<WorkOrder | null>(null);
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState(emptyForm());
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState<Partial<Record<string, string>>>({});

  const getDesignFirstWeft = (d: typeof designs[0]): string => {
    if (d.wefts && d.wefts.length > 0) return d.wefts[0].name;
    return d.weft || '';
  };
  const designOptions = designs.map(d => ({ value: d.id, label: `${d.designNumber}${getDesignFirstWeft(d) ? ` — ${getDesignFirstWeft(d)}` : ''}` }));

  const filtered = useMemo(() => {
    let d = [...workOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (activeTab !== 'all') d = d.filter(w => w.status === activeTab);
    if (search)    d = d.filter(w => w.orderNumber.includes(search) || w.customerName.includes(search) || w.item.includes(search));
    if (statusF)   d = d.filter(w => w.status === statusF);
    if (machineF)  d = d.filter(w => String(w.machineNumber) === machineF);
    if (customerF) d = d.filter(w => w.customerName.includes(customerF));
    return d;
  }, [workOrders, search, statusF, machineF, customerF, activeTab]);

  const tabs = [
    { key: 'all',           label: 'الكل',       count: workOrders.length },
    { key: 'new',           label: 'جديد',       count: workOrders.filter(w => w.status === 'new').length },
    { key: 'in_production', label: 'في الإنتاج', count: workOrders.filter(w => w.status === 'in_production').length },
    { key: 'delayed',       label: 'متأخر',      count: workOrders.filter(w => w.status === 'delayed').length },
    { key: 'completed',     label: 'مكتمل',      count: workOrders.filter(w => w.status === 'completed' || w.status === 'delivered').length },
  ];

  const openAdd = () => { setEditing(false); setForm(emptyForm()); setErrors({}); setModalOpen(true); };

  const activeEmployees = employees.filter(e => e.status === 'active');

  const openEdit = (w: WorkOrder) => {
    setEditing(true); setSelected(w);
    setForm({
      customerName: w.customerName, designId: w.designId, designNumber: w.designNumber || '',
      item: w.item, quantity: w.quantity, producedQuantity: w.producedQuantity,
      expectedDelivery: formatDateInput(w.expectedDelivery), machineNumber: w.machineNumber,
      status: w.status,
      responsibleEmployeeId: w.responsibleEmployeeId || '',
      responsibleEmployeeName: w.responsibleEmployeeName || '',
      notes: w.notes || '',
      fingerOrder: w.fingerOrder ? [...w.fingerOrder] : [],
    });
    setErrors({}); setModalOpen(true);
  };

  const addFinger = () => setForm(p => ({ ...p, fingerOrder: [...p.fingerOrder, emptyFinger()] }));
  const removeFinger = (idx: number) => setForm(p => ({ ...p, fingerOrder: p.fingerOrder.filter((_, i) => i !== idx) }));
  const updateFinger = (idx: number, field: keyof FingerOrderItem, value: string) =>
    setForm(p => ({ ...p, fingerOrder: p.fingerOrder.map((fi, i) => i === idx ? { ...fi, [field]: value } : fi) }));

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.customerName.trim())  e.customerName     = 'اسم العميل مطلوب';
    if (!form.item.trim())          e.item             = 'الصنف مطلوب';
    if (form.quantity < 1)          e.quantity         = 'الكمية يجب أن تكون أكبر من صفر';
    if (!form.expectedDelivery)     e.expectedDelivery = 'تاريخ التسليم مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const cleanedFingerOrder = form.fingerOrder.filter(fi => fi.fingerNumber.trim() || fi.orderValue.trim());
      const payload = {
        ...form,
        fingerOrder: cleanedFingerOrder,
        designNumber: designs.find(d => d.id === form.designId)?.designNumber || form.designNumber,
      };
      if (editing && selected) {
        await updateWorkOrder(selected.id, payload);
        toast('تم تحديث أمر الشغل');
      } else {
        await addWorkOrder(payload);
        toast('تمت إضافة أمر الشغل');
      }
      setModalOpen(false);
    } catch {
      toast('حدث خطأ، حاول مجدداً', 'error');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteWorkOrder(selected.id);
      toast('تم حذف أمر الشغل', 'success');
      setDeleteOpen(false); setSelected(null);
    } catch { toast('حدث خطأ أثناء الحذف', 'error'); }
    finally { setLoading(false); }
  };

  const handlePrintWO = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <title>أمر شغل ${selected?.orderNumber}</title>
        <style>body{margin:0;padding:20px;direction:rtl;}</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  };

  const columns = [
    { key: 'orderNumber', title: 'رقم الأمر', render: (w: WorkOrder) => (
      <span className="font-mono font-bold text-gold">{w.orderNumber}</span>
    )},
    { key: 'customerName', title: 'العميل', render: (w: WorkOrder) => (
      <span className="text-white font-medium">{w.customerName}</span>
    )},
    { key: 'item', title: 'الصنف', render: (w: WorkOrder) => (
      <span className="text-gray-300">{w.item}</span>
    )},
    { key: 'progress', title: 'التقدم', render: (w: WorkOrder) => (
      <div className="w-28">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{w.producedQuantity}</span>
          <span>{w.quantity}</span>
        </div>
        <ProgressBar value={w.producedQuantity} max={w.quantity} color={
          w.status === 'delayed' ? 'red' : w.status === 'completed' || w.status === 'delivered' ? 'green' : 'gold'
        } />
      </div>
    )},
    { key: 'machineNumber', title: 'الماكينة', render: (w: WorkOrder) => (
      <Badge color="purple">ماكينة {w.machineNumber}</Badge>
    )},
    { key: 'expectedDelivery', title: 'التسليم', render: (w: WorkOrder) => {
      const days = Math.ceil((new Date(w.expectedDelivery).getTime() - Date.now()) / 86400000);
      return (
        <div>
          <div className="text-sm text-gray-300">{formatDate(w.expectedDelivery)}</div>
          {w.status !== 'completed' && w.status !== 'delivered' && (
            <div className={`text-xs ${days < 0 ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
              {days < 0 ? `متأخر ${Math.abs(days)} يوم` : days === 0 ? 'اليوم' : `${days} يوم متبقي`}
            </div>
          )}
        </div>
      );
    }},
    { key: 'employee', title: 'الموظف المسؤول', render: (w: WorkOrder) => (
      <span className="text-gray-400 text-xs">{w.responsibleEmployeeName || '—'}</span>
    )},
    { key: 'status', title: 'الحالة', render: (w: WorkOrder) => (
      <span className={`badge ${workOrderStatusBadge[w.status]}`}>{workOrderStatusLabel[w.status]}</span>
    )},
    { key: 'actions', title: '', render: (w: WorkOrder) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(w); setDetailOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          <Eye size={14} />
        </button>
        <button onClick={() => openEdit(w)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
          <Pencil size={14} />
        </button>
        <button onClick={() => { setSelected(w); setDeleteOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="أوامر الشغل"
        subtitle={`${workOrders.length} أمر شغل إجمالي`}
        actions={<Button icon={<Plus size={16} />} onClick={openAdd}>إضافة أمر شغل</Button>}
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالرقم أو العميل أو الصنف..." />
          </div>
          <div className="min-w-36">
            <Select value={statusF} onChange={e => setStatusF(e.target.value)}
              options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
              placeholder="كل الحالات" />
          </div>
          <div className="min-w-36">
            <Select value={machineF} onChange={e => setMachineF(e.target.value)}
              options={MACHINE_OPTIONS} placeholder="كل الماكينات" />
          </div>
          <div className="min-w-44">
            <Input value={customerF} onChange={e => setCustomerF(e.target.value)} placeholder="فلتر بالعميل..." />
          </div>
          {(search || statusF || machineF || customerF) && (
            <Button variant="ghost" icon={<X size={14} />}
              onClick={() => { setSearch(''); setStatusF(''); setMachineF(''); setCustomerF(''); }}>
              مسح
            </Button>
          )}
          <span className="text-sm text-gray-500 mr-auto">{filtered.length} نتيجة</span>
        </div>
      </Card>

      <Card padding={false}>
        <Table
          columns={columns} data={filtered} rowKey={w => w.id}
          emptyText="لا توجد أوامر شغل" emptyIcon={<ClipboardList size={40} />}
          onRowClick={w => { setSelected(w); setDetailOpen(true); }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل أمر الشغل' : 'إضافة أمر شغل جديد'} size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>
              {editing ? 'حفظ التعديلات' : 'إضافة الأمر'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="اسم العميل *" value={form.customerName}
            onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
            placeholder="اسم العميل" error={errors.customerName} />
          <Select label="التصميم" value={form.designId}
            onChange={e => setForm(p => ({ ...p, designId: e.target.value }))}
            options={designOptions} placeholder="اختر تصميماً" />

          {/* Design wefts preview */}
          {form.designId && (() => {
            const d = designs.find(x => x.id === form.designId);
            if (!d) return null;
            const wefts = (d.wefts && d.wefts.length > 0) ? d.wefts : d.weft ? [{ name: d.weft }] : [];
            return (
              <div className="sm:col-span-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">اللحمات — تصميم {d.designNumber}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {wefts.map((w, i) => (
                    <div key={i} className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-500 mb-0.5">اللحمة {i + 1}</p>
                      <p className="text-xs font-medium text-white">{w.name}</p>
                      {w.notes && <p className="text-[10px] text-gray-600 mt-0.5">{w.notes}</p>}
                    </div>
                  ))}
                  <div className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500 mb-0.5">السدا</p>
                    <p className="text-xs font-medium text-white">{d.warp}</p>
                  </div>
                  <div className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500 mb-0.5">الحدافات</p>
                    <p className="text-xs font-medium text-white">{d.hadafatCount}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <Input label="الصنف *" value={form.item}
            onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
            placeholder="نوع القماش / الصنف" error={errors.item} />
          <Input label="الكمية المطلوبة (متر) *" type="number" min={1} value={form.quantity}
            onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} error={errors.quantity} />
          {editing && (
            <Input label="الكمية المنتجة (متر)" type="number" min={0} value={form.producedQuantity}
              onChange={e => setForm(p => ({ ...p, producedQuantity: Number(e.target.value) }))} />
          )}
          <Input label="تاريخ التسليم المتوقع *" type="date" value={form.expectedDelivery}
            onChange={e => setForm(p => ({ ...p, expectedDelivery: e.target.value }))} error={errors.expectedDelivery} />
          <Select label="رقم الماكينة *" value={String(form.machineNumber)}
            onChange={e => setForm(p => ({ ...p, machineNumber: Number(e.target.value) }))}
            options={MACHINE_OPTIONS} />
          <Select label="الحالة *" value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as WorkOrderStatus }))}
            options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
          <Select
            label="الموظف المسؤول"
            value={form.responsibleEmployeeId}
            onChange={e => {
              const emp = activeEmployees.find(x => x.id === e.target.value);
              setForm(p => ({
                ...p,
                responsibleEmployeeId: e.target.value,
                responsibleEmployeeName: emp?.name || '',
              }));
            }}
            options={[
              { value: '', label: '— اختر الموظف —' },
              ...activeEmployees.map(e => ({ value: e.id, label: `${e.name} — ${e.jobTitle}` })),
            ]}
          />

          {/* Finger Order Section */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-300">ترتيب الصوابع</p>
              <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={addFinger}>
                إضافة صابع
              </Button>
            </div>
            {form.fingerOrder.length === 0 ? (
              <div className="text-center py-3 text-gray-600 text-xs bg-dark-raised border border-dashed border-dark-border rounded-xl">
                لا يوجد ترتيب صوابع — اضغط "إضافة صابع" للإضافة
              </div>
            ) : (
              <div className="space-y-2">
                {form.fingerOrder.map((fi, i) => (
                  <div key={i} className="bg-dark-raised border border-dark-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 font-medium">صابع {i + 1}</span>
                      <button onClick={() => removeFinger(i)}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input label="رقم الصابع" value={fi.fingerNumber}
                        onChange={e => updateFinger(i, 'fingerNumber', e.target.value)}
                        placeholder="مثال: 1" />
                      <Input label="الترتيب / القيمة" value={fi.orderValue}
                        onChange={e => updateFinger(i, 'orderValue', e.target.value)}
                        placeholder="مثال: A أو 2" />
                      <Input label="ملاحظات" value={fi.notes || ''}
                        onChange={e => updateFinger(i, 'notes', e.target.value)}
                        placeholder="اختياري" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Textarea label="ملاحظات" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && detailOpen && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
          title={`أمر شغل ${selected.orderNumber}`} size="lg"
          footer={
            <div className="flex gap-2">
              <Button variant="ghost" icon={<Printer size={14} />} onClick={handlePrintWO}>طباعة</Button>
              <Button variant="outline" icon={<Pencil size={14} />}
                onClick={() => { setDetailOpen(false); openEdit(selected); }}>تعديل</Button>
              <Button variant="danger" icon={<Trash2 size={14} />}
                onClick={() => { setDetailOpen(false); setDeleteOpen(true); }}>حذف</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'رقم الأمر',       value: selected.orderNumber },
                { label: 'العميل',          value: selected.customerName },
                { label: 'الصنف',           value: selected.item },
                { label: 'التصميم',         value: selected.designNumber || '—' },
                { label: 'الكمية',          value: `${selected.quantity} متر` },
                { label: 'المنتج',          value: `${selected.producedQuantity} متر` },
                { label: 'الماكينة',        value: `ماكينة ${selected.machineNumber}` },
                { label: 'تاريخ التسليم',   value: formatDate(selected.expectedDelivery) },
                { label: 'الموظف المسؤول', value: selected.responsibleEmployeeName || '—' },
              ].map(r => (
                <div key={r.label} className="bg-dark-raised border border-dark-border rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{r.label}</p>
                  <p className="text-sm font-semibold text-white">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-dark-raised border border-dark-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">تقدم الإنتاج</p>
                <span className={`badge ${workOrderStatusBadge[selected.status]}`}>{workOrderStatusLabel[selected.status]}</span>
              </div>
              <ProgressBar value={selected.producedQuantity} max={selected.quantity} color="gold" showLabel size="md" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{selected.producedQuantity} متر منتج</span>
                <span>{selected.quantity} متر مطلوب</span>
              </div>
            </div>

            {/* Invoice status — full_admin & finance_user only */}
            {canSeeInvoicing && (
              <div className="bg-dark-raised border border-dark-border rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <ReceiptText size={13} /> الفوترة
                </p>
                {selected.invoiceId ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">تم إنشاء الفاتورة</p>
                      <p className="text-xs text-gray-500 font-mono">{selected.invoiceNumber}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={<FileText size={13} />}
                      onClick={() => { setDetailOpen(false); navigate(`/invoices?invoiceId=${selected.invoiceId}`); }}>
                      عرض الفاتورة
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">لم يتم إنشاء فاتورة بعد</p>
                    <Button size="sm" icon={<FileText size={13} />}
                      onClick={() => { setDetailOpen(false); navigate(`/invoices?workOrderId=${selected.id}`); }}>
                      إنشاء فاتورة من أمر الشغل
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Design wefts */}
            {selected.designId && (() => {
              const d = designs.find(x => x.id === selected.designId);
              if (!d) return null;
              const wefts = (d.wefts && d.wefts.length > 0) ? d.wefts : d.weft ? [{ name: d.weft }] : [];
              if (wefts.length === 0) return null;
              return (
                <div className="bg-dark-raised border border-dark-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-dark-border/50 flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">اللحمات</span>
                    <span className="text-xs text-gray-500">تصميم {d.designNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-x-reverse divide-dark-border/40">
                    {wefts.map((w, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">اللحمة {i + 1}</p>
                        <p className="text-sm font-semibold text-white">{w.name}</p>
                        {w.notes && <p className="text-xs text-gray-500 mt-0.5">{w.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Finger Order */}
            <div className="bg-dark-raised border border-dark-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-dark-border/50">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">ترتيب الصوابع</span>
              </div>
              {selected.fingerOrder && selected.fingerOrder.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-x-reverse divide-dark-border/40">
                  {selected.fingerOrder.map((fi, i) => (
                    <div key={i} className="px-4 py-3">
                      <p className="text-xs text-gray-500 mb-1">صابع {i + 1}</p>
                      <p className="text-sm font-semibold text-white">{fi.fingerNumber || '—'}</p>
                      <p className="text-xs text-blue-400 font-medium">{fi.orderValue}</p>
                      {fi.notes && <p className="text-xs text-gray-500 mt-0.5">{fi.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">لا يوجد ترتيب صوابع مسجل</div>
              )}
            </div>

            {selected.notes && (
              <div className="bg-dark-raised border border-dark-border rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                <p className="text-sm text-gray-300">{selected.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Hidden print target */}
      <div className="hidden">
        {selected && (
          <PrintableWorkOrder
            ref={printRef}
            wo={selected}
            design={designs.find(d => d.id === selected.designId) ?? null}
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف أمر الشغل"
        message={`هل أنت متأكد من حذف أمر الشغل "${selected?.orderNumber}" للعميل "${selected?.customerName}"؟`}
      />
    </div>
  );
};
