import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowUpDown, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, Textarea, ConfirmDialog, SectionHeader, Table } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency } from '../../lib/utils';
import type { InventoryItem, InventoryMovement } from '../../types';

const blank = { name: '', type: 'POY', quantity: 0, unit: 'كيلو', minStock: 500, costPerUnit: 0 };
const movBlank = { itemId: '', itemName: '', movementType: 'add' as 'add'|'withdraw', quantity: 0, notes: '', date: new Date().toISOString().split('T')[0] };

export const POYWarehouse: React.FC = () => {
  const { inventoryItems, inventoryMovements, addInventoryItem, updateInventoryItem, deleteInventoryItem, addMovement } = useData();
  const { toast } = useToast();
  const [openAdd,    setOpenAdd]    = useState(false);
  const [openMov,    setOpenMov]    = useState(false);
  const [form,       setForm]       = useState({ ...blank });
  const [movForm,    setMovForm]    = useState({ ...movBlank });
  const [deleteId,   setDeleteId]   = useState<string|null>(null);
  const [selItem,    setSelItem]    = useState<InventoryItem|null>(null);

  const poyItems = useMemo(() => inventoryItems.filter(i => i.warehouse === 'poy'), [inventoryItems]);
  const poyMovements = useMemo(() =>
    inventoryMovements.filter(m => {
      const id = poyItems.find(i => i.name === m.itemName)?.id;
      return id !== undefined;
    }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50),
    [inventoryItems, inventoryMovements, poyItems]
  );

  const stats = useMemo(() => ({
    totalQty:  poyItems.reduce((s,i)=>s+i.quantity,0),
    totalVal:  poyItems.reduce((s,i)=>s+i.quantity*(i.costPerUnit??0),0),
    lowStock:  poyItems.filter(i=>i.quantity<=i.minStock).length,
    avgCost:   poyItems.length > 0 ? poyItems.reduce((s,i)=>s+(i.costPerUnit??0),0)/poyItems.length : 0,
  }), [poyItems]);

  const handleAddItem = async () => {
    if (!form.name) { toast('اسم المادة مطلوب', 'error'); return; }
    await addInventoryItem({ ...form, warehouse: 'poy' });
    toast('تم إضافة الصنف لمخزن POY');
    setOpenAdd(false); setForm({ ...blank });
  };

  const openMovModal = (item: InventoryItem) => {
    setSelItem(item);
    setMovForm({ ...movBlank, itemId: item.id, itemName: item.name });
    setOpenMov(true);
  };

  const handleMovement = async () => {
    if (!movForm.quantity || movForm.quantity <= 0) { toast('أدخل كمية صالحة', 'error'); return; }
    if (!selItem) return;
    const newQty = movForm.movementType === 'add'
      ? selItem.quantity + movForm.quantity
      : selItem.quantity - movForm.quantity;

    if (newQty < 0) { toast('الكمية أكبر من المتاح في المخزن', 'error'); return; }
    await addMovement({ ...movForm, movementType: movForm.movementType === 'add' ? 'add' : 'withdraw', warehouse: 'poy', previousQuantity: selItem.quantity, newQuantity: newQty });
    await updateInventoryItem(selItem.id, { quantity: newQty, updatedAt: new Date().toISOString() });
    toast(movForm.movementType === 'add' ? `تم إضافة ${movForm.quantity} ${selItem.unit}` : `تم سحب ${movForm.quantity} ${selItem.unit}`);
    setOpenMov(false); setMovForm({ ...movBlank });
  };

  const set    = (k: keyof typeof blank,    v: unknown) => setForm(p    => ({ ...p, [k]: v }));
  const setMov = (k: keyof typeof movBlank, v: unknown) => setMovForm(p => ({ ...p, [k]: v }));

  const itemColumns = [
    { key: 'name', title: 'الصنف', render: (r: InventoryItem) => (
      <div>
        <p className="font-semibold text-gray-200">{r.name}</p>
        <p className="text-xs text-gray-600">{r.type}</p>
      </div>
    )},
    { key: 'quantity', title: 'الكمية', render: (r: InventoryItem) => (
      <div>
        <p className={`font-bold text-lg ${r.quantity <= r.minStock ? 'text-red-400' : 'text-white'}`}>{r.quantity.toLocaleString()}</p>
        <p className="text-xs text-gray-600">{r.unit}</p>
      </div>
    )},
    { key: 'minStock', title: 'الحد الأدنى', render: (r: InventoryItem) => (
      <span className={`text-sm ${r.quantity<=r.minStock?'text-red-400 font-bold':'text-gray-500'}`}>{r.minStock.toLocaleString()} {r.unit}</span>
    )},
    { key: 'costPerUnit', title: 'التكلفة/كيلو', render: (r: InventoryItem) => <span className="text-amber-400 font-semibold">{formatCurrency(r.costPerUnit ?? 0)}</span> },
    { key: 'value', title: 'القيمة الإجمالية', render: (r: InventoryItem) => <span className="text-green-pale font-bold">{formatCurrency(r.quantity * (r.costPerUnit ?? 0))}</span> },
    { key: 'updated', title: 'آخر تحديث', render: (r: InventoryItem) => <span className="text-gray-600 text-xs">{formatDate(r.updatedAt)}</span> },
    { key: 'actions', title: '', render: (r: InventoryItem) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" icon={<ArrowUpDown size={13}/>} onClick={()=>openMovModal(r)}>حركة</Button>
        <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
      </div>
    )},
  ];

  const movColumns = [
    { key: 'date',       title: 'التاريخ', render: (r: InventoryMovement) => <span className="text-gray-400 text-xs">{formatDate(r.createdAt)}</span> },
    { key: 'itemName',   title: 'الصنف',   render: (r: InventoryMovement) => <span className="text-gray-300 text-sm">{r.itemName}</span> },
    { key: 'type',       title: 'النوع',   render: (r: InventoryMovement) => (
      <span className={`badge ${r.movementType==='add' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
        {r.movementType==='add' ? 'إضافة' : 'سحب'}
      </span>
    )},
    { key: 'quantity',   title: 'الكمية', render: (r: InventoryMovement) => <span className={`font-bold ${r.movementType==='add'?'text-emerald-400':'text-red-400'}`}>{r.movementType==='add'?'+':'-'}{r.quantity.toLocaleString()}</span> },
    { key: 'prev',       title: 'قبل', render: (r: InventoryMovement) => <span className="text-gray-600 text-xs">{r.previousQuantity?.toLocaleString()}</span> },
    { key: 'after',      title: 'بعد', render: (r: InventoryMovement) => <span className="text-gray-400 text-xs">{r.newQuantity?.toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="مخزن POY" subtitle="إدارة خيوط البوليستر الخام (POY) — مرتبط بالاستيراد"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpenAdd(true)}>إضافة صنف</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الكميات</p>
          <p className="text-2xl font-bold text-white">{stats.totalQty.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">كيلوجرام</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">القيمة الإجمالية</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalVal)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">متوسط تكلفة الكيلو</p>
          <p className="text-xl font-bold text-green-pale">{formatCurrency(stats.avgCost)}</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${stats.lowStock>0?'bg-red-500/5 border-red-500/20':'bg-dark-card border-dark-border'}`}>
          <p className="text-xs text-gray-500 mb-1">أصناف تحت الحد الأدنى</p>
          <p className={`text-2xl font-bold ${stats.lowStock>0?'text-red-400':'text-emerald-400'}`}>{stats.lowStock}</p>
        </div>
      </div>

      <Table columns={itemColumns} data={poyItems} rowKey={r=>r.id}
        emptyText="لا توجد أصناف في مخزن POY" emptyIcon="🧵" />

      {poyMovements.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center gap-2">
            <TrendingUp size={16} className="text-green-pale" />
            <h3 className="font-semibold text-white">آخر حركات المخزن</h3>
          </div>
          <Table columns={movColumns} data={poyMovements} rowKey={r=>r.id} emptyText="" emptyIcon="📋" />
        </div>
      )}

      {/* Add Item Modal */}
      <Modal open={openAdd} onClose={()=>setOpenAdd(false)} title="إضافة صنف POY جديد" size="sm"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpenAdd(false)}>إلغاء</Button><Button className="flex-1" onClick={handleAddItem}>إضافة</Button></div>}>
        <div className="space-y-4">
          <Input label="اسم الصنف *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="POY بوليستر 75D..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الكمية الافتتاحية (كيلو)" type="number" value={form.quantity||''} onChange={e=>set('quantity',Number(e.target.value))} />
            <Input label="الحد الأدنى للمخزون" type="number" value={form.minStock||''} onChange={e=>set('minStock',Number(e.target.value))} />
          </div>
          <Input label="التكلفة لكل كيلو (جنيه)" type="number" value={form.costPerUnit||''} onChange={e=>set('costPerUnit',Number(e.target.value))} />
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal open={openMov} onClose={()=>setOpenMov(false)} title={`حركة مخزن — ${selItem?.name}`} size="sm"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpenMov(false)}>إلغاء</Button><Button className="flex-1" onClick={handleMovement}>تنفيذ الحركة</Button></div>}>
        <div className="space-y-4">
          {selItem && (
            <div className="bg-dark-raised border border-dark-border rounded-xl p-3 flex justify-between text-sm">
              <span className="text-gray-500">المتاح حالياً:</span>
              <span className="font-bold text-white">{selItem.quantity.toLocaleString()} {selItem.unit}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع الحركة" value={movForm.movementType} onChange={e=>setMov('movementType',e.target.value as 'add'|'remove')}
              options={[{value:'add',label:'إضافة إلى المخزن'},{value:'withdraw',label:'سحب من المخزن'}]} />
            <Input label="التاريخ" type="date" value={movForm.date} onChange={e=>setMov('date',e.target.value)} />
          </div>
          <Input label="الكمية (كيلو) *" type="number" value={movForm.quantity||''} onChange={e=>setMov('quantity',Number(e.target.value))} />
          <Textarea label="ملاحظات" value={movForm.notes} onChange={e=>setMov('notes',e.target.value)} rows={2} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{await deleteInventoryItem(deleteId!); setDeleteId(null); toast('تم الحذف');}}
        title="حذف الصنف" message="هل تريد حذف هذا الصنف من مخزن POY؟" />
    </div>
  );
};
