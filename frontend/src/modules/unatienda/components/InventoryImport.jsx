/**
 * Inventory Import Component
 * CSV-based inventory import with preview and duplicate handling options
 */
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, 
  Plus, RefreshCw, ArrowRight, Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InventoryImport({ token, onImportComplete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('add');
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API}/api/store/inventory-import/template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error downloading template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Error downloading template');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Only CSV files are allowed');
        return;
      }
      setSelectedFile(file);
      setPreviewData(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('Select a file first');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicate_mode', duplicateMode);

      const response = await fetch(`${API}/api/store/inventory-import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Preview error');
      }

      setPreviewData(data);
    } catch (error) {
      toast.error(error.message || 'Error previewing');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicate_mode', duplicateMode);

      const response = await fetch(`${API}/api/store/inventory-import/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Import error');
      }

      toast.success(data.message);
      setShowDialog(false);
      setPreviewData(null);
      setSelectedFile(null);
      onImportComplete?.();
    } catch (error) {
      toast.error(error.message || 'Error importing');
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setPreviewData(null);
    setSelectedFile(null);
    setDuplicateMode('add');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-500">New</Badge>;
      case 'update_add':
        return <Badge className="bg-blue-500">Add</Badge>;
      case 'update_replace':
        return <Badge className="bg-orange-500">Replace</Badge>;
      case 'skip':
        return <Badge variant="secondary">Skip</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button 
        variant="outline" 
        onClick={() => { resetDialog(); setShowDialog(true); }}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>

      {/* Import Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Inventory from CSV
            </DialogTitle>
            <DialogDescription>
              Download the template, fill in the information and upload the file to add products to inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Step 1: Download Template */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Download Template
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  The template includes columns: code, name, grade, quantity, price, subject, publisher, isbn, description
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Select Duplicate Mode */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  What to do with existing codes?
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup value={duplicateMode} onValueChange={setDuplicateMode} className="space-y-2">
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="flex-1 cursor-pointer">
                      <span className="font-medium">Add quantity</span>
                      <p className="text-xs text-muted-foreground">Adds CSV quantity to existing. Ex: 10 existing + 5 from CSV = 15</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="flex-1 cursor-pointer">
                      <span className="font-medium">Replace quantity</span>
                      <p className="text-xs text-muted-foreground">Overwrites existing quantity with CSV. Ex: 10 existing → 5 from CSV = 5</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="flex-1 cursor-pointer">
                      <span className="font-medium">Skip existing</span>
                      <p className="text-xs text-muted-foreground">Only imports new products, ignores existing ones</p>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Step 3: Upload File */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <Button 
                    onClick={handlePreview} 
                    disabled={!selectedFile || loading}
                    className="gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Preview
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: <span className="font-medium">{selectedFile.name}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Preview Results */}
            {previewData && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{previewData.actions?.create || 0}</p>
                      <p className="text-xs text-muted-foreground">New</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {(previewData.actions?.update_add || 0) + (previewData.actions?.update_replace || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Update</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-600">{previewData.actions?.skip || 0}</p>
                      <p className="text-xs text-muted-foreground">Skip</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{previewData.error_rows || 0}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {previewData.errors?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {previewData.errors.length} error(s) found:
                        <ul className="list-disc list-inside mt-1">
                          {previewData.errors.slice(0, 5).map((err, i) => (
                            <li key={i} className="text-xs">Row {err.row}: {err.error}</li>
                          ))}
                          {previewData.errors.length > 5 && (
                            <li className="text-xs">... and {previewData.errors.length - 5} more</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Items Table */}
                  {previewData.items?.length > 0 && (
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[80px]">Grade</TableHead>
                            <TableHead className="w-[100px] text-right">Quantity</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{item.nombre}</TableCell>
                              <TableCell>{item.grado}</TableCell>
                              <TableCell className="text-right">
                                {item.existing_quantity !== null ? (
                                  <span className="text-xs">
                                    {item.existing_quantity} → {item.new_quantity}
                                  </span>
                                ) : (
                                  item.cantidad_csv
                                )}
                              </TableCell>
                              <TableCell>{getActionBadge(item.action)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!previewData || importing || previewData.valid_rows === 0}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Import {previewData?.valid_rows || 0} products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
