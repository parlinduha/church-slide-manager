import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, ChevronRight, AlertCircle,
  Edit2, Save, Check, RefreshCw, MessageSquare, Plus, Trash2
} from 'lucide-react';

/**
 * Modal pencarian + koreksi lirik lagu menggunakan AI.
 * Fitur:
 * - Cari lirik berdasarkan judul + penulis
 * - Edit langsung tiap slide
 * - Koreksi otomatis dengan AI jika ada kata yang salah
 * - Simpan ke database
 */
export default function AILyricsSearch({ onImport, onClose }) {
  const [query, setQuery]         = useState({ title: '' });
  const [loading, setLoading]     = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [editData, setEditData]   = useState(null);
  const [error, setError]         = useState('');
  const [corrections, setCorrections] = useState([]);  // list koreksi dari AI
  const [feedback, setFeedback]   = useState('');       // catatan dari operator
  const [showFeedback, setShowFeedback] = useState(false);
  const [editMode, setEditMode]   = useState(false);

  // ── Cari lirik baru ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.title.trim()) return;
    setLoading(true);
    setError('');
    setEditData(null);
    setCorrections([]);
    setFeedback('');
    setShowFeedback(false);
    setSaved(false);
    setEditMode(false);
    try {
      const res  = await fetch('/api/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: query.title }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (!json.data.slides?.length) {
        throw new Error(`AI tidak menemukan lirik "${query.title}".\n• Coba judul yang lebih lengkap\n• Pastikan ejaan benar`);
      }
      setEditData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Koreksi lirik dengan AI ────────────────────────────────────────────────
  const handleCorrect = async () => {
    if (!editData) return;
    setCorrecting(true);
    setError('');
    try {
      const res  = await fetch('/api/ai/lyrics/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:   editData.title,
          author:  editData.author || '',
          slides:  editData.slides,
          feedback,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditData(json.data);
      setCorrections(json.data.corrections || []);
      setFeedback('');
      setShowFeedback(false);
    } catch (err) {
      setError('Koreksi gagal: ' + err.message);
    } finally {
      setCorrecting(false);
    }
  };

  // ── Simpan ke database ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await onImport(editData);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const setField = (k, v)          => setEditData(d => ({ ...d, [k]: v }));
  const setSlideContent = (i, v)   => setEditData(d => ({ ...d, slides: d.slides.map((s, j) => j===i ? {...s, content: v} : s) }));
  const setSlideLabel   = (i, v)   => setEditData(d => ({ ...d, slides: d.slides.map((s, j) => j===i ? {...s, label: v}   : s) }));
  const addSlide = () => setEditData(d => ({
    ...d,
    slides: [...d.slides, { id: `s${d.slides.length+1}`, label: `Slide ${d.slides.length+1}`, content: '' }]
  }));
  const removeSlide = (i) => setEditData(d => ({ ...d, slides: d.slides.filter((_, j) => j !== i) }));

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
        className="card w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Cari Lirik dengan AI</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* ── Form pencarian ── */}
        <div className="p-4 border-b border-surface-600">
          <div className="flex gap-2">
            <input
              className="input-field text-sm flex-1"
              value={query.title}
              onChange={e => setQuery({ title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ketik judul lagu... (contoh: Bapa Engkau Sungguh Baik)"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.title.trim()}
              className="btn-primary px-5"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Mencari...</>
                : <><Sparkles size={14} /> Cari</>
              }
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 m-4 p-3 bg-red-900/20 border border-red-800 rounded-xl">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                {error.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1 text-xs text-red-400' : ''}>{line}</p>
                ))}
                {/* Bantuan khusus untuk error quota/billing */}
                {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('exceeded') || error.toLowerCase().includes('insufficient')) && (
                  <div className="mt-2 pt-2 border-t border-red-800">
                    <p className="text-xs text-yellow-300">
                      💡 API quota habis — buka <strong>Pengaturan AI</strong> dan ganti ke provider <strong>Groq</strong> (gratis).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Koreksi yang dilakukan AI */}
          {corrections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-3 p-3 bg-green-900/20 border border-green-700/50 rounded-xl"
            >
              <p className="text-xs font-semibold text-green-400 mb-1.5">✓ AI melakukan {corrections.length} koreksi:</p>
              <ul className="space-y-0.5">
                {corrections.map((c, i) => (
                  <li key={i} className="text-xs text-green-300">• {c}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Loading skeleton */}
          {(loading || correcting) && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500 text-center">
                {correcting ? 'AI sedang memeriksa dan memperbaiki lirik...' : 'AI sedang mencari lirik...'}
              </p>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-700 rounded-lg p-3 animate-pulse">
                  <div className="h-3 bg-surface-600 rounded w-24 mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-surface-600 rounded w-full" />
                    <div className="h-2.5 bg-surface-600 rounded w-4/5" />
                    <div className="h-2.5 bg-surface-600 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hasil lirik */}
          {editData && !loading && !correcting && (
            <div className="p-4">
              {/* Info lagu */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 space-y-1.5 min-w-0">
                  {editMode ? (
                    <input className="input-field text-sm font-semibold w-full" value={editData.title}
                      onChange={e => setField('title', e.target.value)} placeholder="Judul" />
                  ) : (
                    <h3 className="font-semibold text-white truncate">{editData.title}</h3>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {editMode ? (
                      <>
                        <input className="input-field text-xs w-36" value={editData.author || ''}
                          onChange={e => setField('author', e.target.value)} placeholder="Penulis" />
                        <input className="input-field text-xs w-16" value={editData.key_signature || ''}
                          onChange={e => setField('key_signature', e.target.value)} placeholder="Kunci" />
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {editData.author && <span>{editData.author} · </span>}
                        {editData.key_signature && <span className="text-primary-400">Kunci {editData.key_signature} · </span>}
                        <span>{editData.slides.length} slide</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditMode(m => !m)}
                  className={`shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    editMode ? 'bg-yellow-600 text-white' : 'bg-surface-700 text-gray-300 hover:text-white'
                  }`}
                >
                  <Edit2 size={11} />
                  {editMode ? 'Selesai' : 'Edit Manual'}
                </button>
              </div>

              {/* Feedback box untuk koreksi */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <textarea
                      className="input-field text-sm resize-none w-full"
                      rows={2}
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder='Contoh: "bait ke-2 salah", "chorus kurang 1 baris", "kata X harusnya Y"'
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slides */}
              <div className="space-y-2">
                {editData.slides.map((slide, idx) => (
                  <div key={slide.id || idx} className="bg-surface-700 rounded-lg border border-surface-600 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-surface-600 bg-surface-800">
                      <ChevronRight size={12} className="text-gray-500 shrink-0" />
                      {editMode ? (
                        <input
                          className="bg-transparent text-xs text-gray-300 flex-1 focus:outline-none"
                          value={slide.label}
                          onChange={e => setSlideLabel(idx, e.target.value)}
                        />
                      ) : (
                        <span className="text-xs text-gray-400 flex-1">{slide.label}</span>
                      )}
                      {editMode && editData.slides.length > 1 && (
                        <button onClick={() => removeSlide(idx)}
                          className="p-0.5 rounded hover:bg-red-900 text-red-500 shrink-0">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      {editMode ? (
                        <textarea
                          className="w-full bg-transparent text-sm text-white leading-relaxed resize-none focus:outline-none"
                          value={slide.content}
                          onChange={e => setSlideContent(idx, e.target.value)}
                          rows={Math.max(2, (slide.content.match(/\n/g) || []).length + 2)}
                        />
                      ) : (
                        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{slide.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {editMode && (
                  <button onClick={addSlide}
                    className="w-full py-2 border border-dashed border-surface-500 hover:border-primary-500 rounded-lg text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 transition-colors">
                    <Plus size={12} /> Tambah Slide
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-600 mt-3 italic">
                * AI bisa salah. Gunakan tombol "Koreksi" atau edit manual jika ada yang tidak sesuai.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {editData && !loading && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-surface-600">
            <button onClick={onClose} className="btn-ghost text-sm">Tutup</button>

            {/* Koreksi dengan AI */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setShowFeedback(f => !f)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  showFeedback ? 'bg-surface-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'
                }`}
                title="Tambah catatan untuk AI"
              >
                <MessageSquare size={12} />
              </button>
              <button
                onClick={handleCorrect}
                disabled={correcting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                title="Minta AI untuk memeriksa dan memperbaiki lirik"
              >
                {correcting
                  ? <><Loader2 size={12} className="animate-spin" /> Memeriksa...</>
                  : <><RefreshCw size={12} /> Koreksi dengan AI</>
                }
              </button>
            </div>

            {/* Simpan */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved ? 'bg-green-700 text-white cursor-default' : 'btn-primary'
              } disabled:opacity-50`}
            >
              {saving  ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> :
               saved   ? <><Check size={14} /> Tersimpan!</> :
                         <><Save size={14} /> Simpan</>}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
