import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Factory, Activity, Clock, Wrench, StopCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card, SectionHeader, ProgressBar, Modal } from '../components/ui';
import type { MachineStatus } from '../types';
import { formatDate, machineStatusBadge, machineStatusLabel, workOrderStatusBadge, workOrderStatusLabel } from '../lib/utils';

const STATUS_ICONS: Record<MachineStatus, React.ReactNode> = {
  active:      <Activity size={20} className="text-emerald-400" />,
  idle:        <Clock size={20} className="text-gray-400" />,
  maintenance: <Wrench size={20} className="text-amber-400" />,
  stopped:     <StopCircle size={20} className="text-red-400" />,
};

const STATUS_GRADIENTS: Record<MachineStatus, string> = {
  active:      'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
  idle:        'from-gray-500/10 to-gray-500/5 border-gray-500/20',
  maintenance: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
  stopped:     'from-red-500/10 to-red-500/5 border-red-500/20',
};

export const Machines: React.FC = () => {
  const { workOrders } = useData();
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const machines = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    const activeWO = workOrders.find(w => w.machineNumber === num && w.status === 'in_production');
    const allWOs   = workOrders.filter(w => w.machineNumber === num);
    const completed = allWOs.filter(w => w.status === 'completed' || w.status === 'delivered').length;
    const delayed   = allWOs.filter(w => w.status === 'delayed').length;
    const status: MachineStatus = activeWO ? 'active' : 'idle';
    return { number: num, status, activeWO, allWOs, completed, delayed };
  }), [workOrders]);

  const activeMachines = machines.filter(m => m.status === 'active').length;
  const selectedM = selectedMachine !== null ? machines.find(m => m.number === selectedMachine) : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="إدارة الماكينات"
        subtitle={`${activeMachines} ماكينة نشطة من أصل 10`}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-emerald-400">{activeMachines}</p>
          <p className="text-xs text-gray-500 mt-1">نشطة</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-400">{10 - activeMachines}</p>
          <p className="text-xs text-gray-500 mt-1">خاملة</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-amber-400">{machines.filter(m => m.delayed > 0).length}</p>
          <p className="text-xs text-gray-500 mt-1">بها تأخير</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-white">{workOrders.reduce((s, w) => s + w.producedQuantity, 0).toLocaleString('ar-EG')}</p>
          <p className="text-xs text-gray-500 mt-1">متر منتج إجمالي</p>
        </Card>
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {machines.map(m => (
          <motion.div
            key={m.number}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedMachine(m.number); setDetailOpen(true); }}
            className={`relative bg-gradient-to-br ${STATUS_GRADIENTS[m.status]} border rounded-2xl p-5 cursor-pointer
              transition-all duration-300 hover:shadow-lg`}
          >
            {/* Machine number */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${m.status === 'active' ? 'bg-emerald-500/20' : 'bg-dark-raised'}`}>
                <Factory size={20} className={m.status === 'active' ? 'text-emerald-400' : 'text-gray-500'} />
              </div>
              <div className="flex flex-col items-end gap-1">
                {STATUS_ICONS[m.status]}
                {m.status === 'active' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>

            <p className="text-2xl font-black text-white mb-0.5">ماكينة {m.number}</p>
            <span className={`badge text-xs ${machineStatusBadge[m.status]}`}>{machineStatusLabel[m.status]}</span>

            {m.activeWO && (
              <div className="mt-3 pt-3 border-t border-dark-border/30">
                <p className="text-xs text-gray-500 truncate">{m.activeWO.customerName}</p>
                <div className="mt-2">
                  <ProgressBar value={m.activeWO.producedQuantity} max={m.activeWO.quantity} size="sm" />
                  <p className="text-xs text-gray-600 mt-1">{m.activeWO.producedQuantity} / {m.activeWO.quantity} م</p>
                </div>
              </div>
            )}

            {!m.activeWO && (
              <div className="mt-3 pt-3 border-t border-dark-border/30">
                <p className="text-xs text-gray-600">لا يوجد أمر شغل نشط</p>
                <p className="text-xs text-gray-600 mt-1">تاريخ الطلبات: {m.allWOs.length}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* All work orders per machine bar chart summary */}
      <Card>
        <h3 className="font-semibold text-white mb-4">ملخص أداء الماكينات</h3>
        <div className="space-y-3">
          {machines.map(m => {
            const totalMeters = m.allWOs.reduce((s, w) => s + w.producedQuantity, 0);
            const maxMeters   = Math.max(...machines.map(mm => mm.allWOs.reduce((s, w) => s + w.producedQuantity, 0)), 1);
            return (
              <div key={m.number} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-400 flex-shrink-0">ماكينة {m.number}</div>
                <div className="flex-1">
                  <ProgressBar value={totalMeters} max={maxMeters} color={m.status === 'active' ? 'green' : 'gold'} />
                </div>
                <div className="w-24 text-sm text-gray-300 text-left flex-shrink-0">
                  {totalMeters.toLocaleString('ar-EG')} م
                </div>
                <span className={`badge text-xs ${machineStatusBadge[m.status]} flex-shrink-0`}>
                  {machineStatusLabel[m.status]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Machine Detail Modal */}
      {selectedM && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
          title={`ماكينة ${selectedM.number} — التفاصيل`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-raised border border-dark-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">الحالة</p>
                <span className={`badge ${machineStatusBadge[selectedM.status]}`}>
                  {machineStatusLabel[selectedM.status]}
                </span>
              </div>
              <div className="bg-dark-raised border border-dark-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-white">{selectedM.allWOs.length}</p>
              </div>
              <div className="bg-dark-raised border border-dark-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">مكتملة</p>
                <p className="text-2xl font-bold text-emerald-400">{selectedM.completed}</p>
              </div>
              <div className="bg-dark-raised border border-dark-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">متأخرة</p>
                <p className={`text-2xl font-bold ${selectedM.delayed > 0 ? 'text-red-400' : 'text-white'}`}>{selectedM.delayed}</p>
              </div>
            </div>

            {selectedM.activeWO && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-emerald-500 font-medium uppercase tracking-wider mb-3">أمر شغل نشط حالياً</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">رقم الأمر: </span><span className="text-gold font-mono">{selectedM.activeWO.orderNumber}</span></div>
                  <div><span className="text-gray-500">العميل: </span><span className="text-white">{selectedM.activeWO.customerName}</span></div>
                  <div><span className="text-gray-500">الصنف: </span><span className="text-white">{selectedM.activeWO.item}</span></div>
                  <div><span className="text-gray-500">التسليم: </span><span className="text-white">{formatDate(selectedM.activeWO.expectedDelivery)}</span></div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={selectedM.activeWO.producedQuantity} max={selectedM.activeWO.quantity} color="green" showLabel />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{selectedM.activeWO.producedQuantity} متر منتج</span>
                    <span>{selectedM.activeWO.quantity} متر مطلوب</span>
                  </div>
                </div>
              </div>
            )}

            {/* Work order history */}
            {selectedM.allWOs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">سجل الطلبات</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedM.allWOs.map(wo => (
                    <div key={wo.id} className="flex items-center justify-between bg-dark-raised border border-dark-border rounded-xl px-4 py-2.5">
                      <div>
                        <span className="font-mono text-gold text-sm">{wo.orderNumber}</span>
                        <span className="text-gray-400 text-sm mr-2">— {wo.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{wo.producedQuantity}/{wo.quantity} م</span>
                        <span className={`badge text-xs ${workOrderStatusBadge[wo.status]}`}>{workOrderStatusLabel[wo.status]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
