/**
 * PrintConfigPanel — Admin panel for configuring package list format and printer settings.
 * Two modes: Simple (field toggles) and Advanced (template editor).
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer, Settings, FileText, Save, Loader2,
  LayoutTemplate, SlidersHorizontal, Usb, RefreshCw, History,
  Clock, User, Package, CheckCircle2, Unplug, Plug, Zap, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import useThermalPrinter from '@/hooks/useThermalPrinter';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

export default function PrintConfigPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [format, setFormat] = useState(null);
  const [template, setTemplate] = useState('');
  const [printerConfig, setPrinterConfig] = useState(null);
  const [configTab, setConfigTab] = useState('simple');
  const [mainTab, setMainTab] = useState('format');
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (mainTab === 'history') fetchHistory();
  }, [mainTab, historyPage]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [fmtRes, printerRes] = await Promise.all([
        fetch(`${API_URL}/api/print/config/format`, { headers }),
        fetch(`${API_URL}/api/print/config/printer`, { headers }),
      ]);
      if (fmtRes.ok) {
        const data = await fmtRes.json();
        setFormat(data.format);
        setTemplate(data.template || '');
      }
      if (printerRes.ok) {
        const data = await printerRes.json();
        setPrinterConfig(data);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/print/jobs?limit=20&skip=${historyPage * 20}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.jobs || []);
        setHistoryTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching print history:', err);
    }
  };

  const saveFormat = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/print/config/format`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ format, template }),
      });
      if (res.ok) toast.success(t('print.configSaved', 'Configuration saved'));
      else toast.error(t('print.configError', 'Error saving configuration'));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const savePrinter = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/print/config/printer`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(printerConfig),
      });
      if (res.ok) toast.success(t('print.printerSaved', 'Printer settings saved'));
      else toast.error(t('print.printerError', 'Error saving printer settings'));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addPrinter = () => {
    setPrinterConfig(prev => ({
      ...prev,
      printers: [...(prev?.printers || []), {
        id: `printer-${Date.now()}`,
        name: '',
        brand: 'Logic Controls',
        model: '',
        connection: 'usb',
        paper_size: '80mm',
        enabled: true,
      }],
    }));
  };

  const updatePrinter = (idx, field, value) => {
    setPrinterConfig(prev => {
      const printers = [...(prev?.printers || [])];
      printers[idx] = { ...printers[idx], [field]: value };
      return { ...prev, printers };
    });
  };

  const removePrinter = (idx) => {
    setPrinterConfig(prev => ({
      ...prev,
      printers: prev.printers.filter((_, i) => i !== idx),
    }));
  };

  const updateFormat = (section, field, value) => {
    setFormat(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="print-config-panel">
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="format" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('print.formatConfig', 'Package List Format')}
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-2">
            <Printer className="h-4 w-4" />
            {t('print.printerConfig', 'Printer Settings')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t('print.history', 'Print History')}
          </TabsTrigger>
        </TabsList>

        {/* ─── Format Configuration ─── */}
        <TabsContent value="format" className="space-y-4">
          <Tabs value={configTab} onValueChange={setConfigTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t('print.simpleMode', 'Field Toggles')}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <LayoutTemplate className="h-4 w-4" />
                {t('print.advancedMode', 'Template Editor')}
              </TabsTrigger>
            </TabsList>

            {/* Simple Mode: Field Toggles */}
            <TabsContent value="simple" className="space-y-4">
              {format && (
                <>
                  {/* Paper Settings */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('print.paperSettings', 'Paper Settings')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Label className="w-24">{t('print.paperSize', 'Paper Size')}</Label>
                        <Select value={format.paper_size} onValueChange={(v) => setFormat(p => ({ ...p, paper_size: v }))}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm</SelectItem>
                            <SelectItem value="80mm">80mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-4">
                        <Label className="w-24">{t('print.fontSize', 'Font Size')}</Label>
                        <Select value={format.style?.font_size || '12px'} onValueChange={(v) => updateFormat('style', 'font_size', v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10px">Small (10px)</SelectItem>
                            <SelectItem value="12px">Medium (12px)</SelectItem>
                            <SelectItem value="14px">Large (14px)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Header */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('print.headerSection', 'Header')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ToggleRow label={t('print.showLogo', 'Show Logo')} checked={format.header?.show_logo} onChange={(v) => updateFormat('header', 'show_logo', v)} />
                      {format.header?.show_logo && (
                        <div>
                          <Label className="text-xs">{t('print.logoUrl', 'Logo URL')}</Label>
                          <Input value={format.header?.logo_url || ''} onChange={(e) => updateFormat('header', 'logo_url', e.target.value)} placeholder="https://..." className="mt-1" />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">{t('print.title', 'Title')}</Label>
                        <Input value={format.header?.title || ''} onChange={(e) => updateFormat('header', 'title', e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{t('print.subtitle', 'Subtitle')}</Label>
                        <Input value={format.header?.subtitle || ''} onChange={(e) => updateFormat('header', 'subtitle', e.target.value)} className="mt-1" />
                      </div>
                      <ToggleRow label={t('print.showDate', 'Show Date')} checked={format.header?.show_date} onChange={(v) => updateFormat('header', 'show_date', v)} />
                      <ToggleRow label={t('print.showOrderId', 'Show Order ID')} checked={format.header?.show_order_id} onChange={(v) => updateFormat('header', 'show_order_id', v)} />
                    </CardContent>
                  </Card>

                  {/* Body */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('print.bodySection', 'Item List')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ToggleRow label={t('print.showStudentName', 'Show Student Name')} checked={format.body?.show_student_name} onChange={(v) => updateFormat('body', 'show_student_name', v)} />
                      <ToggleRow label={t('print.showGrade', 'Show Grade')} checked={format.body?.show_grade} onChange={(v) => updateFormat('body', 'show_grade', v)} />
                      <ToggleRow label={t('print.showCheckboxes', 'Show Checkboxes')} checked={format.body?.show_checkboxes} onChange={(v) => updateFormat('body', 'show_checkboxes', v)} />
                      <ToggleRow label={t('print.showItemCode', 'Show Item Code')} checked={format.body?.show_item_code} onChange={(v) => updateFormat('body', 'show_item_code', v)} />
                      <ToggleRow label={t('print.showItemName', 'Show Item Name')} checked={format.body?.show_item_name} onChange={(v) => updateFormat('body', 'show_item_name', v)} />
                      <ToggleRow label={t('print.showItemPrice', 'Show Item Price')} checked={format.body?.show_item_price} onChange={(v) => updateFormat('body', 'show_item_price', v)} />
                      <ToggleRow label={t('print.showItemQty', 'Show Quantity')} checked={format.body?.show_item_quantity} onChange={(v) => updateFormat('body', 'show_item_quantity', v)} />
                      <ToggleRow label={t('print.showItemStatus', 'Show Status')} checked={format.body?.show_item_status} onChange={(v) => updateFormat('body', 'show_item_status', v)} />
                    </CardContent>
                  </Card>

                  {/* Footer */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('print.footerSection', 'Footer')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ToggleRow label={t('print.showTotal', 'Show Total')} checked={format.footer?.show_total} onChange={(v) => updateFormat('footer', 'show_total', v)} />
                      <ToggleRow label={t('print.showItemCount', 'Show Item Count')} checked={format.footer?.show_item_count} onChange={(v) => updateFormat('footer', 'show_item_count', v)} />
                      <ToggleRow label={t('print.showSignature', 'Show Signature Line')} checked={format.footer?.show_signature_line} onChange={(v) => updateFormat('footer', 'show_signature_line', v)} />
                      {format.footer?.show_signature_line && (
                        <div>
                          <Label className="text-xs">{t('print.signatureLabel', 'Signature Label')}</Label>
                          <Input value={format.footer?.signature_label || ''} onChange={(e) => updateFormat('footer', 'signature_label', e.target.value)} className="mt-1" />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">{t('print.customText', 'Custom Footer Text')}</Label>
                        <Textarea value={format.footer?.custom_text || ''} onChange={(e) => updateFormat('footer', 'custom_text', e.target.value)} rows={2} className="mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Button onClick={saveFormat} disabled={saving} className="w-full gap-2" data-testid="save-format-btn">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('print.saveConfig', 'Save Configuration')}
              </Button>
            </TabsContent>

            {/* Advanced Mode: Template Editor */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('print.templateEditor', 'HTML Template')}</CardTitle>
                  <CardDescription>{t('print.templateDesc', 'Edit the raw HTML template for the package list. Use {{variable}} for dynamic content.')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                    data-testid="template-editor"
                  />
                </CardContent>
              </Card>
              <Button onClick={saveFormat} disabled={saving} className="w-full gap-2" data-testid="save-template-btn">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('print.saveTemplate', 'Save Template')}
              </Button>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── Printer Settings ─── */}
        <TabsContent value="printer" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{t('print.registeredPrinters', 'Registered Printers')}</CardTitle>
                  <CardDescription>{t('print.printerDesc', 'Configure USB thermal printers')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addPrinter} data-testid="add-printer-btn">
                  <Usb className="h-4 w-4 mr-2" />
                  {t('print.addPrinter', 'Add Printer')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(printerConfig?.printers || []).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {t('print.noPrinters', 'No printers configured. Click "Add Printer" to register your USB thermal printer.')}
                </p>
              ) : (
                printerConfig.printers.map((printer, idx) => (
                  <Card key={printer.id} className="p-4 space-y-3" data-testid={`printer-${idx}`}>
                    <div className="flex items-center justify-between">
                      <Badge variant={printer.enabled ? 'default' : 'secondary'}>
                        {printer.enabled ? t('print.active', 'Active') : t('print.inactive', 'Inactive')}
                      </Badge>
                      <Switch checked={printer.enabled} onCheckedChange={(v) => updatePrinter(idx, 'enabled', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('print.printerName', 'Name')}</Label>
                        <Input value={printer.name} onChange={(e) => updatePrinter(idx, 'name', e.target.value)} placeholder="Front Desk Printer" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{t('print.brand', 'Brand')}</Label>
                        <Input value={printer.brand} onChange={(e) => updatePrinter(idx, 'brand', e.target.value)} placeholder="Logic Controls" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{t('print.model', 'Model')}</Label>
                        <Input value={printer.model} onChange={(e) => updatePrinter(idx, 'model', e.target.value)} placeholder="LR2000" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{t('print.paperSizePrinter', 'Paper Size')}</Label>
                        <Select value={printer.paper_size} onValueChange={(v) => updatePrinter(idx, 'paper_size', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm</SelectItem>
                            <SelectItem value="80mm">80mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="gap-1">
                        <Usb className="h-3 w-3" />
                        USB
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removePrinter(idx)}>
                        {t('print.remove', 'Remove')}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('print.generalSettings', 'General Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label={t('print.autoPrint', 'Auto-print from Monday.com triggers')}
                checked={printerConfig?.auto_print}
                onChange={(v) => setPrinterConfig(p => ({ ...p, auto_print: v }))}
              />
            </CardContent>
          </Card>

          <Button onClick={savePrinter} disabled={saving} className="w-full gap-2" data-testid="save-printer-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('print.savePrinter', 'Save Printer Settings')}
          </Button>
        </TabsContent>

        {/* ─── Print History ─── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{t('print.printHistory', 'Print History')}</CardTitle>
                  <CardDescription>{t('print.printHistoryDesc', 'Track which orders were printed, when, and by whom')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHistory} data-testid="refresh-history-btn">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {t('print.noHistory', 'No print jobs recorded yet')}
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((job) => (
                    <div key={job.job_id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg" data-testid={`history-${job.job_id}`}>
                      <div className={`mt-0.5 p-1.5 rounded-full ${job.status === 'printed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {job.status === 'printed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{job.job_id}</span>
                          <Badge variant={job.status === 'printed' ? 'default' : 'secondary'} className="text-[10px]">
                            {job.status === 'printed' ? t('print.statusPrinted', 'Printed') : t('print.statusPending', 'Pending')}
                          </Badge>
                          {job.source === 'monday' && (
                            <Badge variant="outline" className="text-[10px]">Monday.com</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {job.order_count || job.order_ids?.length || 0} {t('print.orders', 'orders')}
                          </span>
                          {job.student_names?.length > 0 && (
                            <span className="truncate max-w-[200px]">{job.student_names.join(', ')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(job.created_at).toLocaleString()}
                          </span>
                          {job.created_by && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {job.created_by}
                            </span>
                          )}
                        </div>
                        {job.printed_at && (
                          <p className="text-xs text-green-600 mt-1">
                            {t('print.printedAt', 'Printed')}: {new Date(job.printed_at).toLocaleString()}
                            {job.printed_by && ` ${t('print.by', 'by')} ${job.printed_by}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {historyTotal > 20 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    {t('print.showing', 'Showing')} {historyPage * 20 + 1}-{Math.min((historyPage + 1) * 20, historyTotal)} {t('print.of', 'of')} {historyTotal}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0}>
                      {t('common.back', 'Back')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => p + 1)} disabled={(historyPage + 1) * 20 >= historyTotal}>
                      {t('common.next', 'Next')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Toggle Row helper ─── */
function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
