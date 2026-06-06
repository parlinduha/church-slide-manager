import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Key, Save, CheckCircle, XCircle, Loader2, ExternalLink, Info, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';

const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Hemat & Akurat',
    badgeColor: 'bg-cyan-700 text-cyan-200',
    description: 'Model terbaik untuk lirik — sangat akurat dan murah. Rekomendasi untuk gereja.',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    docsUrl: 'https://platform.deepseek.com/api_keys',
    docsLabel: 'Dapatkan API key DeepSeek',
    color: 'text-cyan-400',
    keyPlaceholder: 'sk-...',
    needsKey: true,
  },
  {
    id: 'groq',
    name: 'Groq (Llama3)',
    badge: 'Gratis & Cepat',
    badgeColor: 'bg-orange-700 text-orange-200',
    description: 'Gratis dengan batas penggunaan harian. Llama3 sangat cepat (< 2 detik).',
    defaultModel: 'llama3-8b-8192',
    models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'Dapatkan API key Groq (Gratis)',
    color: 'text-orange-400',
    keyPlaceholder: 'gsk_...',
    needsKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    badge: 'Populer',
    badgeColor: 'bg-green-800 text-green-200',
    description: 'GPT-4o Mini cukup akurat untuk lirik lagu. Berbayar per penggunaan.',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Dapatkan API key OpenAI',
    color: 'text-green-400',
    keyPlaceholder: 'sk-...',
    needsKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Ada Free Tier',
    badgeColor: 'bg-blue-800 text-blue-200',
    description: 'Gemini 1.5 Flash gratis dengan kuota harian. Butuh akun Google.',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Dapatkan API key Gemini (Gratis)',
    color: 'text-blue-400',
    keyPlaceholder: 'AIza...',
    needsKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    badge: 'Presisi Tinggi',
    badgeColor: 'bg-purple-800 text-purple-200',
    description: 'Claude Haiku sangat presisi untuk teks. Lebih mahal dari DeepSeek.',
    defaultModel: 'claude-3-haiku-20240307',
    models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Dapatkan API key Anthropic',
    color: 'text-purple-400',
    keyPlaceholder: 'sk-ant-...',
    needsKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (Lokal)',
    badge: 'Offline',
    badgeColor: 'bg-gray-700 text-gray-300',
    description: 'Jalankan AI di komputer sendiri. Privat, tanpa internet, gratis.',
    defaultModel: 'llama3',
    models: ['llama3', 'llama3.1', 'mistral', 'gemma2', 'qwen2.5', 'phi3'],
    docsUrl: 'https://ollama.com/download',
    docsLabel: 'Unduh Ollama',
    color: 'text-gray-400',
    keyPlaceholder: null,
    needsKey: false,
  },
];

export default function SettingsPage() {
  const { addToast } = useStore();

  const [settings, setSettings] = useState({
    provider: 'deepseek',
    model: '',
    api_key: '',
    ollama_url: 'http://localhost:11434',
    hasKey: false,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    fetch('/api/ai/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) setSettings(s => ({
          ...s,
          provider:  json.data.provider  || 'deepseek',
          model:     json.data.model     || '',
          ollama_url:json.data.ollamaUrl || 'http://localhost:11434',
          hasKey:    json.data.hasKey,
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  const currentProvider = PROVIDERS.find(p => p.id === settings.provider) || PROVIDERS[0];

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const body = {
        provider:   settings.provider,
        model:      settings.model || currentProvider.defaultModel,
        ollama_url: settings.ollama_url,
      };
      if (settings.api_key) body.api_key = settings.api_key;

      const res  = await fetch('/api/ai/settings', {
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
      const res  = await fetch('/api/ai/test');
      const json = await res.json();
      setTestResult(json.success ? 'ok' : 'fail');
      setTestMessage(json.success ? json.message : json.error);
    } catch (err) {
      setTestResult('fail');
      setTestMessage(err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="text-gray-400 animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-600">
        <div className="w-9 h-9 rounded-lg bg-purple-700/30 flex items-center justify-center">
          <Bot size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Pengaturan AI</h1>
          <p className="text-sm text-gray-400">Konfigurasi AI untuk pencarian lirik lagu & ayat Alkitab</p>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-6 space-y-6">

        {/* Rekomendasi banner */}
        <div className="flex items-start gap-3 p-3.5 bg-cyan-900/20 border border-cyan-700/40 rounded-xl">
          <Zap size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-300">
            <strong>Rekomendasi:</strong> Gunakan <strong>DeepSeek</strong> atau <strong>Groq</strong> untuk hasil lirik paling akurat dengan harga terjangkau (DeepSeek) atau gratis (Groq).
          </p>
        </div>

        {/* Pilih Provider */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">Pilih Provider AI</label>
          <div className="grid gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setSettings(s => ({ ...s, provider: p.id, model: p.defaultModel }))}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  settings.provider === p.id
                    ? 'border-primary-500 bg-primary-600/10'
                    : 'border-surface-600 bg-surface-800 hover:border-surface-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm ${p.color}`}>{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                  {settings.provider === p.id && (
                    <span className="ml-auto text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Aktif</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{p.description}</p>
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1.5"
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
              placeholder="Ketik nama model..."
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Default: {currentProvider.defaultModel}</p>
        </div>

        {/* API Key */}
        {currentProvider.needsKey && (
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              API Key
              {settings.hasKey && <span className="ml-2 text-xs text-green-400 font-normal">✓ Sudah tersimpan</span>}
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                className="input-field pl-9 text-sm font-mono"
                value={settings.api_key}
                onChange={e => setSettings(s => ({ ...s, api_key: e.target.value }))}
                placeholder={settings.hasKey ? '••••••• (kosongkan jika tidak ingin mengubah)' : (currentProvider.keyPlaceholder || 'Masukkan API key...')}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-start gap-1.5 mt-1.5">
              <Info size={11} className="text-gray-600 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600">API key disimpan di server lokal, tidak dikirim ke pihak selain provider yang dipilih.</p>
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
              Unduh model: <code className="text-orange-400">ollama pull llama3</code>
            </p>
          </div>
        )}

        {/* Tombol */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary">
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            {testing ? 'Menguji...' : 'Uji Koneksi'}
          </button>
        </div>

        {/* Hasil test */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border text-sm ${
              testResult === 'ok'
                ? 'bg-green-900/20 border-green-700 text-green-300'
                : 'bg-red-900/20 border-red-700 text-red-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult === 'ok'
                ? <CheckCircle size={17} className="shrink-0 mt-0.5 text-green-400" />
                : <XCircle size={17} className="shrink-0 mt-0.5 text-red-400" />
              }
              <div className="flex-1">
                <p>{testMessage}</p>
                {/* Bantuan kontekstual berdasarkan error */}
                {testResult === 'fail' && testMessage.toLowerCase().includes('insufficient balance') && (
                  <div className="mt-2 p-2.5 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <p className="text-xs text-yellow-300 font-medium mb-1">💡 Saldo kredit habis — cara fix:</p>
                    <ol className="text-xs text-yellow-200 space-y-1 list-decimal list-inside">
                      <li>
                        Buka{' '}
                        <a href="https://platform.deepseek.com/top_up" target="_blank" rel="noopener noreferrer"
                          className="underline hover:text-white">
                          platform.deepseek.com → Top up
                        </a>
                        {' '}(minimal $2, cukup ribuan pencarian)
                      </li>
                      <li>Atau ganti ke <strong>Groq</strong> (gratis, daftar di console.groq.com)</li>
                    </ol>
                  </div>
                )}
                {testResult === 'fail' && testMessage.toLowerCase().includes('api key') && (
                  <p className="mt-1.5 text-xs opacity-75">Pastikan API key sudah disimpan dengan klik tombol "Simpan" sebelum uji koneksi.</p>
                )}
                {testResult === 'fail' && (testMessage.toLowerCase().includes('timeout') || testMessage.toLowerCase().includes('connect')) && (
                  <p className="mt-1.5 text-xs opacity-75">Periksa koneksi internet Anda. Untuk Ollama, pastikan sudah berjalan di komputer.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tips akurasi */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tips Akurasi Lirik</p>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0 mt-0.5">✓</span>
              <span>Gunakan <strong className="text-white">DeepSeek Chat</strong> atau <strong className="text-white">GPT-4o</strong> untuk lirik lagu Bahasa Indonesia — lebih akurat dari model yang lebih kecil.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0 mt-0.5">✓</span>
              <span>Setelah lirik muncul, klik tombol <strong className="text-white">✏️ Koreksi dengan AI</strong> jika ada kata yang kurang tepat — AI akan memperbaikinya otomatis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0 mt-0.5">✓</span>
              <span>Tambahkan nama <strong className="text-white">penulis/penyanyi</strong> saat mencari untuk hasil yang lebih spesifik (contoh: "Bapa Engkau Sungguh Baik" oleh "Franky Sihombing").</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 shrink-0 mt-0.5">!</span>
              <span>Selalu periksa dan edit lirik sebelum dipakai di ibadah — AI bisa salah pada kata-kata tertentu.</span>
            </li>
          </ul>
        </div>

        {/* Perbandingan provider */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Perbandingan Provider</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-400">
              <thead>
                <tr className="border-b border-surface-600">
                  <th className="text-left py-1.5 font-medium text-gray-300">Provider</th>
                  <th className="text-center py-1.5 font-medium text-gray-300">Akurasi Lirik</th>
                  <th className="text-center py-1.5 font-medium text-gray-300">Kecepatan</th>
                  <th className="text-center py-1.5 font-medium text-gray-300">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {[
                  { name: 'DeepSeek',  accuracy: '★★★★★', speed: '★★★★', price: 'Sangat Murah' },
                  { name: 'Groq',      accuracy: '★★★★',  speed: '★★★★★', price: 'Gratis*' },
                  { name: 'GPT-4o',    accuracy: '★★★★★', speed: '★★★',  price: 'Berbayar' },
                  { name: 'Gemini Flash', accuracy: '★★★★', speed: '★★★★', price: 'Gratis*' },
                  { name: 'Claude Haiku', accuracy: '★★★★★', speed: '★★★★', price: 'Berbayar' },
                  { name: 'Ollama', accuracy: '★★★', speed: '★★★', price: 'Gratis (lokal)' },
                ].map(r => (
                  <tr key={r.name}>
                    <td className="py-1.5 text-white">{r.name}</td>
                    <td className="text-center py-1.5 text-yellow-400">{r.accuracy}</td>
                    <td className="text-center py-1.5">{r.speed}</td>
                    <td className="text-center py-1.5">{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-2">* Ada batas penggunaan harian gratis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
