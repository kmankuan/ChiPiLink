/**
 * Public Payment Status Page
 * No login required. Anyone can check payment status by reference number.
 * Supports i18n: EN / ES / ZH with inline language switcher.
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle, Clock, XCircle, AlertCircle, ArrowLeft, Wallet, Globe, Check } from 'lucide-react';
import { languages } from '@/i18n';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function LanguagePicker() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = languages.find(l => l.code === i18n.language) || languages[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#e8dfd2] text-sm hover:bg-white transition-colors"
        data-testid="payment-lang-selector"
      >
        <span className="text-base">{current.flag}</span>
        <span className="text-xs text-[#8b7355] font-medium">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-[#e8dfd2] py-1 min-w-[140px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => change(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#FBF7F0] transition-colors ${
                  i18n.language === lang.code ? 'bg-[#FBF7F0]' : ''
                }`}
                data-testid={`payment-lang-${lang.code}`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="text-[#2d2217]">{lang.name}</span>
                {i18n.language === lang.code && <Check className="h-3.5 w-3.5 ml-auto text-[#B8860B]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentStatusPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const ref = query.trim();
    if (ref.length < 3) return;

    setLoading(true);
    setResult(null);
    setSearched(true);

    try {
      const res = await fetch(`${API}/api/payment-verify/public/check?ref=${encodeURIComponent(ref)}`);
      if (res.ok) {
        setResult(await res.json());
      } else {
        setResult({ found: false });
      }
    } catch {
      setResult({ found: false, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setSearched(false);
    inputRef.current?.focus();
  };

  // Map backend status_key to translated label
  const getStatusLabel = (r) => {
    if (!r?.found) return '';
    if (r.status_key) return t(`paymentCheck.${r.status_key}`);
    // Fallback for old format
    const map = {
      green: t('paymentCheck.statusReceived'),
      yellow: t('paymentCheck.statusProcessing'),
      red: t('paymentCheck.statusNotFound'),
    };
    return r.status || map[r.color] || t('paymentCheck.statusReview');
  };

  const STATUS_ICON = {
    green: <CheckCircle className="h-12 w-12 text-green-500" />,
    yellow: <Clock className="h-12 w-12 text-amber-500" />,
    red: <XCircle className="h-12 w-12 text-red-500" />,
  };

  const STATUS_BG = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <a href="/" className="flex items-center gap-2 text-[#2d2217] hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{t('paymentCheck.backToHome')}</span>
        </a>
        <LanguagePicker />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-16">
        <div className="max-w-lg w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2d2217] mb-2">
              <Wallet className="h-8 w-8 text-[#F5EDE0]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2d2217]">{t('paymentCheck.title')}</h1>
            <p className="text-sm text-[#8b7355]">{t('paymentCheck.subtitle')}</p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center bg-white rounded-2xl shadow-lg border border-[#e8dfd2] overflow-hidden focus-within:ring-2 focus-within:ring-[#B8860B] transition-all">
              <Search className="h-5 w-5 text-[#8b7355] ml-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('paymentCheck.placeholder')}
                className="flex-1 py-4 px-3 text-base bg-transparent outline-none text-[#2d2217] placeholder-[#c4b498]"
                autoFocus
                data-testid="payment-search-input"
              />
              {query && (
                <button type="button" onClick={handleClear} className="px-2 text-[#8b7355] hover:text-[#2d2217]">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading || query.trim().length < 3}
                className="px-6 py-4 bg-[#2d2217] text-[#F5EDE0] font-medium text-sm hover:bg-[#3d3227] disabled:opacity-40 transition-colors"
                data-testid="payment-search-btn"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-[#F5EDE0]/30 border-t-[#F5EDE0] rounded-full animate-spin" />
                ) : (
                  t('paymentCheck.search')
                )}
              </button>
            </div>
          </form>

          {/* Result */}
          {searched && result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {result.found ? (
                <div className={`rounded-2xl border-2 p-6 text-center space-y-4 ${STATUS_BG[result.color] || STATUS_BG.yellow}`}>
                  <div className="flex justify-center">
                    {STATUS_ICON[result.color] || STATUS_ICON.yellow}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2d2217]">{getStatusLabel(result)}</p>
                    {result.amount > 0 && (
                      <p className="text-2xl font-bold text-[#2d2217] mt-1">${result.amount?.toFixed(2)}</p>
                    )}
                    {result.date && (
                      <p className="text-sm text-[#8b7355] mt-1">{t('paymentCheck.date')}: {result.date}</p>
                    )}
                    {result.credited && (
                      <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" /> {t('paymentCheck.credited')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[#e8dfd2] bg-white p-6 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-[#8b7355] mx-auto" />
                  <div>
                    <p className="font-semibold text-[#2d2217]">{t('paymentCheck.notFound')}</p>
                    <p className="text-sm text-[#8b7355] mt-1">{t('paymentCheck.notFoundHint')}</p>
                  </div>
                  <button onClick={handleClear} className="text-sm text-[#B8860B] font-medium hover:underline">
                    {t('paymentCheck.tryAgain')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          {!searched && (
            <div className="text-center space-y-3 pt-4">
              <p className="text-xs text-[#8b7355]">{t('paymentCheck.whereToFind')}</p>
              <div className="grid grid-cols-1 gap-2 text-left max-w-sm mx-auto">
                <div className="flex items-start gap-2 text-xs text-[#8b7355]">
                  <span className="font-bold text-[#B8860B] mt-0.5">1</span>
                  <span>{t('paymentCheck.hint1')}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[#8b7355]">
                  <span className="font-bold text-[#B8860B] mt-0.5">2</span>
                  <span>{t('paymentCheck.hint2')}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[#8b7355]">
                  <span className="font-bold text-[#B8860B] mt-0.5">3</span>
                  <span>{t('paymentCheck.hint3')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-[#c4b498]">© 2026 ChiPi Link</p>
      </footer>
    </div>
  );
}
