import React from 'react';
import { Package } from 'lucide-react';
import { WarehouseBase } from './WarehouseBase';

export const WeftWarehouse: React.FC = () => (
  <WarehouseBase
    warehouse="weft"
    title="مخزن خامات اللحمة"
    subtitle="إدارة خامات اللحمة (Weft) — إضافة، سحب، تسوية"
    icon={<Package size={24} />}
    color="gold"
  />
);
