import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, ChevronRight, AlertCircle, Edit2, Save, Check } from 'lucide-react';

/**
 * Modal pencarian lirik lagu menggunakan AI.
 *
 * Props:
 * - onImport(songData)  → callback saat user klik "Simpan ke Database"
 *                         dipanggil dengan data final (sudah include edit jika ada)
 * - onClose()           → tutup modal
 */
export default function AILyricsSearch({ onImport, onClose }) {
  const [query, setQuery]       = useState({ title: '', author: '', language: 'id' });
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [editMode, setEditMode] = useState(false);
  // editData selalu berisi data yang bisa disimpan (diinisialisasi dari result)
  const [editData, setEditData] = useState(null);

  const handleSearch = async () => {
    if (!query.title.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setEditData(null);
    setEditMode(false);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (!json.data.slides?.length) throw new Error('AI tidak menemukan lirik untuk lagu ini. Coba dengan judul yang lebih lengkap.');
      setResult(json.data);
      setEditData(json.data); // editData = salinan result, selalu up-to-date
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simpan ke database — kirim editData (yang selalu sinkron dengan result atau editan user)
  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await onImport(editData); // onImport sekarang async dan langsung simpan
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setEditData(d => ({ ...d, [field]: value }));
  };

  const updateSlideContent = (idx, content) => {
    setEditData(d => ({
      ...d,
      slides: d.slides.map((s, i) => i === idx ? { ...s, content } : s),
    }));
  };

  const updateSlideLabel = (idx, label) => {
    setEditData(d => ({
      ...d,
      slides: d.slides.map((s, i) => i === idx ? { ...s, label } : s),
    }));
  };

  // Data yang ditampilkan selalu dari editData (sumber tunggal kebenaran)
  const displayData = editData;

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
        className="card w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Cari Lirik dengan AI</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form pencarian */}
        <div className="p-5 border-b border-surface-600">
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <input
                className="input-field text-sm"
                value={query.title}
                onChange={e => setQuery(q => ({ ...q, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Nama lagu, contoh: Amazing Grace, Bapa Engkau Sungguh Baik..."
                autoFocus
              />
            </div>
            <input
              className="input-field text-sm w-36"
              value={query.author}
              onChange={e => setQuery(q => ({ ...q, author: e.target.value }))}
              placeholder="Penulis (opsional)"
            />
            <select
              className="input-field text-sm w-28"
              value={query.language}
              onChange={e => setQuery(q => ({ ...q, language: e.target.value }))}
            >
              <option value="id">Indonesia</option>
              <option value="en">Inggris</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.title.trim()}
            className="btn-primary w-full justify-center mt-1"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Mencari lirik...</>
              : <><Sparkles size={15} /> Cari Lirik</>
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

          {displayData && (
            <div className="p-5">
              {/* Info lagu — bisa diedit langsung */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 mr-4 space-y-1.5">
                  {editMode ? (
                    <input
                      className="input-field text-sm font-semibold"
                      value={displayData.title}
                      onChange={e => updateField('title', e.target.value)}
                      placeholder="Judul lagu"
                    />
                  ) : (
                    <h3 className="font-semibold text-white text-base">{displayData.title}</h3>
                  )}
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <input
                          className="input-field text-xs w-40"
                          value={displayData.author || ''}
                          onChange={e => updateField('author', e.target.value)}
                          placeholder="Penulis"
                        />
                        <input
                          className="input-field text-xs w-20"
                          value={displayData.key_signature || ''}
                          onChange={e => updateField('key_signature', e.target.value)}
                          placeholder="Kunci"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        {displayData.author && <span>{displayData.author}</span>}
                        {displayData.key_signature && (
                          <span className="text-primary-400">Kunci: {displayData.key_signature}</span>
                        )}
                        <span>{displayData.slides.length} slide</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditMode(e => !e)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                    editMode
                      ? 'bg-yellow-600 text-white'
                      : 'bg-surface-700 text-gray-300 hover:text-white'
                  }`}
                >
                  <Edit2 size={12} />
                  {editMode ? 'Selesai Edit' : 'Edit'}
                </button>
              </div>

              {/* Daftar slide */}
              <div className="space-y-2">
                {displayData.slides.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="bg-surface-700 rounded-lg border border-surface-600 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-surface-600 bg-surface-800">
                      <ChevronRight size={12} className="text-gray-500" />
                      {editMode ? (
                        <input
                          className="bg-transparent text-xs text-gray-300 w-full focus:outline-none"
                          value={slide.label}
                          onChange={e => updateSlideLabel(idx, e.target.value)}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">{slide.label}</span>
                      )}
                    </div>
                    <div className="p-3">
                      {editMode ? (
                        <textarea
                          className="w-full bg-transparent text-sm text-white leading-relaxed resize-none focus:outline-none"
                          value={slide.content}
                          onChange={e => updateSlideContent(idx, e.target.value)}
                          rows={Math.max(2, slide.content.split('\n').length + 1)}
                        />
                      ) : (
                        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                          {slide.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-600 mt-3 italic">
                * Lirik dihasilkan AI. Edit jika ada ketidaksesuaian, lalu klik Simpan.
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="p-5 space-y-3">
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
        </div>

        {/* Footer — tombol simpan langsung */}
        {displayData && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-surface-600">
            <button onClick={onClose} className="btn-ghost text-sm">Tutup</button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? 'bg-green-700 text-white cursor-default'
                  : 'btn-primary'
              }`}
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
              ) : saved ? (
                <><Check size={14} /> Tersimpan!</>
              ) : (
                <><Save size={14} /> Simpan ke Database</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
