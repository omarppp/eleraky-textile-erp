import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <div className="min-h-screen bg-dark-bg flex" dir="rtl">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      <motion.main
        animate={{ marginRight: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 flex flex-col min-h-screen"
        style={{ marginRight: sidebarWidth }}
      >
        <Navbar sidebarWidth={sidebarWidth} />
        <div className="flex-1 mt-16 p-6 overflow-auto">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};
