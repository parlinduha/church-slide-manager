import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Music, Trash2, Edit2, Download, Upload, Key, User, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import SongEditor from '../components/SongEditor';
import AILyricsSearch from '../components/AILyricsSearch';

export default function SongsPage() {
  const { songs, songsLoading, fetchSongs, createSong, updateSong, deleteSong, addToast } = useStore();
  const [search, setSearch] = useState('');
  const [editingSong, setEditingSong] = useState(null); // null = tidak edit, {} = baru, song = edit existing
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAISearch, setShowAISearch] = useState(false);
  const importRef = useRef();

  useEffect(() => {
    fetchSongs(search);
  }, [search]);

  const handleSave = async (data) => {
    try {
      if (editingSong?.id) {
        await updateSong(editingSong.id, data);
        addToast('Lagu berhasil diperbarui', 'success');
      } else {
        await createSong(data);
        addToast('Lagu berhasil ditambahkan', 'success');
      }
      setIsEditing(false);
      setEditingSong(null);
    } catch (err) {
      addToast(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSong(id);
      addToast('Lagu berhasil dihapus', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      addToast(`Gagal menghapus: ${err.message}`, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/songs/export/json', { method: 'POST' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lagu-gereja-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`${data.data?.length || 0} lagu berhasil diekspor`, 'success');
    } catch (err) {
      addToast('Gagal mengekspor', 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const songs = json.data || json;
      if (!Array.isArray(songs)) throw new Error('Format file tidak valid');

      const replace = window.confirm(
        `Impor ${songs.length} lagu?\n\nKlik OK untuk MENAMBAH ke database yang ada.\nKlik Cancel untuk membatalkan.`
      );
      if (replace === null) return;

      const res = await fetch('/api/songs/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs, replace: false }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      addToast(result.message, 'success');
      fetchSongs();
    } catch (err) {
      addToast(`Gagal mengimpor: ${err.message}`, 'error');
    }
    e.target.value = '';
  };

  // Simpan hasil AI langsung ke database tanpa buka editor
  const handleAIImport = async (songData) => {
    await createSong({
      title: songData.title || '',
      author: songData.author || '',
      key_signature: songData.key_signature || '',
      tags: songData.tags || [],
      slides: songData.slides || [],
    });
    addToast(`"${songData.title}" berhasil disimpan!`, 'success');
    // Modal tetap terbuka sehingga user bisa cari lagu lain
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        <SongEditor
          song={editingSong?.id ? editingSong : null}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setEditingSong(null); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
        <div>
          <h1 className="text-xl font-semibold text-white">Daftar Lagu</h1>
          <p className="text-sm text-gray-400">{songs.length} lagu tersimpan</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={importRef} accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={() => importRef.current?.click()} className="btn-ghost text-sm">
            <Upload size={15} />
            <span className="hidden sm:inline">Impor</span>
          </button>
          <button onClick={handleExport} className="btn-ghost text-sm">
            <Download size={15} />
            <span className="hidden sm:inline">Ekspor</span>
          </button>
          <button
            onClick={() => setShowAISearch(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-700/50 text-yellow-400 hover:text-yellow-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles size={14} /> Cari dengan AI
          </button>
          <button
            onClick={() => { setEditingSong({}); setIsEditing(true); }}
            className="btn-primary text-sm"
          >
            <Plus size={15} />
            Tambah Lagu
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-surface-600">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Cari judul, penulis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {songsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-400 text-sm">Memuat...</div>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <Music size={40} className="text-gray-600 mb-3" />
            <p className="text-gray-400 mb-1">Belum ada lagu</p>
            <p className="text-gray-600 text-sm">Tambahkan lagu pertama Anda</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {songs.map(song => (
                <motion.div
                  key={song.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card p-4 hover:border-surface-400 transition-colors group"
                >
                  {/* Color indicator */}
                  <div
                    className="w-full h-1.5 rounded-full mb-3"
                    style={{ backgroundColor: song.background_color || '#000' }}
                  />

                  <h3 className="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2">
                    {song.title}
                  </h3>

                  {song.author && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <User size={10} />
                      {song.author}
                    </div>
                  )}

                  {song.key_signature && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Key size={10} />
                      Kunci {song.key_signature}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <Music size={10} />
                    {song.slides?.length || 0} slide
                  </div>

                  {song.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {song.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-surface-600 text-gray-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingSong(song); setIsEditing(true); }}
                      className="flex-1 py-1.5 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white rounded text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(song.id)}
                      className="flex-1 py-1.5 bg-red-900/20 hover:bg-red-700 text-red-400 hover:text-white rounded text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* AI Lyrics Search Modal */}
      <AnimatePresence>
        {showAISearch && (
          <AILyricsSearch
            onImport={handleAIImport}
            onClose={() => setShowAISearch(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
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
              <h3 className="font-semibold text-white mb-2">Hapus Lagu?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">
                  Batal
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1 justify-center">
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
