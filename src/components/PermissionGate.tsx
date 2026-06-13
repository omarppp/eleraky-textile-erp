import React from 'react';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { PermissionModule, PermissionAction } from '../types';

export const AccessDenied: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]" dir="rtl">
    <div className="text-center space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <ShieldOff size={36} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white">ليس لديك صلاحية للوصول إلى هذه الصفحة</h2>
      <p className="text-gray-400 text-sm">{message ?? 'تواصل مع مدير النظام للحصول على الصلاحيات اللازمة'}</p>
    </div>
  </div>
);

interface PermissionGateProps {
  module:      PermissionModule;
  action?:     PermissionAction;
  children:    React.ReactNode;
  fallback?:   React.ReactNode;
  showDenied?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module, action = 'view', children, fallback, showDenied = false,
}) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(module, action)) {
    if (fallback) return <>{fallback}</>;
    if (showDenied) return <AccessDenied />;
    return null;
  }
  return <>{children}</>;
};
