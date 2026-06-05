import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, Calendar, Music, Search, Play, X, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore';

function generateItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function SortableItem({ item, song, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg border border-surface-600 hover:border-surface-500 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>

      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{ backgroundColor: item.type === 'bible' ? '#7c3aed' : (song?.background_color || '#0284c7') }}
      />

      <div className="flex-1 min-w-0">
        {item.type === 'bible' ? (
          <>
            <p className="text-sm font-medium text-white truncate">
              {item.bibleRef || 'Ayat Alkitab'}
            </p>
            <p className="text-xs text-gray-500">{item.translation || 'TB'}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white truncate">{song?.title || '(lagu dihapus)'}</p>
            <p className="text-xs text-gray-500">
              {song?.author ? `${song.author} · ` : ''}{song?.slides?.length || 0} slide
              {song?.key_signature ? ` · Kunci ${song.key_signature}` : ''}
            </p>
          </>
        )}
      </div>

      {item.type === 'bible' ? (
        <BookOpen size={14} className="text-purple-400 shrink-0" />
      ) : (
        <Music size={14} className="text-primary-400 shrink-0" />
      )}

      <button
        onClick={() => onRemove(item.id)}
        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ServicePage() {
  const { services, servicesLoading, songs, fetchServices, fetchSongs, createService, updateService, deleteService, addToast } = useStore();
  const [selectedId, setSelectedId] = useState(null);
  const [items, setItems] = useState([]);
  const [showAddSong, setShowAddSong] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [newServiceModal, setNewServiceModal] = useState(false);
  const [newServiceData, setNewServiceData] = useState({ name: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchServices();
    fetchSongs();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const service = services.find(s => s.id === selectedId);
      if (service) setItems(service.items || []);
    }
  }, [selectedId, services]);

  const selectedService = services.find(s => s.id === selectedId);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
  };

  const addSong = (song) => {
    const newItem = { id: generateItemId(), type: 'song', songId: song.id, order: items.length };
    setItems(prev => [...prev, newItem]);
    setShowAddSong(false);
    setSongSearch('');
  };

  const removeItem = (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSaveOrder = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateService(selectedId, { items });
      addToast('Urutan disimpan', 'success');
    } catch (err) {
      addToast(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceData.name) return;
    try {
      const service = await createService({
        ...newServiceData,
        date: newServiceData.date || new Date().toISOString().split('T')[0],
      });
      setNewServiceModal(false);
      setNewServiceData({ name: '', date: '', notes: '' });
      setSelectedId(service.id);
      addToast('Sesi ibadah dibuat', 'success');
    } catch (err) {
      addToast(`Gagal membuat sesi: ${err.message}`, 'error');
    }
  };

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
    (s.author || '').toLowerCase().includes(songSearch.toLowerCase())
  );

  const getSong = (songId) => songs.find(s => s.id === songId);
  const activeItem = items.find(i => i.id === activeId);
  const activeSong = activeItem ? getSong(activeItem.songId) : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar daftar sesi */}
      <div className="w-72 border-r border-surface-600 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-600">
          <div>
            <h2 className="font-semibold text-white text-sm">Sesi Ibadah</h2>
            <p className="text-xs text-gray-500">{services.length} sesi</p>
          </div>
          <button onClick={() => setNewServiceModal(true)} className="btn-primary text-xs py-1.5 px-3">
            <Plus size={13} /> Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {servicesLoading ? (
            <p className="text-center text-gray-500 text-sm py-8">Memuat...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Belum ada sesi</p>
            </div>
          ) : (
            services.map(service => (
              <button
                key={service.id}
                onClick={() => setSelectedId(service.id)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  selectedId === service.id
                    ? 'bg-primary-600/20 ring-1 ring-primary-600'
                    : 'hover:bg-surface-700'
                }`}
              >
                <p className="text-sm font-medium text-white truncate">{service.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {service.date} · {service.items?.length || 0} item
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main - editor sesi */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedService ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Calendar size={48} className="text-gray-600 mb-3" />
            <p className="text-gray-400 mb-1">Pilih atau buat sesi ibadah</p>
            <p className="text-gray-600 text-sm mb-4">Lalu susun daftar lagu dengan drag & drop</p>
            <button onClick={() => setNewServiceModal(true)} className="btn-primary">
              <Plus size={15} /> Buat Sesi Baru
            </button>
          </div>
        ) : (
          <>
            {/* Header sesi */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
              <div>
                <h1 className="text-lg font-semibold text-white">{selectedService.name}</h1>
                <p className="text-sm text-gray-400">{selectedService.date} · {items.length} item</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddSong(true)}
                  className="btn-secondary text-sm"
                >
                  <Plus size={14} /> Tambah Lagu
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="btn-primary text-sm"
                >
                  <Play size={14} />
                  {saving ? 'Menyimpan...' : 'Simpan Urutan'}
                </button>
              </div>
            </div>

            {/* Drag & drop list */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-surface-600 rounded-xl">
                  <Music size={32} className="text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">Belum ada lagu di sesi ini</p>
                  <button
                    onClick={() => setShowAddSong(true)}
                    className="mt-3 text-primary-400 text-sm hover:text-primary-300"
                  >
                    + Tambah lagu
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={({ active }) => setActiveId(active.id)}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-w-2xl">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-5 text-right shrink-0">{idx + 1}</span>
                          <div className="flex-1">
                            <SortableItem
                              item={item}
                              song={getSong(item.songId)}
                              onRemove={removeItem}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId && activeItem && (
                      <div className="flex items-center gap-3 p-3 bg-surface-600 rounded-lg border border-primary-500 shadow-2xl opacity-90">
                        <GripVertical size={16} className="text-gray-400" />
                        <p className="text-sm text-white">{activeSong?.title || activeItem.bibleRef || '...'}</p>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal tambah lagu */}
      <AnimatePresence>
        {showAddSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddSong(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-4 w-full max-w-md max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Tambah Lagu ke Sesi</h3>
                <button onClick={() => setShowAddSong(false)}>
                  <X size={18} className="text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input-field pl-8 text-sm"
                  placeholder="Cari lagu..."
                  value={songSearch}
                  onChange={e => setSongSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => addSong(song)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{song.title}</p>
                    <p className="text-xs text-gray-500">
                      {song.author || '—'} · {song.slides?.length} slide
                      {song.key_signature ? ` · ${song.key_signature}` : ''}
                    </p>
                  </button>
                ))}
                {filteredSongs.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-6">Lagu tidak ditemukan</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal buat sesi baru */}
      <AnimatePresence>
        {newServiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setNewServiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-white mb-4">Buat Sesi Ibadah Baru</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nama Sesi *</label>
                  <input
                    className="input-field text-sm"
                    placeholder="Ibadah Minggu Pagi"
                    value={newServiceData.name}
                    onChange={e => setNewServiceData(d => ({ ...d, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tanggal</label>
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={newServiceData.date}
                    onChange={e => setNewServiceData(d => ({ ...d, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Catatan</label>
                  <textarea
                    className="input-field text-sm resize-none"
                    rows={2}
                    placeholder="Catatan tambahan..."
                    value={newServiceData.notes}
                    onChange={e => setNewServiceData(d => ({ ...d, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setNewServiceModal(false)} className="btn-secondary flex-1 justify-center">
                  Batal
                </button>
                <button onClick={handleCreateService} className="btn-primary flex-1 justify-center">
                  Buat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
