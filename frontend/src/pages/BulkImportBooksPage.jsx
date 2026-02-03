import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BookOpen,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Settings2,
  Eye,
  Download,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Translation keys
const translations = {
  es: {
    title: 'Importación Masiva de Libros',
    subtitle: 'Importar libros al catálogo privado PCA desde datos copiados de hojas de cálculo',
    backButton: 'Volver al Catálogo',
    step1: 'Paso 1: Pegar Datos',
    step1Desc: 'Copia las filas desde Google Sheets o Excel y pégalas aquí',
    step2: 'Paso 2: Mapear Columnas',
    step2Desc: 'Indica en qué columna está cada dato del libro',
    step3: 'Paso 3: Previsualizar',
    step3Desc: 'Revisa los datos antes de importar',
    pasteHere: 'Pega aquí los datos copiados de tu hoja de cálculo...',
    columnMapping: 'Mapeo de Columnas',
    columnNumber: 'Columna #',
    codeColumn: 'Código',
    nameColumn: 'Nombre',
    priceColumn: 'Precio',
    publisherColumn: 'Editorial',
    isbnColumn: 'ISBN',
    gradeColumn: 'Grado',
    subjectColumn: 'Materia',
    defaultGrade: 'Grado por defecto',
    defaultGradeDesc: 'Se usará cuando no se especifique grado en los datos',
    updateExisting: 'Actualizar existentes',
    updateExistingDesc: 'Si un libro ya existe (mismo código), actualizar sus datos',
    previewButton: 'Previsualizar',
    importButton: 'Importar Libros',
    previewResults: 'Vista Previa',
    row: 'Fila',
    code: 'Código',
    name: 'Nombre',
    price: 'Precio',
    grade: 'Grado',
    action: 'Acción',
    create: 'Crear',
    update: 'Actualizar',
    errorsFound: 'Errores encontrados',
    summary: 'Resumen',
    validRecords: 'registros válidos',
    invalidRecords: 'con errores',
    readyToImport: 'listos para importar',
    importSuccess: 'Importación completada',
    created: 'creados',
    updated: 'actualizados',
    helpTitle: 'Ayuda',
    helpText: 'Para importar libros:\n1. Abre tu hoja de cálculo (Google Sheets, Excel)\n2. Selecciona las filas con los datos\n3. Copia (Ctrl+C o Cmd+C)\n4. Pega en el área de texto arriba\n5. Configura el mapeo de columnas\n6. Previsualiza y luego importa',
    noData: 'No hay datos para mostrar',
    pasteDataFirst: 'Pega los datos de la hoja de cálculo primero',
    previewFirst: 'Primero haz clic en "Previsualizar" para revisar los datos',
    importing: 'Importando...',
    processing: 'Procesando...'
  },
  en: {
    title: 'Bulk Book Import',
    subtitle: 'Import books to the PCA private catalog from spreadsheet data',
    backButton: 'Back to Catalog',
    step1: 'Step 1: Paste Data',
    step1Desc: 'Copy rows from Google Sheets or Excel and paste them here',
    step2: 'Step 2: Map Columns',
    step2Desc: 'Indicate which column contains each book field',
    step3: 'Step 3: Preview',
    step3Desc: 'Review the data before importing',
    pasteHere: 'Paste here the data copied from your spreadsheet...',
    columnMapping: 'Column Mapping',
    columnNumber: 'Column #',
    codeColumn: 'Code',
    nameColumn: 'Name',
    priceColumn: 'Price',
    publisherColumn: 'Publisher',
    isbnColumn: 'ISBN',
    gradeColumn: 'Grade',
    subjectColumn: 'Subject',
    defaultGrade: 'Default grade',
    defaultGradeDesc: 'Will be used when grade is not specified in the data',
    updateExisting: 'Update existing',
    updateExistingDesc: 'If a book already exists (same code), update its data',
    previewButton: 'Preview',
    importButton: 'Import Books',
    previewResults: 'Preview Results',
    row: 'Row',
    code: 'Code',
    name: 'Name',
    price: 'Price',
    grade: 'Grade',
    action: 'Action',
    create: 'Create',
    update: 'Update',
    errorsFound: 'Errors found',
    summary: 'Summary',
    validRecords: 'valid records',
    invalidRecords: 'with errors',
    readyToImport: 'ready to import',
    importSuccess: 'Import completed',
    created: 'created',
    updated: 'updated',
    helpTitle: 'Help',
    helpText: 'To import books:\n1. Open your spreadsheet (Google Sheets, Excel)\n2. Select the rows with data\n3. Copy (Ctrl+C or Cmd+C)\n4. Paste in the text area above\n5. Configure column mapping\n6. Preview and then import',
    noData: 'No data to display',
    pasteDataFirst: 'Paste the spreadsheet data first',
    previewFirst: 'First click "Preview" to review the data',
    importing: 'Importing...',
    processing: 'Processing...'
  },
  zh: {
    title: '批量导入图书',
    subtitle: '从电子表格数据导入图书到PCA私人目录',
    backButton: '返回目录',
    step1: '步骤1：粘贴数据',
    step1Desc: '从Google表格或Excel复制行并粘贴到这里',
    step2: '步骤2：映射列',
    step2Desc: '指定每个图书字段对应的列',
    step3: '步骤3：预览',
    step3Desc: '导入前审核数据',
    pasteHere: '在此粘贴从电子表格复制的数据...',
    columnMapping: '列映射',
    columnNumber: '列 #',
    codeColumn: '代码',
    nameColumn: '名称',
    priceColumn: '价格',
    publisherColumn: '出版社',
    isbnColumn: 'ISBN',
    gradeColumn: '年级',
    subjectColumn: '科目',
    defaultGrade: '默认年级',
    defaultGradeDesc: '当数据中未指定年级时使用',
    updateExisting: '更新现有',
    updateExistingDesc: '如果图书已存在（相同代码），更新其数据',
    previewButton: '预览',
    importButton: '导入图书',
    previewResults: '预览结果',
    row: '行',
    code: '代码',
    name: '名称',
    price: '价格',
    grade: '年级',
    action: '操作',
    create: '创建',
    update: '更新',
    errorsFound: '发现错误',
    summary: '摘要',
    validRecords: '条有效记录',
    invalidRecords: '条有错误',
    readyToImport: '条准备导入',
    importSuccess: '导入完成',
    created: '已创建',
    updated: '已更新',
    helpTitle: '帮助',
    helpText: '导入图书：\n1. 打开电子表格（Google表格、Excel）\n2. 选择数据行\n3. 复制（Ctrl+C或Cmd+C）\n4. 粘贴到上面的文本区域\n5. 配置列映射\n6. 预览然后导入',
    noData: '没有数据显示',
    pasteDataFirst: '请先粘贴电子表格数据',
    previewFirst: '请先点击"预览"审核数据',
    importing: '正在导入...',
    processing: '处理中...'
  }
};

export default function BulkImportBooksPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [gradeDefault, setGradeDefault] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [availableGrades, setAvailableGrades] = useState([]);
  
  const [columnMapping, setColumnMapping] = useState({
    codigo: 0,
    nombre: 1,
    precio: 2,
    editorial: 3,
    isbn: 4,
    grado: 5,
    materia: 6
  });

  // Get translations for current language
  const t = translations[i18n.language] || translations.es;

  // Fetch available grades
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch(`${API}/api/store/bulk-import/grados`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableGrades(data.grades || []);
        }
      } catch (err) {
        console.error('Error fetching grades:', err);
      }
    };
    fetchGrades();
  }, [token]);

  const handlePreview = async () => {
    if (!rawText.trim()) {
      toast.error(t.pasteDataFirst);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/libros/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          column_mapping: columnMapping,
          catalogo_id: 'pca',
          grado_default: gradeDefault || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Preview error');
      
      setPreview(data);
      
      if (data.resumen) {
        toast.success(`${data.resumen.validos} ${t.readyToImport}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.preview.length === 0) {
      toast.error(t.noData);
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/libros/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          column_mapping: columnMapping,
          catalogo_id: 'pca',
          grado_default: gradeDefault || null,
          actualizar_existentes: updateExisting
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Import error');
      
      toast.success(`${t.importSuccess}: ${data.creados} ${t.created}, ${data.actualizados} ${t.updated}`);
      
      // Clear form
      setRawText('');
      setPreview(null);
      
      // Navigate back to catalog after short delay
      setTimeout(() => {
        navigate('/admin', { state: { module: 'unatienda', tab: 'privado' } });
      }, 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleColumnChange = (field, value) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-card border-b">
        <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin', { state: { module: 'unatienda', tab: 'privado' } })}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backButton}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="font-semibold">{t.title}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t.subtitle}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
        {/* Help Panel */}
        {showHelp && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {t.helpTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap">{t.helpText}</pre>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Input & Settings */}
          <div className="space-y-6">
            {/* Step 1: Paste Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  {t.step1}
                </CardTitle>
                <CardDescription>{t.step1Desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t.pasteHere}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="bulk-import-textarea"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {rawText ? `${rawText.split('\n').filter(l => l.trim()).length} líneas detectadas` : ''}
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Column Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  {t.step2}
                </CardTitle>
                <CardDescription>{t.step2Desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'code', label: t.codeColumn },
                    { key: 'nombre', label: t.nameColumn },
                    { key: 'price', label: t.priceColumn },
                    { key: 'publisher', label: t.publisherColumn },
                    { key: 'isbn', label: t.isbnColumn },
                    { key: 'grade', label: t.gradeColumn },
                    { key: 'subject', label: t.subjectColumn },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Select
                        value={String(columnMapping[key])}
                        onValueChange={(v) => handleColumnChange(key, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {t.columnNumber}{n + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Default Grade */}
                <div className="space-y-2">
                  <Label>{t.defaultGrade}</Label>
                  <Select
                    value={gradeDefault || "none"}
                    onValueChange={(v) => setGradeDefault(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.defaultGradeDesc} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- {t.defaultGradeDesc} --</SelectItem>
                      {availableGrades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                      {['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°', '12°'].map((g) => (
                        !availableGrades.includes(g) && <SelectItem key={`default-${g}`} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Update Existing */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.updateExisting}</Label>
                    <p className="text-xs text-muted-foreground">{t.updateExistingDesc}</p>
                  </div>
                  <Switch
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                </div>

                {/* Preview Button */}
                <Button
                  onClick={handlePreview}
                  disabled={loading || !rawText.trim()}
                  className="w-full"
                  data-testid="preview-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      {t.previewButton}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {t.step3}
                </CardTitle>
                <CardDescription>{t.step3Desc}</CardDescription>
              </CardHeader>
              <CardContent>
                {!preview ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t.previewFirst}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-sm">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {preview.resumen?.validos || 0} {t.validRecords}
                      </Badge>
                      {preview.resumen?.invalidos > 0 && (
                        <Badge variant="destructive" className="text-sm">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {preview.resumen.invalidos} {t.invalidRecords}
                        </Badge>
                      )}
                    </div>

                    {/* Preview Table */}
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">{t.row}</TableHead>
                            <TableHead>{t.code}</TableHead>
                            <TableHead>{t.name}</TableHead>
                            <TableHead className="text-right">{t.price}</TableHead>
                            <TableHead>{t.grade}</TableHead>
                            <TableHead className="w-24">{t.action}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.preview?.map((libro, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{libro.fila}</TableCell>
                              <TableCell className="font-mono">{libro.code}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{libro.name}</TableCell>
                              <TableCell className="text-right">${libro.price}</TableCell>
                              <TableCell>{libro.grade || '-'}</TableCell>
                              <TableCell>
                                {libro.ya_existe ? (
                                  <Badge variant="secondary">{t.update}</Badge>
                                ) : (
                                  <Badge variant="default">{t.create}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Errors */}
                    {preview.errores && preview.errores.length > 0 && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {t.errorsFound}
                        </h4>
                        <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                          {preview.errores.map((err, idx) => (
                            <li key={idx}>
                              {t.row} {err.fila}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Import Button */}
                    <Button
                      onClick={handleImport}
                      disabled={importing || !preview || preview.preview?.length === 0}
                      className="w-full"
                      size="lg"
                      data-testid="import-button"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.importing}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {t.importButton} ({preview.resumen?.validos || 0})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
