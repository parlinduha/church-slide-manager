import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Key, Save, CheckCircle, XCircle, Loader2, ExternalLink, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    description: 'GPT-4o Mini (hemat) atau GPT-4o. Butuh API key berbayar.',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Dapatkan API key OpenAI',
    color: 'text-green-400',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 1.5 Flash gratis hingga batas tertentu. Perlu akun Google.',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Dapatkan API key Gemini (Gratis)',
    color: 'text-blue-400',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'ollama',
    name: 'Ollama (Lokal)',
    description: 'Jalankan AI di komputer sendiri. Gratis, tanpa internet, privat.',
    defaultModel: 'llama3',
    models: ['llama3', 'llama3.1', 'mistral', 'gemma2', 'qwen2'],
    docsUrl: 'https://ollama.com/download',
    docsLabel: 'Unduh Ollama',
    color: 'text-orange-400',
    keyPlaceholder: null,
  },
];

export default function SettingsPage() {
  const { addToast } = useStore();

  const [settings, setSettings] = useState({
    provider: 'openai',
    model: '',
    api_key: '',
    ollama_url: 'http://localhost:11434',
    hasKey: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    fetch('/api/ai/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSettings(s => ({
            ...s,
            provider: json.data.provider || 'openai',
            model: json.data.model || '',
            ollama_url: json.data.ollamaUrl || 'http://localhost:11434',
            hasKey: json.data.hasKey,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const currentProvider = PROVIDERS.find(p => p.id === settings.provider) || PROVIDERS[0];

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const body = {
        provider: settings.provider,
        model: settings.model || currentProvider.defaultModel,
        ollama_url: settings.ollama_url,
      };
      if (settings.api_key) body.api_key = settings.api_key;

      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast('Pengaturan AI disimpan', 'success');
      setSettings(s => ({ ...s, hasKey: s.api_key ? true : s.hasKey, api_key: '' }));
    } catch (err) {
      addToast(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage('');
    try {
      const res = await fetch('/api/ai/test');
      const json = await res.json();
      if (json.success) {
        setTestResult('ok');
        setTestMessage(json.message);
      } else {
        setTestResult('fail');
        setTestMessage(json.error);
      }
    } catch (err) {
      setTestResult('fail');
      setTestMessage(err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-600">
        <div className="w-9 h-9 rounded-lg bg-purple-700/30 flex items-center justify-center">
          <Bot size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Pengaturan AI</h1>
          <p className="text-sm text-gray-400">Konfigurasi AI untuk mencari lirik & ayat Alkitab</p>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-6 space-y-6">

        {/* Pilih Provider */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">Pilih Provider AI</label>
          <div className="grid gap-3">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setSettings(s => ({ ...s, provider: p.id, model: p.defaultModel }))}
                className={`text-left p-4 rounded-xl border transition-all ${
                  settings.provider === p.id
                    ? 'border-primary-500 bg-primary-600/10'
                    : 'border-surface-600 bg-surface-800 hover:border-surface-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${p.color}`}>{p.name}</span>
                  {settings.provider === p.id && (
                    <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Aktif</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{p.description}</p>
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-2"
                >
                  <ExternalLink size={10} /> {p.docsLabel}
                </a>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Model</label>
          <div className="flex gap-2">
            <select
              className="input-field text-sm flex-1"
              value={settings.model || currentProvider.defaultModel}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
            >
              {currentProvider.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="input-field text-sm w-44"
              value={settings.model}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
              placeholder="Atau ketik manual..."
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Default: {currentProvider.defaultModel}</p>
        </div>

        {/* API Key (sembunyikan untuk Ollama) */}
        {settings.provider !== 'ollama' && (
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              API Key
              {settings.hasKey && (
                <span className="ml-2 text-xs text-green-400 font-normal">
                  ✓ API key sudah tersimpan
                </span>
              )}
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                className="input-field pl-9 text-sm font-mono"
                value={settings.api_key}
                onChange={e => setSettings(s => ({ ...s, api_key: e.target.value }))}
                placeholder={settings.hasKey ? '••••••••• (kosongkan jika tidak ingin mengubah)' : currentProvider.keyPlaceholder || 'Masukkan API key...'}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-start gap-1.5 mt-2">
              <Info size={12} className="text-gray-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                API key disimpan di server lokal, tidak dikirim ke pihak ketiga selain provider AI yang dipilih.
              </p>
            </div>
          </div>
        )}

        {/* Ollama URL */}
        {settings.provider === 'ollama' && (
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">URL Ollama</label>
            <input
              className="input-field text-sm font-mono"
              value={settings.ollama_url}
              onChange={e => setSettings(s => ({ ...s, ollama_url: e.target.value }))}
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pastikan Ollama sudah berjalan dan model sudah diunduh: <code className="text-orange-400">ollama pull llama3</code>
            </p>
          </div>
        )}

        {/* Tombol aksi */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>

          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-secondary"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            {testing ? 'Menguji...' : 'Uji Koneksi'}
          </button>
        </div>

        {/* Hasil test */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 p-4 rounded-xl border ${
              testResult === 'ok'
                ? 'bg-green-900/20 border-green-700 text-green-300'
                : 'bg-red-900/20 border-red-700 text-red-300'
            }`}
          >
            {testResult === 'ok'
              ? <CheckCircle size={18} className="shrink-0 mt-0.5" />
              : <XCircle size={18} className="shrink-0 mt-0.5" />
            }
            <p className="text-sm">{testMessage}</p>
          </motion.div>
        )}

        {/* Info cara pakai */}
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cara Menggunakan Fitur AI</p>
          <ul className="space-y-1.5 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-primary-400 shrink-0">•</span>
              <span>Di halaman <strong className="text-white">Daftar Lagu</strong>, klik tombol <strong className="text-white">✨ Cari dengan AI</strong> untuk mencari lirik lengkap beserta pembagian slide otomatis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 shrink-0">•</span>
              <span>Di halaman <strong className="text-white">Alkitab</strong>, klik tombol <strong className="text-white">✨ Cari dengan AI</strong> untuk mencari ayat berdasarkan referensi (Yoh 3:16) atau tema ("kasih", "iman").</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 shrink-0">•</span>
              <span>Hasil pencarian AI dapat langsung diedit sebelum disimpan ke database.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
