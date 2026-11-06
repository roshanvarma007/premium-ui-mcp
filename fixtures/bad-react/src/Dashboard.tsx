import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { CloseIcon } from './icons';

const chartColors = ['#6366F1', '#22D3EE', '#F472B6', '#A855F7'];

export function Dashboard({ dark }: { dark: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #0F172A)', padding: 18, borderRadius: 28 }}>
      <h1 style={{ fontSize: 42, color: '#E0E7FF' }}>🚀 Revenue Dashboard</h1>
      <p style={{ fontSize: 11, color: '#94A3B8' }}>Updated just now ⚡</p>
      <motion.div animate={{ scale: 1.05 }} style={{ backdropFilter: 'blur(20px)', borderRadius: 999 }}>
        <div onClick={() => alert('clicked')} style={{ boxShadow: '0 0 32px rgba(99, 102, 241, 0.65)', fontSize: 15 }}>
          Total: $48,210 📈
        </div>
      </motion.div>
      <button type="button" onClick={() => {}} style={{ height: 30, borderRadius: 9999 }}>
        <CloseIcon />
      </button>
      <img src="/avatar.png" />
      <span style={{ color: '#000000', backgroundColor: '#FFFFFF', fontSize: 13, borderRadius: 6, margin: 7 }}>Pro</span>
      <small style={{ fontSize: 17, borderRadius: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>v2</small>
      <section style={{ fontSize: 19, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', borderRadius: 999 }}>Stats</section>
      <footer style={{ fontSize: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        <p style={{ color: '#9CA3AF', backgroundColor: '#F9FAFB' }}>{chartColors.length} series</p>
      </footer>
      <aside style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.2)', borderRadius: 12, fontSize: 26 }} />
    </div>
  );
}
