import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, BookOpen, Save, Send, AlertCircle, Info } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Modal pencarian ayat Alkitab menggunakan AI.
 *
 * Props:
 * - onSaveVerses(verses[]) → callback simpan ke database
 * - onClose()              → tutup modal
 */
export default function AIBibleSearch({ onSaveVerses, onClose }) {
  const { send, connected } = useWebSocket();
  const [query, setQuery]     = useState('');
  const [translation, setTr]  = useState('TB');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError]     = useState('');

  const examples = [
    'Yohanes 3:16',
    'Mazmur 23:1-3',
    'Roma 8:28',
    'ayat tentang kasih',
    'ayat tentang iman',
    'Filipi 4:13',
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSelected(new Set());
    try {
      const res = await fetch('/api/ai/bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, translation }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (!json.data?.length) throw new Error('AI tidak menemukan ayat yang sesuai. Coba dengan referensi yang lebih spesifik.');
      setResults(json.data);
      // Pilih semua secara default
      setSelected(new Set(json.data.map((_, i) => i)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSaveSelected = () => {
    const toSave = results.filter((_, i) => selected.has(i));
    if (!toSave.length) return;
    onSaveVerses(toSave);
  };

  const handleShowOnProjector = (verse) => {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}${verse.verse_end ? `-${verse.verse_end}` : ''}`;
    const content = `${ref}\n\n${verse.text}`;
    send('LOAD_SONG', {
      songId: `bible-ai-${Date.now()}`,
      songTitle: ref,
      slides: [{ id: `bai-${Date.now()}`, label: ref, content }],
      songSettings: { background_color: '#1a0a3d', text_color: '#FFFFFF', font_size: 38, font_family: 'Georgia', text_align: 'center' },
    });
  };

  const formatRef = (v) =>
    `${v.book} ${v.chapter}:${v.verse}${v.verse_end && v.verse_end !== v.verse ? `-${v.verse_end}` : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="card w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Cari Ayat Alkitab dengan AI</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 border-b border-surface-600">
          <div className="flex gap-2 mb-2">
            <input
              className="input-field text-sm flex-1"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Contoh: Yohanes 3:16 atau ayat tentang kasih..."
              autoFocus
            />
            <select
              className="input-field text-sm w-28"
              value={translation}
              onChange={e => setTr(e.target.value)}
            >
              <option value="TB">TB</option>
              <option value="BIS">BIS</option>
              <option value="KJV">KJV</option>
              <option value="NIV">NIV</option>
            </select>
          </div>

          {/* Contoh pencarian */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {examples.map(ex => (
              <button
                key={ex}
                onClick={() => setQuery(ex)}
                className="text-xs px-2 py-0.5 bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-white rounded transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="btn-primary w-full justify-center"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Mencari ayat...</>
              : <><Sparkles size={15} /> Cari Ayat</>
            }
          </button>
        </div>

        {/* Hasil */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-3 m-5 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-400">{results.length} ayat ditemukan — centang yang ingin disimpan:</p>
                <button
                  onClick={() => setSelected(selected.size === results.length ? new Set() : new Set(results.map((_, i) => i)))}
                  className="text-xs text-primary-400 hover:text-primary-300"
                >
                  {selected.size === results.length ? 'Batal pilih semua' : 'Pilih semua'}
                </button>
              </div>

              {results.map((verse, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                    selected.has(idx)
                      ? 'border-primary-500 bg-primary-600/10'
                      : 'border-surface-600 bg-surface-800 hover:border-surface-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                        selected.has(idx) ? 'bg-primary-600 border-primary-600' : 'border-surface-400'
                      }`}>
                        {selected.has(idx) && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-purple-400">{formatRef(verse)}</span>
                          <span className="text-xs text-gray-600 bg-surface-700 px-1.5 py-0.5 rounded">{translation}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{verse.text}</p>
                      </div>
                    </div>

                    {/* Tombol tampilkan proyektor langsung */}
                    <button
                      onClick={e => { e.stopPropagation(); handleShowOnProjector(verse); }}
                      disabled={!connected}
                      title="Tampilkan ke proyektor sekarang"
                      className="p-1.5 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-1.5 pt-1">
                <Info size={11} className="text-gray-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 italic">
                  Teks ayat dihasilkan AI. Periksa akurasi sebelum dipakai di ibadah.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="p-5 space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-surface-700 rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-surface-600 rounded w-28 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2.5 bg-surface-600 rounded w-full" />
                    <div className="h-2.5 bg-surface-600 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-surface-600">
            <span className="text-xs text-gray-500">{selected.size} ayat dipilih</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost text-sm">Tutup</button>
              <button
                onClick={handleSaveSelected}
                disabled={!selected.size}
                className="btn-primary text-sm"
              >
                <Save size={14} />
                Simpan {selected.size > 0 ? `(${selected.size})` : ''} ke Database
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
