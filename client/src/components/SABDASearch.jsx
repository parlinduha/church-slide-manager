import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, X, Loader2, Send, Save, CheckCircle,
  AlertCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Komponen pencarian ayat Alkitab dari SABDA API (alkitab.sabda.org).
 * Mendukung format:
 *   - Ayat tunggal  : "Yoh 3:16"
 *   - Range ayat    : "Mat 5:3-12"
 *   - Pasal penuh   : "Yoh 3"
 *
 * Props:
 *   onSaveVerses(verses[]) → simpan ke database
 *   onClose()
 */
export default function SABDASearch({ onSaveVerses, onClose }) {
  const { send, connected } = useWebSocket();

  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);   // { title, data: verse[], source }
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [showAll, setShowAll]   = useState(false);
  const inputRef = useRef();

  const examples = [
    'Yoh 3:16', 'Mat 5:3-12', 'Mzm 23', 'Rom 8:28',
    'Flp 4:13', '1Kor 13', 'Yes 40:31', 'Ibr 11:1',
  ];

  // ── Fetch dari SABDA proxy ────────────────────────────────────────────────
  const handleSearch = async (q) => {
    const passage = (q || query).trim();
    if (!passage) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSelected(new Set());
    setSaved(false);

    try {
      const res = await fetch(`/api/bible/sabda?passage=${encodeURIComponent(passage)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setResult(json);
      // Default: pilih semua (tapi jika > 10 ayat, hanya pilih 10 pertama)
      const defaultSel = new Set(json.data.slice(0, json.data.length <= 10 ? json.data.length : 5).map((_, i) => i));
      setSelected(defaultSel);
      setShowAll(json.data.length <= 10);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle pilih/batal ayat ───────────────────────────────────────────────
  const toggleSelect = (idx) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(result.data.map((_, i) => i)));
  const clearAll  = () => setSelected(new Set());

  // ── Simpan ke database ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result || !selected.size) return;
    setSaving(true);
    try {
      const verses = result.data
        .filter((_, i) => selected.has(i))
        .map(v => ({ ...v, translation: 'TB' }));

      const res = await fetch('/api/bible/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verses, translation: 'TB' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSaved(true);
      onSaveVerses(verses);
    } catch (err) {
      setError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Tampilkan 1 ayat ke proyektor langsung ────────────────────────────────
  const handleProjector = (verse) => {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const content = `${ref}\n\n${verse.text}`;
    send('LOAD_SONG', {
      songId: `sabda-${verse.chapter}-${verse.verse}`,
      songTitle: ref,
      slides: [{ id: `sv-${verse.verse}`, label: ref, content }],
      songSettings: {
        background_color: '#1a0a3d',
        text_color: '#FFFFFF',
        font_size: 38,
        font_family: 'Georgia',
        text_align: 'center',
      },
    });
  };

  // ── Tampilkan semua ayat terpilih sebagai multi-slide ke proyektor ─────────
  const handleProjectorAll = () => {
    if (!result || !selected.size) return;
    const verses = result.data.filter((_, i) => selected.has(i));
    const slides = verses.map((v, i) => ({
      id: `sv-${v.verse}-${i}`,
      label: `${v.book} ${v.chapter}:${v.verse}`,
      content: `${v.book} ${v.chapter}:${v.verse}\n\n${v.text}`,
    }));
    send('LOAD_SONG', {
      songId: `sabda-multi-${Date.now()}`,
      songTitle: result.title,
      slides,
      songSettings: {
        background_color: '#1a0a3d',
        text_color: '#FFFFFF',
        font_size: 36,
        font_family: 'Georgia',
        text_align: 'center',
      },
    });
  };

  const displayVerses = result
    ? (showAll ? result.data : result.data.slice(0, 8))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        className="card w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-400" />
            <div>
              <h2 className="font-semibold text-white text-sm">Cari Ayat dari SABDA</h2>
              <p className="text-xs text-gray-500">alkitab.sabda.org · Terjemahan Baru (TB)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* ── Form pencarian ── */}
        <div className="p-4 border-b border-surface-600">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={inputRef}
                className="input-field pl-9 text-sm"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Contoh: Yoh 3:16 · Mat 5:3-12 · Mzm 23 · 1Kor 13"
                autoFocus
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="btn-primary text-sm px-4"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? 'Mencari...' : 'Cari'}
            </button>
          </div>

          {/* Contoh cepat */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-600">Contoh:</span>
            {examples.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); handleSearch(ex); }}
                className="text-xs px-2 py-0.5 bg-surface-700 hover:bg-blue-800/40 hover:text-blue-300 text-gray-400 rounded transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* ── Hasil ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 m-4 p-3 bg-red-900/20 border border-red-800 rounded-xl">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="bg-surface-700 rounded-lg p-3 animate-pulse">
                  <div className="h-3 bg-surface-600 rounded w-24 mb-2" />
                  <div className="h-2.5 bg-surface-600 rounded w-full mb-1" />
                  <div className="h-2.5 bg-surface-600 rounded w-4/5" />
                </div>
              ))}
            </div>
          )}

          {/* Hasil ayat */}
          {result && !loading && (
            <div className="p-4">
              {/* Info judul & kontrol */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{result.title}</p>
                  <p className="text-xs text-gray-500">
                    {result.data.length} ayat · Sumber: SABDA (TB)
                    {selected.size > 0 && ` · ${selected.size} dipilih`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={selectAll} className="text-xs text-primary-400 hover:text-primary-300">
                    Pilih semua
                  </button>
                  <span className="text-gray-600">·</span>
                  <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300">
                    Batal semua
                  </button>
                </div>
              </div>

              {/* Daftar ayat */}
              <div className="space-y-1.5">
                {displayVerses.map((verse, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selected.has(idx)
                        ? 'border-blue-600/60 bg-blue-900/20'
                        : 'border-surface-600 hover:border-surface-400 bg-surface-800'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                      selected.has(idx) ? 'bg-blue-600 border-blue-600' : 'border-surface-400'
                    }`}>
                      {selected.has(idx) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* Nomor ayat */}
                    <span className="text-xs font-bold text-blue-400 w-6 shrink-0 mt-0.5">
                      {verse.verse}
                    </span>

                    {/* Teks ayat */}
                    <p className="text-sm text-gray-300 leading-relaxed flex-1">{verse.text}</p>

                    {/* Tombol proyektor per ayat */}
                    <button
                      onClick={e => { e.stopPropagation(); handleProjector(verse); }}
                      disabled={!connected}
                      title="Tampilkan ke proyektor"
                      className="p-1.5 rounded hover:bg-blue-700 text-blue-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Show more */}
              {result.data.length > 8 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="mt-2 w-full py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 transition-colors"
                >
                  {showAll ? (
                    <><ChevronUp size={13} /> Sembunyikan</>
                  ) : (
                    <><ChevronDown size={13} /> Tampilkan semua {result.data.length} ayat</>
                  )}
                </button>
              )}

              <p className="text-xs text-gray-600 mt-3 italic flex items-center gap-1">
                <Info size={10} />
                Teks dari alkitab.sabda.org (Terjemahan Baru)
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {result && !loading && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-600">
            <button
              onClick={handleProjectorAll}
              disabled={!connected || !selected.size}
              className="btn-secondary text-sm disabled:opacity-40"
              title="Tampilkan semua ayat terpilih sebagai multi-slide"
            >
              <Send size={14} />
              Tayang {selected.size > 1 ? `(${selected.size} slide)` : ''}
            </button>

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost text-sm">Tutup</button>
              <button
                onClick={handleSave}
                disabled={saving || saved || !selected.size}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saved
                    ? 'bg-green-700 text-white cursor-default'
                    : 'btn-primary'
                } disabled:opacity-40`}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                ) : saved ? (
                  <><CheckCircle size={14} /> Tersimpan!</>
                ) : (
                  <><Save size={14} /> Simpan {selected.size > 0 ? `(${selected.size})` : ''}</>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
