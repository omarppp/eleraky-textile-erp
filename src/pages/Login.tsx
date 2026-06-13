import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i, size: Math.random() * 3 + 1,
  x: Math.random() * 100, y: Math.random() * 100,
  delay: Math.random() * 8, duration: Math.random() * 10 + 8,
}));

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('refaateleraky7@gmail.com');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message || 'حدث خطأ، حاول مجدداً');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex" dir="rtl">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-dark-bg">
          <img src="/phpto1.png" alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-dark-bg/50 to-dark-bg" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-dark-bg/70" />
        </div>

        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#1B5E2A 1px, transparent 1px), linear-gradient(90deg, #1B5E2A 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="absolute inset-0">
          {PARTICLES.map(p => (
            <motion.div key={p.id} style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
              className="absolute rounded-full bg-green/30"
              animate={{ y: [0, -30, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 gap-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: mounted ? 1 : 0, scale: mounted ? 1 : 0.8 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-36 h-36 rounded-3xl bg-white shadow-glow flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Eleraky Textile" className="w-28 h-28 object-contain" />
              </div>
              <div className="absolute inset-0 rounded-3xl border-2 border-green/30 animate-spin-slow scale-110" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-black text-white tracking-wide">Eleraky Textile</h1>
              <p className="text-green-pale/80 font-medium text-sm mt-2 tracking-[0.3em] uppercase">Factory Management System</p>
              <p className="text-gray-500 text-sm mt-2 italic">Threads That Inspire, Fabrics That Last</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {[
              { icon: '🏭', label: 'إدارة الإنتاج' },
              { icon: '💰', label: 'الماليات' },
              { icon: '📦', label: 'المستودعات' },
              { icon: '🚢', label: 'الاستيراد' },
              { icon: '👥', label: 'العملاء' },
              { icon: '📊', label: 'التقارير' },
            ].map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -20 }} transition={{ delay: 0.7 + i * 0.08 }}
                className="flex items-center gap-2 bg-dark-card/60 border border-dark-border/60 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-gray-300 font-medium">{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-[460px] flex flex-col items-center justify-center p-8 relative bg-dark-bg lg:bg-dark-surface lg:border-r lg:border-dark-border">
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(#1B5E2A 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-brand flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Eleraky Textile" className="w-16 h-16 object-contain" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white tracking-wide">Eleraky Textile</h1>
              <p className="text-green-pale text-xs tracking-widest uppercase mt-0.5">Factory Management</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-dark-card border border-dark-border rounded-3xl p-8 shadow-card-lg">

            {/* Form header */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 bg-green rounded-full" />
                <h2 className="text-2xl font-bold text-white">تسجيل الدخول</h2>
              </div>
              <p className="text-gray-500 text-sm mt-1 mr-3">أدخل بياناتك للوصول إلى <span className="text-green-pale font-medium">Eleraky Textile</span></p>
            </div>

            {!isFirebaseConfigured && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-5">
                <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300 leading-relaxed">
                  <p className="font-bold">النظام غير مُهيَّأ</p>
                  <p>افتح ملف <code className="bg-amber-500/20 px-1 rounded">.env</code> وأضف بيانات الاتصال</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-400">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@eleraky.com" autoComplete="email"
                    className="w-full bg-dark-surface border border-dark-border rounded-xl pr-10 pl-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green/60 focus:ring-2 focus:ring-green/15 transition-all duration-200" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-400">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full bg-dark-surface border border-dark-border rounded-xl pr-10 pl-10 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green/60 focus:ring-2 focus:ring-green/15 transition-all duration-200" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-green-pale transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full bg-green hover:bg-green-light text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-brand hover:shadow-brand disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? (<><Loader2 size={18} className="animate-spin" /><span>جارٍ تسجيل الدخول...</span></>)
                  : <span>دخول النظام</span>}
              </motion.button>
            </form>

            <p className="text-center text-xs text-gray-600 mt-6">Eleraky Textile ERP — للمستخدمين المصرح لهم فقط</p>
          </motion.div>

          <p className="text-center text-xs text-gray-700 mt-5">
            © {new Date().getFullYear()} <span className="text-gray-600">Eleraky Textile</span> · جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};
