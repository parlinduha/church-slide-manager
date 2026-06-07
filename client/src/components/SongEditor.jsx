import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Save, X, ChevronUp, ChevronDown, Palette, Layers } from 'lucide-react';
import SlidePreview from './SlidePreview';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Impact', 'Tahoma'];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Am', 'Dm', 'Em', 'Gm'];

const GRADIENT_PRESETS = [
  { name: 'Biru Ungu', from: '#1a237e', to: '#4a148c', angle: 135 },
  { name: 'Laut', from: '#006064', to: '#0d47a1', angle: 180 },
  { name: 'Fajar', from: '#b71c1c', to: '#f57f17', angle: 45 },
  { name: 'Hutan', from: '#1b5e20', to: '#004d40', angle: 135 },
  { name: 'Senja', from: '#4a148c', to: '#880e4f', angle: 135 },
  { name: 'Emas', from: '#e65100', to: '#f9a825', angle: 135 },
];

const ANIMATED_PRESETS = [
  { id: 'aurora',    name: '🌌 Aurora',    desc: 'Cahaya utara, biru-ungu bergerak' },
  { id: 'waves',     name: '🌊 Ombak',     desc: 'Efek ombak laut dalam' },
  { id: 'pulse',     name: '💙 Denyut',    desc: 'Cahaya berdenyut dari tengah' },
  { id: 'nebula',    name: '🌀 Nebula',    desc: 'Galaksi berputar perlahan' },
  { id: 'fire',      name: '🔥 Api',       desc: 'Nyala api merah-oranye' },
  { id: 'ocean',     name: '🌊 Samudra',   desc: 'Samudra biru bergerak' },
  { id: 'sunrise',   name: '🌅 Fajar',     desc: 'Matahari terbit bergradasi' },
  { id: 'particles', name: '✨ Partikel',  desc: 'Partikel melayang naik' },
];

function generateId() {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SongEditor({ song, onSave, onCancel }) {
  const isNew = !song?.id;

  const [form, setForm] = useState({
    title: song?.title || '',
    author: song?.author || '',
    key_signature: song?.key_signature || '',
    tags: song?.tags?.join(', ') || '',
    slides: song?.slides?.length > 0 ? song.slides : [
      { id: generateId(), label: 'Verse 1', content: '' }
    ],
    background_color: song?.background_color || '#000000',
    text_color: song?.text_color || '#FFFFFF',
    font_size: song?.font_size || 48,
    font_family: song?.font_family || 'Arial',
    text_align: song?.text_align || 'center',
    bg_type: song?.bg_type || 'solid',
    bg_config: song?.bg_config
      ? (typeof song.bg_config === 'string' ? JSON.parse(song.bg_config) : song.bg_config)
      : {},
  });

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [styleTab, setStyleTab] = useState('text'); // 'text' | 'background'

  const activeSlide = form.slides[activeSlideIdx];

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const updateSlide = (idx, field, val) => {
    setForm(f => ({
      ...f,
      slides: f.slides.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));
  };

  const addSlide = () => {
    const newSlide = { id: generateId(), label: `Slide ${form.slides.length + 1}`, content: '' };
    setForm(f => ({ ...f, slides: [...f.slides, newSlide] }));
    setActiveSlideIdx(form.slides.length);
  };

  const deleteSlide = (idx) => {
    if (form.slides.length === 1) return;
    setForm(f => ({ ...f, slides: f.slides.filter((_, i) => i !== idx) }));
    setActiveSlideIdx(i => Math.min(i, form.slides.length - 2));
  };

  const moveSlide = (idx, dir) => {
    const newSlides = [...form.slides];
    const target = idx + dir;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[idx], newSlides[target]] = [newSlides[target], newSlides[idx]];
    setForm(f => ({ ...f, slides: newSlides }));
    setActiveSlideIdx(target);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Judul lagu wajib diisi!');
    setSaving(true);
    try {
      await onSave({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        font_size: parseInt(form.font_size),
        bg_config: JSON.stringify(form.bg_config),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
        <h2 className="text-lg font-semibold text-white">
          {isNew ? 'Tambah Lagu Baru' : `Edit: ${song.title}`}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost">
            <X size={16} />
            Batal
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={16} />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Info & Slides */}
        <div className="w-72 border-r border-surface-600 flex flex-col overflow-hidden">
          {/* Info lagu */}
          <div className="p-4 border-b border-surface-600 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Judul Lagu *</label>
              <input
                className="input-field text-sm"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Contoh: Amazing Grace"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Penulis</label>
                <input
                  className="input-field text-sm"
                  value={form.author}
                  onChange={e => setField('author', e.target.value)}
                  placeholder="Penulis lagu"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kunci</label>
                <select
                  className="input-field text-sm"
                  value={form.key_signature}
                  onChange={e => setField('key_signature', e.target.value)}
                >
                  <option value="">-</option>
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tag (pisahkan koma)</label>
              <input
                className="input-field text-sm"
                value={form.tags}
                onChange={e => setField('tags', e.target.value)}
                placeholder="Pujian, Penyembahan, Natal"
              />
            </div>
          </div>

          {/* Daftar Slide */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-surface-600">
            <span className="text-xs font-medium text-gray-400">SLIDE ({form.slides.length})</span>
            <button onClick={addSlide} className="p-1 rounded hover:bg-surface-600 text-primary-400">
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {form.slides.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => setActiveSlideIdx(idx)}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  idx === activeSlideIdx ? 'bg-primary-600/20 ring-1 ring-primary-600' : 'hover:bg-surface-700'
                }`}
              >
                <GripVertical size={14} className="text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{slide.label || `Slide ${idx + 1}`}</p>
                  <p className="text-xs text-gray-500 truncate">{slide.content?.split('\n')[0] || '(kosong)'}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={e => { e.stopPropagation(); moveSlide(idx, -1); }}
                    className="p-0.5 rounded hover:bg-surface-600 text-gray-400"
                    disabled={idx === 0}
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveSlide(idx, 1); }}
                    className="p-0.5 rounded hover:bg-surface-600 text-gray-400"
                    disabled={idx === form.slides.length - 1}
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSlide(idx); }}
                    className="p-0.5 rounded hover:bg-red-900 text-red-400"
                    disabled={form.slides.length === 1}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSlide && (
            <>
              <div className="p-4 border-b border-surface-600 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Label Slide</label>
                  <input
                    className="input-field text-sm"
                    value={activeSlide.label}
                    onChange={e => updateSlide(activeSlideIdx, 'label', e.target.value)}
                    placeholder="Verse 1, Chorus, Bridge..."
                  />
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Text editor */}
                <div className="flex-1 p-4 flex flex-col">
                  <label className="block text-xs text-gray-400 mb-2">Konten Slide</label>
                  <textarea
                    className="flex-1 input-field text-base resize-none font-mono leading-relaxed"
                    value={activeSlide.content}
                    onChange={e => updateSlide(activeSlideIdx, 'content', e.target.value)}
                    placeholder="Ketik lirik di sini...&#10;Baris baru = baris baru di slide"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter = baris baru di slide. Gunakan preview di kanan untuk melihat hasil.
                  </p>
                </div>

                {/* Preview */}
                <div className="w-72 p-4 border-l border-surface-600">
                  <label className="block text-xs text-gray-400 mb-2">Preview</label>
                  <SlidePreview
                    slide={activeSlide}
                    settings={form}
                    isActive
                    size="md"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Styling */}
        <div className="w-64 border-l border-surface-600 flex flex-col overflow-hidden">
          {/* Tab selector */}
          <div className="flex border-b border-surface-600 shrink-0">
            <button
              onClick={() => setStyleTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                styleTab === 'text' ? 'text-white border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Palette size={12} /> Teks
            </button>
            <button
              onClick={() => setStyleTab('background')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                styleTab === 'background' ? 'text-white border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Layers size={12} /> Background
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ── Tab: Teks ── */}
            {styleTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warna Teks</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.text_color}
                      onChange={e => setField('text_color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <input className="input-field text-sm flex-1" value={form.text_color}
                      onChange={e => setField('text_color', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Font</label>
                  <select className="input-field text-sm" value={form.font_family}
                    onChange={e => setField('font_family', e.target.value)}>
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Ukuran Font: <span className="text-white">{form.font_size}px</span>
                  </label>
                  <input type="range" min="20" max="100" value={form.font_size}
                    onChange={e => setField('font_size', parseInt(e.target.value))}
                    className="w-full accent-primary-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rata Teks</label>
                  <div className="flex gap-1">
                    {['left', 'center', 'right'].map(align => (
                      <button key={align} onClick={() => setField('text_align', align)}
                        className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                          form.text_align === align ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'
                        }`}>
                        {align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Background ── */}
            {styleTab === 'background' && (
              <div className="space-y-4">
                {/* Tipe background */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Jenis Background</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'solid',    label: 'Solid' },
                      { id: 'gradient', label: 'Gradien' },
                      { id: 'animated', label: '✨ Animasi' },
                    ].map(t => (
                      <button key={t.id} onClick={() => setField('bg_type', t.id)}
                        className={`py-1.5 rounded text-xs transition-colors ${
                          form.bg_type === t.id ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid */}
                {form.bg_type === 'solid' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Warna Latar</label>
                    <div className="flex items-center gap-2">
                      <input type="color"
                        value={form.bg_config?.color || form.background_color || '#000000'}
                        onChange={e => {
                          setField('bg_config', { color: e.target.value });
                          setField('background_color', e.target.value);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <input className="input-field text-sm flex-1"
                        value={form.bg_config?.color || form.background_color || '#000000'}
                        onChange={e => {
                          setField('bg_config', { color: e.target.value });
                          setField('background_color', e.target.value);
                        }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      {[
                        { color: '#000000', label: 'Hitam' }, { color: '#1a237e', label: 'Biru' },
                        { color: '#1b5e20', label: 'Hijau' }, { color: '#4a148c', label: 'Ungu' },
                        { color: '#b71c1c', label: 'Merah' }, { color: '#ffffff', label: 'Putih' },
                      ].map(p => (
                        <button key={p.color}
                          onClick={() => { setField('bg_config', { color: p.color }); setField('background_color', p.color); }}
                          className="py-1.5 rounded text-xs border border-surface-500 hover:border-primary-500 transition-colors"
                          style={{ backgroundColor: p.color, color: p.color === '#ffffff' ? '#000' : '#fff' }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gradient */}
                {form.bg_type === 'gradient' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Warna Awal</label>
                        <div className="flex gap-1.5">
                          <input type="color" value={form.bg_config?.from || '#1a237e'}
                            onChange={e => setField('bg_config', { ...form.bg_config, from: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                          <input className="input-field text-xs flex-1"
                            value={form.bg_config?.from || '#1a237e'}
                            onChange={e => setField('bg_config', { ...form.bg_config, from: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Warna Akhir</label>
                        <div className="flex gap-1.5">
                          <input type="color" value={form.bg_config?.to || '#4a148c'}
                            onChange={e => setField('bg_config', { ...form.bg_config, to: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                          <input className="input-field text-xs flex-1"
                            value={form.bg_config?.to || '#4a148c'}
                            onChange={e => setField('bg_config', { ...form.bg_config, to: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Arah: {form.bg_config?.angle ?? 135}°
                      </label>
                      <input type="range" min="0" max="360" value={form.bg_config?.angle ?? 135}
                        onChange={e => setField('bg_config', { ...form.bg_config, angle: parseInt(e.target.value) })}
                        className="w-full accent-primary-500" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form.bg_config?.animated}
                        onChange={e => setField('bg_config', { ...form.bg_config, animated: e.target.checked })}
                        className="w-4 h-4 accent-primary-500" />
                      <span className="text-xs text-gray-300">Animasikan gradien</span>
                    </label>
                    {/* Preview gradient */}
                    <div className="w-full h-12 rounded-lg"
                      style={{ background: `linear-gradient(${form.bg_config?.angle ?? 135}deg, ${form.bg_config?.from || '#1a237e'}, ${form.bg_config?.to || '#4a148c'})` }} />
                    {/* Preset gradient */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Preset</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {GRADIENT_PRESETS.map(p => (
                          <button key={p.name}
                            onClick={() => setField('bg_config', { from: p.from, to: p.to, angle: p.angle })}
                            className="py-2 rounded text-xs border border-surface-500 hover:border-primary-500 transition-colors font-medium"
                            style={{ background: `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`, color: '#fff' }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated */}
                {form.bg_type === 'animated' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Pilih efek animasi background:</p>
                    <div className="space-y-1.5">
                      {ANIMATED_PRESETS.map(p => (
                        <button key={p.id}
                          onClick={() => setField('bg_config', { preset: p.id })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                            form.bg_config?.preset === p.id
                              ? 'bg-primary-600/30 ring-1 ring-primary-500 text-white'
                              : 'bg-surface-700 text-gray-400 hover:text-white hover:bg-surface-600'
                          }`}>
                          <span className="font-medium">{p.name}</span>
                          <span className="block text-gray-500 text-xs mt-0.5">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                    {form.bg_config?.preset === 'particles' && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Warna Partikel</label>
                        <div className="flex gap-1.5">
                          <input type="color"
                            value={form.bg_config?.particle_color || '#ffffff'}
                            onChange={e => setField('bg_config', { ...form.bg_config, particle_color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                          <input className="input-field text-xs flex-1"
                            value={form.bg_config?.particle_color || '#ffffff'}
                            onChange={e => setField('bg_config', { ...form.bg_config, particle_color: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
