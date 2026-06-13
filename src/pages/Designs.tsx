import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Palette, X, Image } from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  Button, Card, Badge, Modal, Input, Select, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table, useToast,
} from '../components/ui';
import type { Design } from '../types';
import { formatDate } from '../lib/utils';

const MACHINE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `ماكينة ${i + 1}` }));

const emptyForm = (): Omit<Design, 'id' | 'createdAt' | 'updatedAt'> => ({
  designNumber: '',
  weft: '',
  weftMotorOrder: '',
  warp: '',
  hadafatCount: 4,
  assignedMachine: 1,
  imageUrl: '',
  notes: '',
});

export const Designs: React.FC = () => {
  const { designs, addDesign, updateDesign, deleteDesign } = useData();
  const { toast } = useToast();

  const [search,      setSearch]      = useState('');
  const [machineF,    setMachineF]    = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [selected,    setSelected]    = useState<Design | null>(null);
  const [editing,     setEditing]     = useState(false);
  const [form,        setForm]        = useState(emptyForm());
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<keyof typeof form, string>>>({});

  const filtered = useMemo(() => {
    let d = [...designs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (search)   d = d.filter(x => x.designNumber.includes(search) || x.weft.includes(search) || x.warp.includes(search));
    if (machineF) d = d.filter(x => String(x.assignedMachine) === machineF);
    return d;
  }, [designs, search, machineF]);

  const openAdd = () => {
    setEditing(false);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: Design) => {
    setEditing(true);
    setSelected(d);
    setForm({
      designNumber: d.designNumber, weft: d.weft, weftMotorOrder: d.weftMotorOrder,
      warp: d.warp, hadafatCount: d.hadafatCount, assignedMachine: d.assignedMachine,
      imageUrl: d.imageUrl || '', notes: d.notes || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.designNumber.trim())  e.designNumber = 'رقم التصميم مطلوب';
    if (!form.weft.trim())          e.weft         = 'اللحمة مطلوبة';
    if (!form.warp.trim())          e.warp         = 'السدا مطلوب';
    if (!form.weftMotorOrder.trim()) e.weftMotorOrder = 'أمر المحرك مطلوب';
    if (form.hadafatCount < 1)      e.hadafatCount = 'عدد الحدافات يجب أن يكون أكبر من صفر';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (editing && selected) {
        await updateDesign(selected.id, form);
        toast('تم تحديث التصميم بنجاح');
      } else {
        await addDesign(form);
        toast('تمت إضافة التصميم بنجاح');
      }
      setModalOpen(false);
    } catch {
      toast('حدث خطأ، حاول مجدداً', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteDesign(selected.id);
      toast('تم حذف التصميم', 'success');
      setDeleteOpen(false);
      setSelected(null);
    } catch {
      toast('حدث خطأ أثناء الحذف', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'designNumber', title: 'رقم التصميم', render: (d: Design) => (
      <span className="font-mono font-bold text-gold">{d.designNumber}</span>
    )},
    { key: 'weft',  title: 'اللحمة',  render: (d: Design) => <span className="text-gray-300">{d.weft}</span> },
    { key: 'warp',  title: 'السدا',   render: (d: Design) => <span className="text-gray-300">{d.warp}</span> },
    { key: 'hadafatCount', title: 'الحدافات', render: (d: Design) => (
      <Badge color="blue">{d.hadafatCount}</Badge>
    )},
    { key: 'assignedMachine', title: 'الماكينة', render: (d: Design) => (
      <Badge color="purple">ماكينة {d.assignedMachine}</Badge>
    )},
    { key: 'createdAt', title: 'التاريخ', render: (d: Design) => (
      <span className="text-gray-500">{formatDate(d.createdAt)}</span>
    )},
    { key: 'actions', title: 'الإجراءات', render: (d: Design) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(d); setDetailOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          <Eye size={14} />
        </button>
        <button onClick={() => openEdit(d)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
          <Pencil size={14} />
        </button>
        <button onClick={() => { setSelected(d); setDeleteOpen(true); }}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="إدارة التصميمات"
        subtitle={`${designs.length} تصميم مسجل`}
        actions={
          <Button icon={<Plus size={16} />} onClick={openAdd}>إضافة تصميم</Button>
        }
      />

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم التصميم أو المادة..." />
          </div>
          <div className="min-w-44">
            <Select
              value={machineF}
              onChange={e => setMachineF(e.target.value)}
              options={MACHINE_OPTIONS}
              placeholder="كل الماكينات"
            />
          </div>
          {(search || machineF) && (
            <Button variant="ghost" icon={<X size={14} />} onClick={() => { setSearch(''); setMachineF(''); }}>
              مسح الفلاتر
            </Button>
          )}
          <div className="mr-auto text-sm text-gray-500">
            {filtered.length} نتيجة
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={filtered}
          rowKey={d => d.id}
          emptyText="لا توجد تصميمات — أضف تصميماً جديداً"
          emptyIcon={<Palette size={40} />}
          onRowClick={d => { setSelected(d); setDetailOpen(true); }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل التصميم' : 'إضافة تصميم جديد'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>
              {editing ? 'حفظ التعديلات' : 'إضافة التصميم'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم التصميم *"
            value={form.designNumber}
            onChange={e => setForm(p => ({ ...p, designNumber: e.target.value }))}
            placeholder="D-001"
            error={errors.designNumber}
          />
          <Select
            label="الماكينة المعينة *"
            value={String(form.assignedMachine)}
            onChange={e => setForm(p => ({ ...p, assignedMachine: Number(e.target.value) }))}
            options={MACHINE_OPTIONS}
          />
          <Input
            label="اللحمة (Weft) *"
            value={form.weft}
            onChange={e => setForm(p => ({ ...p, weft: e.target.value }))}
            placeholder="نوع خيط اللحمة"
            error={errors.weft}
          />
          <Input
            label="أمر محرك اللحمة للمريجات *"
            value={form.weftMotorOrder}
            onChange={e => setForm(p => ({ ...p, weftMotorOrder: e.target.value }))}
            placeholder="A1, B2..."
            error={errors.weftMotorOrder}
          />
          <Input
            label="السدا (Warp) *"
            value={form.warp}
            onChange={e => setForm(p => ({ ...p, warp: e.target.value }))}
            placeholder="نوع خيط السدا"
            error={errors.warp}
          />
          <Input
            label="عدد الحدافات *"
            type="number"
            min={1}
            value={form.hadafatCount}
            onChange={e => setForm(p => ({ ...p, hadafatCount: Number(e.target.value) }))}
            error={errors.hadafatCount}
          />
          <div className="sm:col-span-2">
            <Input
              label="رابط صورة التصميم"
              value={form.imageUrl}
              onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://... أو اتركه فارغاً"
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`تصميم ${selected.designNumber}`} size="lg">
          <div className="space-y-5">
            {selected.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-dark-border bg-dark-raised flex items-center justify-center h-48">
                <img src={selected.imageUrl} alt={selected.designNumber} className="max-h-full object-contain" />
              </div>
            )}
            {!selected.imageUrl && (
              <div className="rounded-xl border border-dark-border bg-dark-raised h-32 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Image size={32} />
                  <span className="text-sm">لا توجد صورة</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'رقم التصميم',    value: selected.designNumber },
                { label: 'اللحمة',         value: selected.weft },
                { label: 'أمر المحرك',    value: selected.weftMotorOrder },
                { label: 'السدا',          value: selected.warp },
                { label: 'عدد الحدافات', value: selected.hadafatCount },
                { label: 'الماكينة',      value: `ماكينة ${selected.assignedMachine}` },
              ].map(r => (
                <div key={r.label} className="bg-dark-raised rounded-xl p-3 border border-dark-border">
                  <p className="text-xs text-gray-500 mb-1">{r.label}</p>
                  <p className="text-sm font-semibold text-white">{r.value}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="bg-dark-raised rounded-xl p-3 border border-dark-border">
                <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                <p className="text-sm text-gray-300">{selected.notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" icon={<Pencil size={14} />} onClick={() => { setDetailOpen(false); openEdit(selected); }}>
                تعديل
              </Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { setDetailOpen(false); setDeleteOpen(true); }}>
                حذف
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
        title="حذف التصميم"
        message={`هل أنت متأكد من حذف التصميم "${selected?.designNumber}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
};
