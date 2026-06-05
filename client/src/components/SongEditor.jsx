import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Save, X, ChevronUp, ChevronDown } from 'lucide-react';
import SlidePreview from './SlidePreview';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Impact', 'Tahoma'];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Am', 'Dm', 'Em', 'Gm'];

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
  });

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [saving, setSaving] = useState(false);

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
        <div className="w-64 border-l border-surface-600 p-4 overflow-y-auto">
          <h3 className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wider">Tampilan Slide</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Warna Latar</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={e => setField('background_color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  className="input-field text-sm flex-1"
                  value={form.background_color}
                  onChange={e => setField('background_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Warna Teks</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={e => setField('text_color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  className="input-field text-sm flex-1"
                  value={form.text_color}
                  onChange={e => setField('text_color', e.target.value)}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Font</label>
              <select
                className="input-field text-sm"
                value={form.font_family}
                onChange={e => setField('font_family', e.target.value)}
              >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Ukuran Font: <span className="text-white">{form.font_size}px</span>
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={form.font_size}
                onChange={e => setField('font_size', parseInt(e.target.value))}
                className="w-full accent-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Rata Teks</label>
              <div className="flex gap-1">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    onClick={() => setField('text_align', align)}
                    className={`flex-1 py-1.5 rounded text-xs capitalize transition-colors ${
                      form.text_align === align
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Preset Warna</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { bg: '#000000', text: '#FFFFFF', label: 'Hitam' },
                  { bg: '#1a237e', text: '#FFFFFF', label: 'Biru' },
                  { bg: '#1b5e20', text: '#FFFFFF', label: 'Hijau' },
                  { bg: '#4a148c', text: '#FFFFFF', label: 'Ungu' },
                  { bg: '#b71c1c', text: '#FFFFFF', label: 'Merah' },
                  { bg: '#FFFFFF', text: '#000000', label: 'Putih' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setField('background_color', preset.bg); setField('text_color', preset.text); }}
                    className="rounded py-1.5 text-xs border border-surface-500 hover:border-primary-500 transition-colors"
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
