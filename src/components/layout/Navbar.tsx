import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronDown, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { roleLabel } from '../../lib/utils';

export const Navbar: React.FC<{ sidebarWidth: number }> = ({ sidebarWidth }) => {
  const { user, logout, role } = useAuth();
  const { workOrders, inventoryItems, cheques } = useData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  const lowStock   = inventoryItems.filter(i => i.quantity <= i.minStock);
  const delayed    = workOrders.filter(w => w.status === 'delayed');
  const dueCheques = cheques.filter(c => c.status === 'pending' && new Date(c.dueDate) <= new Date(Date.now() + 7 * 86400000));
  const notifCount = lowStock.length + delayed.length + dueCheques.length;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'مدير النظام';

  return (
    <header className="h-16 bg-dark-surface border-b border-dark-border fixed top-0 left-0 z-30 flex items-center px-4 gap-4"
      style={{ right: sidebarWidth, left: 0 }}>
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
          <input type="text" placeholder="بحث سريع..."
            className="w-full bg-dark-card border border-dark-border rounded-xl pr-9 pl-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-green/50 transition-all duration-200" />
        </div>
      </div>

      <div className="flex items-center gap-2 mr-auto">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
            className="relative w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-gray-400 hover:text-white hover:border-green/30 transition-all duration-200">
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{notifCount}</span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute left-0 top-12 w-80 bg-dark-card border border-dark-border rounded-2xl shadow-card-lg z-50">
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">التنبيهات</h3>
                  {notifCount > 0 && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30">{notifCount} تنبيه</span>}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-dark-border/50">
                  {delayed.map(w => (
                    <div key={w.id} className="p-4 hover:bg-dark-hover">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                        <div><p className="text-sm text-gray-300 font-medium">أمر شغل متأخر</p><p className="text-xs text-gray-500 mt-0.5">{w.orderNumber} — {w.customerName}</p></div>
                      </div>
                    </div>
                  ))}
                  {lowStock.map(i => (
                    <div key={i.id} className="p-4 hover:bg-dark-hover">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                        <div><p className="text-sm text-gray-300 font-medium">مخزون منخفض</p><p className="text-xs text-gray-500 mt-0.5">{i.name} — {i.quantity} {i.unit}</p></div>
                      </div>
                    </div>
                  ))}
                  {dueCheques.map(c => (
                    <div key={c.id} className="p-4 hover:bg-dark-hover">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-pale mt-2 flex-shrink-0" />
                        <div><p className="text-sm text-gray-300 font-medium">شيك مستحق قريباً</p><p className="text-xs text-gray-500 mt-0.5">{c.chequeNumber} — {c.customerName} — {c.amount.toLocaleString()} ج</p></div>
                      </div>
                    </div>
                  ))}
                  {notifCount === 0 && <div className="p-8 text-center text-gray-600 text-sm">لا توجد تنبيهات</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-card border border-dark-border hover:border-green/30 transition-all duration-200">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green to-green-dark flex items-center justify-center">
              <span className="text-white font-bold text-xs">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{displayName}</p>
              <p className="text-[10px] text-green-pale/80">{roleLabel[role]}</p>
            </div>
            <ChevronDown size={12} className={`text-gray-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute left-0 top-12 w-56 bg-dark-card border border-dark-border rounded-2xl shadow-card-lg z-50 overflow-hidden">
                <div className="p-4 border-b border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green to-green-dark flex items-center justify-center">
                      <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{displayName}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Shield size={10} className="text-green-pale" />
                        <p className="text-[10px] text-green-pale">{roleLabel[role]}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-dark-hover transition-all duration-200">
                    <Settings size={15} /><span>الإعدادات</span>
                  </button>
                  <div className="border-t border-dark-border my-1" />
                  <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200">
                    <LogOut size={15} /><span>تسجيل الخروج</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
