import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Save, X, Play, StopCircle, Image, Video, Music2,
  GripVertical, Clock, ChevronUp, ChevronDown, Eye, Upload, Loader2,
  AlignLeft, AlignCenter, AlignRight, Monitor
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStore } from '../store/useStore';

const FONT_FAMILIES = ['Georgia', 'Arial', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Impact'];

// ─── Countdown display ────────────────────────────────────────────────────────
function CountdownDisplay({ targetIso }) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const ms = new Date(targetIso) - new Date();
      setDiff(ms > 0 ? ms : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (diff === null || !targetIso) return null;
  if (diff === 0) return <span className="text-green-400 font-mono text-sm">Ibadah Dimulai!</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono text-yellow-400 text-sm">
      {h > 0 ? `${String(h).padStart(2,'0')}:` : ''}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

// ─── Slide card (editor) ──────────────────────────────────────────────────────
function SlideCard({ slide, isActive, isEditing, onSelect, onEdit, onDelete, onMoveUp, onMoveDown, onShowProjector, isFirst, isLast }) {
  const mediaIcon = slide.media_type === 'video'
    ? <Video size={12} className="text-blue-400" />
    : slide.media_type === 'audio'
    ? <Music2 size={12} className="text-green-400" />
    : slide.media_type === 'image'
    ? <Image size={12} className="text-purple-400" />
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onSelect}
      className={`group relative rounded-xl border cursor-pointer transition-all overflow-hidden ${
        isActive
          ? 'border-primary-500 ring-1 ring-primary-500'
          : 'border-surface-600 hover:border-surface-400'
      }`}
    >
      {/* Miniatur preview 16:9 */}
      <div
        className="w-full relative"
        style={{ paddingBottom: '56.25%', backgroundColor: slide.bg_color || '#0f172a' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center overflow-hidden">
          {slide.media_type === 'image' && slide.media_url && (
            <img
              src={slide.media_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          {slide.media_type === 'video' && slide.media_url && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Video size={20} className="text-white/60" />
            </div>
          )}
          <div className="relative z-10">
            <p
              className="font-bold leading-tight line-clamp-2"
              style={{ color: slide.text_color || '#fff', fontSize: `${Math.round((slide.font_size || 52) * 0.18)}px`, fontFamily: slide.font_family || 'Georgia' }}
            >
              {slide.title}
            </p>
            {slide.subtitle && (
              <p className="mt-0.5 line-clamp-1 opacity-70"
                style={{ color: slide.text_color || '#fff', fontSize: `${Math.round((slide.font_size || 52) * 0.12)}px` }}>
                {slide.subtitle}
              </p>
            )}
            {slide.show_countdown && slide.countdown_target && (
              <CountdownDisplay targetIso={slide.countdown_target} />
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 bg-surface-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {mediaIcon}
          <span className="text-xs text-gray-400 truncate">{slide.title}</span>
        </div>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}
            className="p-1 rounded hover:bg-surface-600 text-gray-500 disabled:opacity-30">
            <ChevronUp size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}
            className="p-1 rounded hover:bg-surface-600 text-gray-500 disabled:opacity-30">
            <ChevronDown size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onShowProjector(); }}
            className="p-1 rounded hover:bg-primary-700 text-primary-400">
            <Monitor size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded hover:bg-surface-600 text-gray-400">
            <Edit2 size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-900 text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isActive && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
      )}
    </motion.div>
  );
}

// ─── Form editor slide ────────────────────────────────────────────────────────
function SlideEditor({ slide, onSave, onCancel }) {
  const [form, setForm] = useState({ ...slide });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/welcome/media/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      set('media_url', json.data.url);
      set('media_type', json.data.media_type);
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = () => { set('media_url', ''); set('media_type', ''); };

  const mediaPreview = () => {
    if (!form.media_url) return null;
    if (form.media_type === 'image') return (
      <img src={form.media_url} alt="" className="w-full h-32 object-cover rounded-lg" />
    );
    if (form.media_type === 'video') return (
      <video src={form.media_url} className="w-full h-32 rounded-lg object-cover" controls muted />
    );
    if (form.media_type === 'audio') return (
      <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
        <Music2 size={20} className="text-green-400 shrink-0" />
        <audio src={form.media_url} controls className="flex-1 h-8" style={{ colorScheme: 'dark' }} />
      </div>
    );
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600">
        <h3 className="text-sm font-semibold text-white">Edit Slide Welcome</h3>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost text-xs py-1"><X size={13} /> Batal</button>
          <button onClick={() => onSave(form)} className="btn-primary text-xs py-1"><Save size={13} /> Simpan</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Preview mini */}
        <div
          className="w-full rounded-lg overflow-hidden relative flex items-center justify-center"
          style={{ paddingBottom: '56.25%', backgroundColor: form.bg_color }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
            {form.media_type === 'image' && form.media_url && (
              <img src={form.media_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            )}
            <div className="relative z-10">
              <p style={{ color: form.text_color, fontSize: `${Math.round(form.font_size * 0.22)}px`, fontFamily: form.font_family, textAlign: form.text_align, lineHeight: 1.3 }} className="font-bold">
                {form.title || 'Judul'}
              </p>
              {form.subtitle && (
                <p style={{ color: form.text_color, fontSize: `${Math.round(form.font_size * 0.15)}px`, fontFamily: form.font_family, textAlign: form.text_align, opacity: 0.8 }}>
                  {form.subtitle}
                </p>
              )}
              {form.body_text && (
                <p style={{ color: form.text_color, fontSize: `${Math.round(form.font_size * 0.12)}px`, fontFamily: form.font_family, textAlign: form.text_align, opacity: 0.7, marginTop: 4 }}>
                  {form.body_text}
                </p>
              )}
              {form.show_countdown && form.countdown_target && (
                <CountdownDisplay targetIso={form.countdown_target} />
              )}
            </div>
          </div>
        </div>

        {/* Teks */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Judul *</label>
            <input className="input-field text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Selamat Datang" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sub-judul</label>
            <input className="input-field text-sm" value={form.subtitle || ''} onChange={e => set('subtitle', e.target.value)} placeholder="Ibadah Minggu Pagi" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Teks isi</label>
            <textarea className="input-field text-sm resize-none" rows={3} value={form.body_text || ''} onChange={e => set('body_text', e.target.value)} placeholder="Silakan matikan ponsel Anda..." />
          </div>
        </div>

        {/* Media */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Media (Gambar / Video / Audio)</label>
          {form.media_url ? (
            <div className="space-y-2">
              {mediaPreview()}
              <button onClick={removeMedia} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <Trash2 size={11} /> Hapus media
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-surface-500 hover:border-primary-500 rounded-lg py-6 flex flex-col items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-xs">{uploading ? 'Mengunggah...' : 'Klik untuk unggah gambar, video, atau audio'}</span>
              <span className="text-xs opacity-60">JPG, PNG, MP4, MP3, WAV, OGG (maks 100MB)</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={handleUpload} className="hidden" />
        </div>

        {/* Countdown */}
        <div className="card p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!form.show_countdown} onChange={e => set('show_countdown', e.target.checked)}
              className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-white">Tampilkan Countdown Mundur</span>
          </label>
          {form.show_countdown && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Waktu Mulai Ibadah</label>
              <input type="datetime-local" className="input-field text-sm"
                value={form.countdown_target ? form.countdown_target.slice(0, 16) : ''}
                onChange={e => set('countdown_target', new Date(e.target.value).toISOString())}
              />
              {form.countdown_target && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={11} />
                  Sisa waktu: <CountdownDisplay targetIso={form.countdown_target} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Styling */}
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tampilan</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Latar</label>
              <div className="flex gap-1.5">
                <input type="color" value={form.bg_color || '#0f172a'} onChange={e => set('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <input className="input-field text-xs flex-1" value={form.bg_color || ''} onChange={e => set('bg_color', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Teks</label>
              <div className="flex gap-1.5">
                <input type="color" value={form.text_color || '#ffffff'} onChange={e => set('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <input className="input-field text-xs flex-1" value={form.text_color || ''} onChange={e => set('text_color', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Font</label>
            <select className="input-field text-sm" value={form.font_family || 'Georgia'} onChange={e => set('font_family', e.target.value)}>
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Ukuran: {form.font_size}px</label>
            <input type="range" min={24} max={120} value={form.font_size || 52}
              onChange={e => set('font_size', parseInt(e.target.value))} className="w-full accent-primary-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Rata teks</label>
            <div className="flex gap-1">
              {[['left', <AlignLeft size={14} />], ['center', <AlignCenter size={14} />], ['right', <AlignRight size={14} />]].map(([a, icon]) => (
                <button key={a} onClick={() => set('text_align', a)}
                  className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${form.text_align === a ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preset */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Preset tema</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { bg: '#0f172a', text: '#ffffff', label: 'Gelap' },
                { bg: '#1a0a3d', text: '#e9d5ff', label: 'Ungu' },
                { bg: '#0c1a3b', text: '#93c5fd', label: 'Biru' },
                { bg: '#0d2b17', text: '#86efac', label: 'Hijau' },
                { bg: '#2d1a0e', text: '#fed7aa', label: 'Coklat' },
                { bg: '#ffffff', text: '#1e293b', label: 'Putih' },
              ].map(p => (
                <button key={p.label}
                  onClick={() => { set('bg_color', p.bg); set('text_color', p.text); }}
                  className="py-1.5 rounded text-xs border border-surface-500 hover:border-primary-500 transition-colors"
                  style={{ backgroundColor: p.bg, color: p.text }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const { send, liveState, connected } = useWebSocket();
  const { addToast } = useStore();

  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeWelcomeId = liveState.mode === 'welcome' ? liveState.welcomeSlide?.id : null;

  // ── Load slides ──────────────────────────────────────────────
  const loadSlides = useCallback(async () => {
    try {
      const res = await fetch('/api/welcome');
      const json = await res.json();
      if (json.success) setSlides(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  // ── CRUD ────────────────────────────────────────────────────
  const handleAddSlide = async () => {
    const res = await fetch('/api/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Slide Baru', sort_order: slides.length }),
    });
    const json = await res.json();
    if (json.success) {
      await loadSlides();
      setEditingSlide(json.data);
      setActiveSlideId(json.data.id);
    }
  };

  const handleSaveSlide = async (data) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/welcome/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadSlides();
      setEditingSlide(null);
      addToast('Slide disimpan', 'success');
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (!confirm('Hapus slide ini?')) return;
    await fetch(`/api/welcome/${id}`, { method: 'DELETE' });
    await loadSlides();
    if (activeSlideId === id) setActiveSlideId(null);
    if (editingSlide?.id === id) setEditingSlide(null);
    addToast('Slide dihapus', 'success');
  };

  const handleMove = async (idx, dir) => {
    const newSlides = [...slides];
    const target = idx + dir;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[idx], newSlides[target]] = [newSlides[target], newSlides[idx]];
    // Update sort_order
    await Promise.all(newSlides.map((s, i) =>
      fetch(`/api/welcome/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: i }),
      })
    ));
    await loadSlides();
  };

  // ── Live controls ────────────────────────────────────────────
  const handleShowProjector = (slide) => {
    setActiveSlideId(slide.id);
    send('SHOW_WELCOME', { slide });
    addToast(`"${slide.title}" ditampilkan ke proyektor`, 'success');
  };

  const handleHideWelcome = () => {
    send('HIDE_WELCOME');
    addToast('Tampilan welcome disembunyikan', 'info');
  };

  const isWelcomeLive = liveState.mode === 'welcome';

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Panel kiri: daftar slide ──────────────────────────── */}
      <div className="flex flex-col w-80 border-r border-surface-600 shrink-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-600">
          <div>
            <h1 className="text-base font-semibold text-white">Slide Welcome</h1>
            <p className="text-xs text-gray-500">{slides.length} slide · Sebelum ibadah</p>
          </div>
          <button onClick={handleAddSlide} className="btn-primary text-xs py-1.5 px-3">
            <Plus size={13} /> Tambah
          </button>
        </div>

        {/* Live status */}
        {isWelcomeLive && (
          <div className="mx-3 mt-3 flex items-center justify-between p-2.5 bg-red-900/30 border border-red-700/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-red-300">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Welcome sedang LIVE
            </div>
            <button onClick={handleHideWelcome} className="text-xs text-red-400 hover:text-white transition-colors flex items-center gap-1">
              <StopCircle size={12} /> Stop
            </button>
          </div>
        )}

        {/* List slide */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 size={20} className="text-gray-500 animate-spin" />
            </div>
          ) : slides.length === 0 ? (
            <div className="text-center pt-12">
              <Image size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Belum ada slide</p>
              <button onClick={handleAddSlide} className="mt-3 text-primary-400 text-sm hover:text-primary-300">
                + Tambah slide pertama
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {slides.map((slide, idx) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  isActive={activeWelcomeId === slide.id}
                  isEditing={editingSlide?.id === slide.id}
                  isFirst={idx === 0}
                  isLast={idx === slides.length - 1}
                  onSelect={() => { setActiveSlideId(slide.id); setEditingSlide(null); }}
                  onEdit={() => setEditingSlide(slide)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                  onMoveUp={() => handleMove(idx, -1)}
                  onMoveDown={() => handleMove(idx, 1)}
                  onShowProjector={() => handleShowProjector(slide)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Panel kanan: editor atau preview ──────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {editingSlide ? (
            <SlideEditor
              key={editingSlide.id}
              slide={editingSlide}
              onSave={handleSaveSlide}
              onCancel={() => setEditingSlide(null)}
            />
          ) : activeSlideId && slides.find(s => s.id === activeSlideId) ? (
            <SlideDetail
              key={activeSlideId}
              slide={slides.find(s => s.id === activeSlideId)}
              isLive={activeWelcomeId === activeSlideId}
              connected={connected}
              onEdit={() => setEditingSlide(slides.find(s => s.id === activeSlideId))}
              onShowProjector={() => handleShowProjector(slides.find(s => s.id === activeSlideId))}
              onHide={handleHideWelcome}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center mb-4">
                <Eye size={28} className="text-gray-500" />
              </div>
              <p className="text-gray-400 mb-1">Pilih slide untuk melihat detail</p>
              <p className="text-gray-600 text-sm">atau klik tombol <strong className="text-gray-500">Monitor</strong> untuk langsung tampilkan ke proyektor</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Detail view slide ────────────────────────────────────────────────────────
function SlideDetail({ slide, isLive, connected, onEdit, onShowProjector, onHide }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-y-auto p-6"
    >
      {/* Preview besar 16:9 */}
      <div
        className="w-full rounded-2xl overflow-hidden relative shadow-2xl mb-6"
        style={{ paddingBottom: '56.25%', backgroundColor: slide.bg_color }}
      >
        <div className="absolute inset-0">
          {slide.media_type === 'image' && slide.media_url && (
            <img src={slide.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {slide.media_type === 'video' && slide.media_url && (
            <video src={slide.media_url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop />
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <p
              className="font-bold leading-tight"
              style={{
                color: slide.text_color, fontSize: `${Math.round(slide.font_size * 0.5)}px`,
                fontFamily: slide.font_family, textAlign: slide.text_align,
                textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              }}
            >
              {slide.title}
            </p>
            {slide.subtitle && (
              <p style={{ color: slide.text_color, fontSize: `${Math.round(slide.font_size * 0.35)}px`, fontFamily: slide.font_family, textAlign: slide.text_align, opacity: 0.85, marginTop: 8, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {slide.subtitle}
              </p>
            )}
            {slide.body_text && (
              <p style={{ color: slide.text_color, fontSize: `${Math.round(slide.font_size * 0.25)}px`, fontFamily: slide.font_family, textAlign: slide.text_align, opacity: 0.7, marginTop: 12, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                {slide.body_text}
              </p>
            )}
            {slide.show_countdown && slide.countdown_target && (
              <div className="mt-4">
                <p style={{ color: slide.text_color, fontSize: `${Math.round(slide.font_size * 0.3)}px`, fontFamily: slide.font_family, opacity: 0.6 }}>Ibadah dimulai dalam</p>
                <CountdownLarge targetIso={slide.countdown_target} color={slide.text_color} size={slide.font_size} />
              </div>
            )}
          </div>
        </div>
        {isLive && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
      </div>

      {/* Audio player jika ada */}
      {slide.media_type === 'audio' && slide.media_url && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <Music2 size={18} className="text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Audio</p>
            <audio src={slide.media_url} controls className="w-full h-8" style={{ colorScheme: 'dark' }} />
          </div>
        </div>
      )}

      {/* Tombol aksi */}
      <div className="flex gap-3">
        <button onClick={onEdit} className="btn-secondary flex-1 justify-center">
          <Edit2 size={15} /> Edit Slide
        </button>
        {isLive ? (
          <button onClick={onHide} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-medium text-sm transition-colors">
            <StopCircle size={15} /> Stop Welcome
          </button>
        ) : (
          <button onClick={onShowProjector} disabled={!connected} className="btn-primary flex-1 justify-center">
            <Monitor size={15} /> Tampilkan ke Proyektor
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Countdown besar untuk detail view
function CountdownLarge({ targetIso, color, size }) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    const tick = () => { const ms = new Date(targetIso) - new Date(); setDiff(ms > 0 ? ms : 0); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (diff === null) return null;
  if (diff === 0) return <p style={{ color, fontSize: `${Math.round(size * 0.4)}px`, fontWeight: 'bold' }}>Ibadah Dimulai!</p>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <p style={{ color, fontSize: `${Math.round(size * 0.55)}px`, fontWeight: 'bold', fontFamily: 'monospace', textShadow: '0 2px 12px rgba(0,0,0,0.9)', letterSpacing: '0.05em' }}>
      {h > 0 ? `${String(h).padStart(2,'0')}:` : ''}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </p>
  );
}
