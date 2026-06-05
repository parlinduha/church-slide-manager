import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, MonitorOff, MonitorCheck, Loader2, AlertCircle, Info } from 'lucide-react';
import { useProjector } from '../hooks/useProjector';
import { useStore } from '../store/useStore';

/**
 * Tombol proyektor dengan indikator status otomatis.
 * Menampilkan info layar yang terdeteksi dan hasil pembukaan window.
 *
 * @param {boolean} compact  - mode ikon saja (untuk sidebar sempit)
 */
export default function ProjectorButton({ compact = false }) {
  const { openProjector, closeProjector, isOpen, isSupported } = useProjector();
  const { addToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState('');

  const handleClick = async () => {
    if (isOpen) {
      closeProjector();
      setTooltip('');
      return;
    }

    setLoading(true);
    try {
      const result = await openProjector();

      if (result.success) {
        // Tampilkan metode yang dipakai sebagai toast info
        addToast(result.message,
          result.method === 'window-management' ? 'success' : 'info'
        );
        setTooltip(result.message);
      } else {
        addToast(result.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pilih ikon sesuai state
  const Icon = loading
    ? Loader2
    : isOpen
    ? MonitorCheck
    : MonitorOff;

  const label = loading
    ? 'Membuka...'
    : isOpen
    ? 'Proyektor Aktif'
    : 'Buka Proyektor';

  const colorClass = isOpen
    ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30'
    : 'text-gray-400 hover:text-white hover:bg-surface-700';

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        disabled={loading}
        title={isSupported
          ? 'Buka proyektor (Window Management API tersedia)'
          : 'Buka proyektor (mode fallback)'
        }
        className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-colors ${colorClass} disabled:opacity-50`}
      >
        <Icon
          size={18}
          className={`shrink-0 ${loading ? 'animate-spin' : ''}`}
        />
        {!compact && (
          <span className="hidden md:block text-sm font-medium">{label}</span>
        )}

        {/* Indikator mode API */}
        {!compact && !loading && (
          <span className="hidden md:block ml-auto">
            {isSupported ? (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" title="Window Management API tersedia" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 block" title="Mode fallback" />
            )}
          </span>
        )}
      </button>

      {/* Tooltip info mode (muncul saat hover) */}
      {!compact && (
        <AnimatePresence>
          <div className="hidden md:block absolute left-full ml-2 top-0 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="bg-surface-600 border border-surface-400 text-xs text-gray-300 px-2.5 py-2 rounded-lg shadow-xl w-56 whitespace-normal"
            >
              {isSupported ? (
                <span className="flex items-start gap-1.5">
                  <Info size={12} className="text-green-400 shrink-0 mt-0.5" />
                  Window Management API aktif — layar kedua akan terdeteksi otomatis.
                </span>
              ) : (
                <span className="flex items-start gap-1.5">
                  <AlertCircle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                  Mode fallback — pindahkan window ke layar proyektor lalu tekan F11.
                </span>
              )}
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
