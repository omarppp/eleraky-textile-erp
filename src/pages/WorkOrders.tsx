import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, ClipboardList, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  Button, Card, Badge, Modal, Input, Select, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table,
  ProgressBar, Tabs, useToast,
} from '../components/ui';
import type { WorkOrder, WorkOrderStatus } from '../types';
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

const emptyForm = () => ({
  customerName: '', designId: '', designNumber: '', item: '',
  quantity: 1, producedQuantity: 0,
  expectedDelivery: '', machineNumber: 1,
  status: 'new' as WorkOrderStatus,
  responsibleEmployeeId: '', responsibleEmployeeName: '',
  notes: '',
});

export const WorkOrders: React.FC = () => {
  const { workOrders, designs, employees, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useData();
  const { toast } = useToast();

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

  const designOptions = designs.map(d => ({ value: d.id, label: `${d.designNumber} — ${d.weft}` }));

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
    });
    setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.customerName.trim())  e.customerName  = 'اسم العميل مطلوب';
    if (!form.item.trim())          e.item          = 'الصنف مطلوب';
    if (form.quantity < 1)          e.quantity      = 'الكمية يجب أن تكون أكبر من صفر';
    if (!form.expectedDelivery)     e.expectedDelivery = 'تاريخ التسليم مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
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
          <div className="sm:col-span-2">
            <Textarea label="ملاحظات" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && detailOpen && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
          title={`أمر شغل ${selected.orderNumber}`} size="lg">
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
            {selected.notes && (
              <div className="bg-dark-raised border border-dark-border rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                <p className="text-sm text-gray-300">{selected.notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" icon={<Pencil size={14} />}
                onClick={() => { setDetailOpen(false); openEdit(selected); }}>تعديل</Button>
              <Button variant="danger" icon={<Trash2 size={14} />}
                onClick={() => { setDetailOpen(false); setDeleteOpen(true); }}>حذف</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف أمر الشغل"
        message={`هل أنت متأكد من حذف أمر الشغل "${selected?.orderNumber}" للعميل "${selected?.customerName}"؟`}
      />
    </div>
  );
};
