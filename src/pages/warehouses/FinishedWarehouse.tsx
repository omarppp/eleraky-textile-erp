import React from 'react';
import { Archive } from 'lucide-react';
import { WarehouseBase } from './WarehouseBase';

export const FinishedWarehouse: React.FC = () => (
  <WarehouseBase
    warehouse="finished"
    title="مخزن المنتج النهائي"
    subtitle="إدارة المنتجات النهائية — تخزين وبيع وتسليم"
    icon={<Archive size={24} />}
    color="green"
  />
);
