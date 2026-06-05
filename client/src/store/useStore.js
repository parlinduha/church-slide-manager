import { create } from 'zustand';

const API_BASE = '/api';

export const useStore = create((set, get) => ({
  // ─── Songs ────────────────────────────────────────────────
  songs: [],
  songsLoading: false,
  songsError: null,

  fetchSongs: async (search = '', tag = '') => {
    set({ songsLoading: true, songsError: null });
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tag) params.set('tag', tag);
      const res = await fetch(`${API_BASE}/songs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      set({ songs: json.data, songsLoading: false });
    } catch (err) {
      set({ songsError: err.message, songsLoading: false });
    }
  },

  createSong: async (data) => {
    const res = await fetch(`${API_BASE}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await get().fetchSongs();
    return json.data;
  },

  updateSong: async (id, data) => {
    const res = await fetch(`${API_BASE}/songs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await get().fetchSongs();
    return json.data;
  },

  deleteSong: async (id) => {
    const res = await fetch(`${API_BASE}/songs/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await get().fetchSongs();
  },

  // ─── Services ─────────────────────────────────────────────
  services: [],
  servicesLoading: false,
  currentService: null,

  fetchServices: async () => {
    set({ servicesLoading: true });
    try {
      const res = await fetch(`${API_BASE}/services`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      set({ services: json.data, servicesLoading: false });
    } catch (err) {
      set({ servicesLoading: false });
    }
  },

  fetchService: async (id) => {
    const res = await fetch(`${API_BASE}/services/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    set({ currentService: json.data });
    return json.data;
  },

  createService: async (data) => {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await get().fetchServices();
    return json.data;
  },

  updateService: async (id, data) => {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (get().currentService?.id === id) {
      set({ currentService: json.data });
    }
    await get().fetchServices();
    return json.data;
  },

  deleteService: async (id) => {
    const res = await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await get().fetchServices();
  },

  // ─── Bible ────────────────────────────────────────────────
  bibleVerses: [],
  bibleBooks: [],

  fetchBibleBooks: async () => {
    const res = await fetch(`${API_BASE}/bible/books`);
    const json = await res.json();
    if (json.success) set({ bibleBooks: json.data });
  },

  fetchBibleVerses: async (book = '', chapter = '') => {
    const params = new URLSearchParams();
    if (book) params.set('book', book);
    if (chapter) params.set('chapter', chapter);
    const res = await fetch(`${API_BASE}/bible?${params}`);
    const json = await res.json();
    if (json.success) set({ bibleVerses: json.data });
  },

  addBibleVerse: async (data) => {
    const res = await fetch(`${API_BASE}/bible`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  },

  deleteBibleVerse: async (id) => {
    const res = await fetch(`${API_BASE}/bible/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
  },

  // ─── Toast Notifications ──────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
