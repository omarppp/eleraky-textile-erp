import React from 'react';
import { Recycle } from 'lucide-react';
import { WarehouseBase } from './WarehouseBase';

export const ReusableWarehouse: React.FC = () => (
  <WarehouseBase
    warehouse="reusable"
    title="مخزن قابل لإعادة الاستخدام"
    subtitle="إدارة الأقمشة القابلة لإعادة الاستخدام"
    icon={<Recycle size={24} />}
    color="purple"
  />
);
