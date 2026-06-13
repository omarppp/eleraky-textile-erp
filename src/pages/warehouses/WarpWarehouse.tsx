import React from 'react';
import { Layers } from 'lucide-react';
import { WarehouseBase } from './WarehouseBase';

export const WarpWarehouse: React.FC = () => (
  <WarehouseBase
    warehouse="warp"
    title="مخزن خامات السدا"
    subtitle="إدارة خامات السدا (Warp) — إضافة، سحب، تسوية يدوية فقط"
    icon={<Layers size={24} />}
    color="blue"
  />
);
