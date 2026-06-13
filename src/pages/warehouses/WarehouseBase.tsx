import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, TrendingDown, TrendingUp, Sliders } from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  Button, Card, Badge, Modal, Input, Select, Textarea,
  ConfirmDialog, SearchInput, SectionHeader, Table, Tabs, useToast,
} from '../../components/ui';
import type { InventoryItem, InventoryMovement, MovementType } from '../../types';
import { formatDate, movementTypeBadge, movementTypeLabel } from '../../lib/utils';

import type { WarehouseType } from '../../types';

interface WarehouseBaseProps {
  warehouse: WarehouseType;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  color?: 'gold' | 'blue' | 'green' | 'purple';
}

const MOVEMENT_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'add',      label: 'إضافة' },
  { value: 'withdraw', label: 'سحب' },
  { value: 'adjust',   label: 'تسوية' },
];

const emptyItemForm = () => ({
  name: '', type: '', quantity: 0, unit: 'كيلو', minStock: 100, notes: '',
});

const emptyMovForm = () => ({
  itemId: '', movementType: 'add' as MovementType, quantity: 0, notes: '', date: new Date().toISOString().split('T')[0],
});

export const WarehouseBase: React.FC<WarehouseBaseProps> = ({ warehouse, title, subtitle }) => {
  const { inventoryItems, inventoryMovements, addInventoryItem, updateInventoryItem, deleteInventoryItem, addMovement } = useData();
  const { toast } = useToast();

  const [activeTab,   setActiveTab]   = useState('items');
  const [search,      setSearch]      = useState('');
  const [itemModal,   setItemModal]   = useState(false);
  const [movModal,    setMovModal]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [selected,    setSelected]    = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [itemForm,    setItemForm]    = useState(emptyItemForm());
  const [movForm,     setMovForm]     = useState(emptyMovForm());
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<string, string>>>({});

  const warehouseItems = useMemo(() =>
    inventoryItems.filter(i => i.warehouse === warehouse).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [inventoryItems, warehouse]
  );

  const warehouseMovements = useMemo(() =>
    inventoryMovements.filter(m => m.warehouse === warehouse).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [inventoryMovements, warehouse]
  );

  const lowStockItems = warehouseItems.filter(i => i.quantity <= i.minStock);

  const filteredItems = useMemo(() =>
    search ? warehouseItems.filter(i => i.name.includes(search) || i.type.includes(search)) : warehouseItems,
    [warehouseItems, search]
  );

  const totalQty = warehouseItems.reduce((s, i) => s + i.quantity, 0);

  const openAddItem = () => { setEditingItem(false); setItemForm(emptyItemForm()); setErrors({}); setItemModal(true); };
  const openEditItem = (item: InventoryItem) => {
    setEditingItem(true); setSelected(item);
    setItemForm({ name: item.name, type: item.type, quantity: item.quantity, unit: item.unit, minStock: item.minStock, notes: item.notes || '' });
    setErrors({}); setItemModal(true);
  };
  const openMov = (item?: InventoryItem) => {
    setMovForm({ ...emptyMovForm(), itemId: item?.id || '' });
    setMovModal(true);
  };

  const validateItem = () => {
    const e: Partial<Record<string, string>> = {};
    if (!itemForm.name.trim())   e.name     = 'الاسم مطلوب';
    if (!itemForm.type.trim())   e.type     = 'النوع مطلوب';
    if (itemForm.quantity < 0)   e.quantity = 'الكمية غير صالحة';
    if (!itemForm.unit.trim())   e.unit     = 'الوحدة مطلوبة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveItem = async () => {
    if (!validateItem()) return;
    setLoading(true);
    try {
      if (editingItem && selected) {
        await updateInventoryItem(selected.id, itemForm);
        toast('تم تحديث المادة');
      } else {
        await addInventoryItem({ ...itemForm, warehouse });
        toast('تمت إضافة المادة');
      }
      setItemModal(false);
    } catch { toast('حدث خطأ', 'error'); }
    finally { setLoading(false); }
  };

  const handleMovement = async () => {
    if (!movForm.itemId) { toast('اختر مادة', 'warning'); return; }
    if (movForm.quantity <= 0) { toast('الكمية يجب أن تكون أكبر من صفر', 'warning'); return; }
    const item = warehouseItems.find(i => i.id === movForm.itemId);
    if (!item) return;
    if ((movForm.movementType === 'withdraw') && movForm.quantity > item.quantity) {
      toast('الكمية المسحوبة تتجاوز الرصيد المتاح', 'error'); return;
    }
    setLoading(true);
    try {
      const delta = movForm.movementType === 'add' ? movForm.quantity
                  : movForm.movementType === 'withdraw' ? -movForm.quantity : 0;
      const newQty = movForm.movementType === 'adjust' ? movForm.quantity : item.quantity + delta;
      await updateInventoryItem(item.id, { quantity: newQty });
      await addMovement({
        itemId: item.id, itemName: item.name, warehouse,
        movementType: movForm.movementType,
        quantity: movForm.quantity,
        previousQuantity: item.quantity,
        newQuantity: newQty,
        notes: movForm.notes,
        date: movForm.date,
      });
      toast(movForm.movementType === 'add' ? 'تمت الإضافة بنجاح' : movForm.movementType === 'withdraw' ? 'تم السحب بنجاح' : 'تمت التسوية');
      setMovModal(false);
    } catch { toast('حدث خطأ', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteInventoryItem(selected.id);
      toast('تم حذف المادة');
      setDeleteOpen(false); setSelected(null);
    } catch { toast('حدث خطأ أثناء الحذف', 'error'); }
    finally { setLoading(false); }
  };

  const itemColumns = [
    { key: 'name', title: 'اسم المادة', render: (i: InventoryItem) => (
      <div className="flex items-center gap-2">
        {i.quantity <= i.minStock && <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />}
        <span className="font-medium text-white">{i.name}</span>
      </div>
    )},
    { key: 'type',     title: 'النوع',    render: (i: InventoryItem) => <Badge color="blue">{i.type}</Badge> },
    { key: 'quantity', title: 'الكمية',   render: (i: InventoryItem) => (
      <span className={`font-bold text-lg ${i.quantity <= i.minStock ? 'text-red-400' : 'text-white'}`}>
        {i.quantity} <span className="text-xs font-normal text-gray-500">{i.unit}</span>
      </span>
    )},
    { key: 'minStock', title: 'الحد الأدنى', render: (i: InventoryItem) => (
      <span className="text-gray-400">{i.minStock} {i.unit}</span>
    )},
    { key: 'updatedAt', title: 'آخر تحديث', render: (i: InventoryItem) => (
      <span className="text-gray-500 text-xs">{formatDate(i.updatedAt)}</span>
    )},
    { key: 'actions', title: '', render: (i: InventoryItem) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => openMov(i)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="حركة مخزون">
          <TrendingUp size={14} />
        </button>
        <button onClick={() => openEditItem(i)}
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

  const movColumns = [
    { key: 'itemName', title: 'المادة', render: (m: InventoryMovement) => (
      <span className="font-medium text-white">{m.itemName}</span>
    )},
    { key: 'movementType', title: 'نوع الحركة', render: (m: InventoryMovement) => (
      <span className={`badge ${movementTypeBadge[m.movementType]}`}>{movementTypeLabel[m.movementType]}</span>
    )},
    { key: 'quantity', title: 'الكمية', render: (m: InventoryMovement) => (
      <div className="flex items-center gap-1">
        {m.movementType === 'withdraw' || m.movementType === 'auto_deduction'
          ? <TrendingDown size={12} className="text-red-400" />
          : <TrendingUp size={12} className="text-emerald-400" />}
        <span className={`font-semibold ${m.movementType === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
          {m.movementType === 'withdraw' || m.movementType === 'auto_deduction' ? '-' : '+'}{m.quantity}
        </span>
      </div>
    )},
    { key: 'previousQuantity', title: 'السابق',  render: (m: InventoryMovement) => <span className="text-gray-500">{m.previousQuantity}</span> },
    { key: 'newQuantity',      title: 'الجديد',  render: (m: InventoryMovement) => <span className="text-gray-300 font-medium">{m.newQuantity}</span> },
    { key: 'date',    title: 'التاريخ', render: (m: InventoryMovement) => <span className="text-gray-500 text-xs">{formatDate(m.date)}</span> },
    { key: 'notes',   title: 'ملاحظات', render: (m: InventoryMovement) => <span className="text-gray-500 text-xs truncate max-w-32">{m.notes || '—'}</span> },
  ];

  const tabItems = [
    { key: 'items',     label: 'المواد',   count: warehouseItems.length },
    { key: 'movements', label: 'الحركات', count: warehouseMovements.length },
    { key: 'alerts',    label: 'التنبيهات', count: lowStockItems.length },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" icon={<Sliders size={16} />} onClick={() => openMov()}>تسجيل حركة</Button>
            <Button icon={<Plus size={16} />} onClick={openAddItem}>إضافة مادة</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{warehouseItems.length}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي المواد</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{totalQty.toLocaleString('ar-EG')}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي الكميات</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {lowStockItems.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">مواد منخفضة</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{warehouseMovements.length}</p>
          <p className="text-xs text-gray-500 mt-1">حركات مسجلة</p>
        </Card>
      </div>

      <Tabs tabs={tabItems} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'items' && (
        <>
          <Card>
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو النوع..." />
          </Card>
          <Card padding={false}>
            <Table columns={itemColumns} data={filteredItems} rowKey={i => i.id}
              emptyText="لا توجد مواد — أضف مادة جديدة" />
          </Card>
        </>
      )}

      {activeTab === 'movements' && (
        <Card padding={false}>
          <Table columns={movColumns} data={warehouseMovements} rowKey={m => m.id}
            emptyText="لا توجد حركات مخزون" />
        </Card>
      )}

      {activeTab === 'alerts' && (
        <Card padding={false}>
          {lowStockItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-emerald-400 font-medium">✓ جميع المواد فوق الحد الأدنى</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-5 hover:bg-dark-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <AlertTriangle size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-red-400">{item.quantity} {item.unit}</p>
                    <p className="text-xs text-gray-500">الحد الأدنى: {item.minStock} {item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Item Modal */}
      <Modal open={itemModal} onClose={() => setItemModal(false)}
        title={editingItem ? 'تعديل المادة' : 'إضافة مادة جديدة'} size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setItemModal(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSaveItem}>
              {editingItem ? 'حفظ' : 'إضافة'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="اسم المادة *" value={itemForm.name}
              onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} error={errors.name} />
          </div>
          <Input label="النوع *" value={itemForm.type}
            onChange={e => setItemForm(p => ({ ...p, type: e.target.value }))}
            placeholder="خيط، قماش، ..." error={errors.type} />
          <Input label="الوحدة *" value={itemForm.unit}
            onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
            placeholder="كيلو، متر، ..." error={errors.unit} />
          <Input label="الكمية الابتدائية" type="number" min={0} value={itemForm.quantity}
            onChange={e => setItemForm(p => ({ ...p, quantity: Number(e.target.value) }))} error={errors.quantity} />
          <Input label="الحد الأدنى للتنبيه" type="number" min={0} value={itemForm.minStock}
            onChange={e => setItemForm(p => ({ ...p, minStock: Number(e.target.value) }))} />
          <div className="col-span-2">
            <Textarea label="ملاحظات" value={itemForm.notes}
              onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal open={movModal} onClose={() => setMovModal(false)} title="تسجيل حركة مخزون" size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setMovModal(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleMovement}>تسجيل الحركة</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="المادة *" value={movForm.itemId}
            onChange={e => setMovForm(p => ({ ...p, itemId: e.target.value }))}
            options={warehouseItems.map(i => ({ value: i.id, label: `${i.name} (${i.quantity} ${i.unit})` }))}
            placeholder="اختر مادة..." />
          <Select label="نوع الحركة *" value={movForm.movementType}
            onChange={e => setMovForm(p => ({ ...p, movementType: e.target.value as MovementType }))}
            options={MOVEMENT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          <Input label={movForm.movementType === 'adjust' ? 'الكمية الجديدة *' : 'الكمية *'}
            type="number" min={0} value={movForm.quantity}
            onChange={e => setMovForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          <Input label="التاريخ" type="date" value={movForm.date}
            onChange={e => setMovForm(p => ({ ...p, date: e.target.value }))} />
          <Textarea label="ملاحظات" value={movForm.notes}
            onChange={e => setMovForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف المادة"
        message={`هل أنت متأكد من حذف "${selected?.name}"؟ سيتم حذف جميع بيانات هذه المادة.`}
      />
    </div>
  );
};
