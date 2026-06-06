import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Send, Search, Sparkles, Globe } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import AIBibleSearch from '../components/AIBibleSearch';
import SABDASearch from '../components/SABDASearch';

export default function BiblePage() {
  const { bibleVerses, bibleBooks, fetchBibleBooks, fetchBibleVerses, addBibleVerse, deleteBibleVerse, addToast } = useStore();
  const { send, connected } = useWebSocket();

  const [form, setForm] = useState({
    book: '', chapter: '', verse: '', verse_end: '', text: '', translation: 'TB'
  });
  const [filterBook, setFilterBook] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAISearch, setShowAISearch] = useState(false);
  const [showSABDA, setShowSABDA] = useState(false);

  useEffect(() => {
    fetchBibleBooks();
    fetchBibleVerses();
  }, []);

  const handleFilter = () => {
    fetchBibleVerses(filterBook, filterChapter);
  };

  const handleAdd = async () => {
    if (!form.book || !form.chapter || !form.verse || !form.text) {
      addToast('Kitab, pasal, ayat, dan teks wajib diisi', 'warning');
      return;
    }
    try {
      await addBibleVerse(form);
      setForm({ book: '', chapter: '', verse: '', verse_end: '', text: '', translation: 'TB' });
      fetchBibleVerses(filterBook, filterChapter);
      addToast('Ayat berhasil disimpan', 'success');
    } catch (err) {
      addToast(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBibleVerse(id);
      fetchBibleVerses(filterBook, filterChapter);
      addToast('Ayat dihapus', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      addToast(`Gagal menghapus: ${err.message}`, 'error');
    }
  };

  const handleShowOnProjector = (verse) => {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}${verse.verse_end ? `-${verse.verse_end}` : ''}`;
    const content = `${ref}\n\n${verse.text}`;
    send('LOAD_SONG', {
      songId: `bible-${verse.id}`,
      songTitle: ref,
      slides: [{ id: `bv-${verse.id}`, label: ref, content }],
      songSettings: {
        background_color: '#1a0a3d',
        text_color: '#FFFFFF',
        font_size: 38,
        font_family: 'Georgia',
        text_align: 'center',
      },
    });
    addToast(`${ref} ditampilkan ke proyektor`, 'success');
  };

  const formatRef = (v) => `${v.book} ${v.chapter}:${v.verse}${v.verse_end ? `-${v.verse_end}` : ''}`;

  // Simpan hasil SABDA ke database
  const handleSABDASaveVerses = (verses) => {
    fetchBibleVerses(filterBook, filterChapter);
    addToast(`${verses.length} ayat dari SABDA berhasil disimpan`, 'success');
    setShowSABDA(false);
  };

  // Simpan hasil AI ke database sekaligus
  const handleAISaveVerses = async (verses) => {
    let saved = 0;
    for (const v of verses) {
      try {
        await addBibleVerse({
          book: v.book,
          chapter: v.chapter,
          verse: v.verse,
          verse_end: v.verse_end || null,
          text: v.text,
          translation: v.translation || 'TB',
        });
        saved++;
      } catch (_) {}
    }
    fetchBibleVerses(filterBook, filterChapter);
    addToast(`${saved} ayat berhasil disimpan`, 'success');
    setShowAISearch(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
        <div>
          <h1 className="text-xl font-semibold text-white">Ayat Alkitab</h1>
          <p className="text-sm text-gray-400">Simpan & tampilkan ayat ke proyektor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSABDA(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-700/50 text-blue-400 hover:text-blue-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Globe size={14} /> Cari di SABDA
          </button>
          <button
            onClick={() => setShowAISearch(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-700/50 text-yellow-400 hover:text-yellow-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles size={14} /> Cari dengan AI
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Form tambah */}
        <div className="w-80 border-r border-surface-600 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4">Tambah Ayat Baru</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kitab *</label>
              <select
                className="input-field text-sm"
                value={form.book}
                onChange={e => setForm(f => ({ ...f, book: e.target.value }))}
              >
                <option value="">— Pilih Kitab —</option>
                {bibleBooks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pasal *</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={form.chapter}
                  onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ayat *</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={form.verse}
                  onChange={e => setForm(f => ({ ...f, verse: e.target.value }))}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">s/d Ayat</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={form.verse_end}
                  onChange={e => setForm(f => ({ ...f, verse_end: e.target.value }))}
                  placeholder="—"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Terjemahan</label>
              <select
                className="input-field text-sm"
                value={form.translation}
                onChange={e => setForm(f => ({ ...f, translation: e.target.value }))}
              >
                <option value="TB">TB (Terjemahan Baru)</option>
                <option value="BIS">BIS (Bahasa Indonesia Sehari-hari)</option>
                <option value="KJV">KJV (King James Version)</option>
                <option value="NIV">NIV</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Teks Ayat *</label>
              <textarea
                className="input-field text-sm resize-none"
                rows={4}
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="Ketik atau tempel teks ayat di sini..."
              />
            </div>

            <button onClick={handleAdd} className="btn-primary w-full justify-center">
              <Plus size={15} /> Simpan Ayat
            </button>
          </div>
        </div>

        {/* Right - Daftar ayat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-600">
            <select
              className="input-field text-sm flex-1 max-w-xs"
              value={filterBook}
              onChange={e => setFilterBook(e.target.value)}
            >
              <option value="">Semua Kitab</option>
              {bibleBooks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input
              type="number"
              className="input-field text-sm w-24"
              placeholder="Pasal"
              value={filterChapter}
              onChange={e => setFilterChapter(e.target.value)}
              min="1"
            />
            <button onClick={handleFilter} className="btn-secondary text-sm">
              <Search size={14} /> Filter
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4">
            {bibleVerses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <BookOpen size={40} className="text-gray-600 mb-3" />
                <p className="text-gray-400">Belum ada ayat tersimpan</p>
                <p className="text-gray-600 text-sm">Tambahkan ayat menggunakan form di kiri</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {bibleVerses.map(verse => (
                    <motion.div
                      key={verse.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="card p-4 group hover:border-surface-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-purple-400">
                              {formatRef(verse)}
                            </span>
                            <span className="text-xs text-gray-600 bg-surface-700 px-1.5 py-0.5 rounded">
                              {verse.translation}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{verse.text}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleShowOnProjector(verse)}
                            disabled={!connected}
                            className="p-1.5 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white rounded transition-colors"
                            title="Tampilkan ke proyektor"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(verse.id)}
                            className="p-1.5 bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SABDA Search Modal */}
      <AnimatePresence>
        {showSABDA && (
          <SABDASearch
            onSaveVerses={handleSABDASaveVerses}
            onClose={() => setShowSABDA(false)}
          />
        )}
      </AnimatePresence>

      {/* AI Bible Search Modal */}
      <AnimatePresence>
        {showAISearch && (
          <AIBibleSearch
            onSaveVerses={handleAISaveVerses}
            onClose={() => setShowAISearch(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-white mb-2">Hapus Ayat?</h3>
              <p className="text-sm text-gray-400 mb-4">Tindakan ini tidak bisa dibatalkan.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1 justify-center">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
