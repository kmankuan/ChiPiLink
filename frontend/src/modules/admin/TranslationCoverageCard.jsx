import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Languages,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const LANG_META = {
  en: { flag: '\u{1F1FA}\u{1F1F8}', label: 'English', color: 'bg-blue-500' },
  es: { flag: '\u{1F1F5}\u{1F1E6}', label: 'Espa\u00f1ol', color: 'bg-yellow-500' },
  zh: { flag: '\u{1F1E8}\u{1F1F3}', label: '\u4E2D\u6587', color: 'bg-red-500' },
};

export default function TranslationCoverageCard() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [missingDialog, setMissingDialog] = useState({ open: false, lang: '', keys: [] });

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const res = await api.get('/translations/admin/coverage');
      setData(res.data);
    } catch {
      toast.error('Failed to load coverage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverage();
  }, []);

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success(t('translations.keyCopied'));
  };

  const openMissingDialog = (lang) => {
    if (!data) return;
    const langData = data.languages[lang];
    setMissingDialog({
      open: true,
      lang,
      keys: langData?.missing_keys || [],
    });
  };

  if (loading) {
    return (
      <Card data-testid="translation-coverage-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { languages, categories, total_reference_keys } = data;

  return (
    <Card data-testid="translation-coverage-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5" />
              {t('translations.progressTitle')}
            </CardTitle>
            <CardDescription>{t('translations.progressDesc')}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchCoverage}
            disabled={loading}
            data-testid="refresh-coverage-btn"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-language progress bars */}
        <div className="grid gap-3">
          {['en', 'es', 'zh'].map((lang) => {
            const info = languages[lang];
            const meta = LANG_META[lang];
            const isComplete = info.missing_count === 0;
            return (
              <div key={lang} className="space-y-1.5" data-testid={`coverage-${lang}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{meta.flag}</span>
                    <span className="font-medium">{meta.label}</span>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer border-amber-300 text-amber-600 hover:bg-amber-50"
                              onClick={() => openMissingDialog(lang)}
                              data-testid={`missing-badge-${lang}`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {info.missing_count} {t('translations.missingKeys').toLowerCase()}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{t('translations.viewMissing')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {info.coverage_pct}%
                  </span>
                </div>
                <Progress
                  value={info.coverage_pct}
                  className="h-2"
                  data-testid={`progress-bar-${lang}`}
                />
                <p className="text-xs text-muted-foreground">
                  {info.translated}/{total_reference_keys} {t('translations.translated').toLowerCase()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Expandable category breakdown */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm font-medium"
            onClick={() => setExpanded(!expanded)}
            data-testid="toggle-category-breakdown"
          >
            {t('translations.categoryBreakdown')}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {expanded && (
            <div className="mt-2 border rounded-lg overflow-hidden" data-testid="category-breakdown-table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">{t('translations.category')}</th>
                      {['en', 'es', 'zh'].map((lang) => (
                        <th key={lang} className="text-center p-2 font-medium w-20">
                          {LANG_META[lang].flag}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categories).map(([cat, counts]) => (
                      <tr key={cat} className="border-t">
                        <td className="p-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat}</code>
                          <span className="text-xs text-muted-foreground ml-1">({counts.total})</span>
                        </td>
                        {['en', 'es', 'zh'].map((lang) => {
                          const pct = counts.total > 0 ? Math.round((counts[lang] / counts.total) * 100) : 0;
                          return (
                            <td key={lang} className="text-center p-2">
                              <Badge
                                variant={pct === 100 ? 'default' : pct >= 80 ? 'outline' : 'destructive'}
                                className={`text-xs ${pct === 100 ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                              >
                                {pct}%
                              </Badge>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Missing Keys Dialog */}
      <Dialog
        open={missingDialog.open}
        onOpenChange={(open) => setMissingDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('translations.missingKeysFor')} {LANG_META[missingDialog.lang]?.flag} {LANG_META[missingDialog.lang]?.label}
            </DialogTitle>
            <DialogDescription>
              {missingDialog.keys.length} {t('translations.missingKeys').toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {missingDialog.keys.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t('translations.noMissingKeys')}</p>
            ) : (
              <div className="space-y-1">
                {missingDialog.keys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 group"
                  >
                    <code className="text-xs break-all">{key}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyKey(key)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
