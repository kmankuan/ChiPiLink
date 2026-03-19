import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Merge, AlertTriangle, Check, Loader2, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function MergeDuplicates() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null);
  const [mergingAll, setMergingAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [results, setResults] = useState([]);
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/sysbook/merge/detect-duplicates`, { headers });
      if (res.ok) { const data = await res.json(); setGroups(data.groups || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadDuplicates(); }, []);

  const handleMerge = async (sourceId, targetId, groupKey) => {
    setMerging(groupKey);
    try {
      const res = await fetch(`${API}/api/sysbook/merge/merge`, { method: 'POST', headers, body: JSON.stringify({ source_book_id: sourceId, target_book_id: targetId }) });
      if (res.ok) {
        const result = await res.json();
        setResults(prev => [...prev, result]);
        toast.success('Merged! ' + result.orders_updated + ' orders updated');
        setGroups(prev => prev.filter(g => g.key !== groupKey));
      } else { const err = await res.json().catch(() => ({})); toast.error(err.detail || 'Failed'); }
    } catch { toast.error('Network error'); }
    setMerging(null); setConfirmDialog(null);
  };

  const handleMergeAll = async () => {
    setMergingAll(true);
    try {
      const res = await fetch(`${API}/api/sysbook/merge/merge-all-duplicates`, { method: 'POST', headers });
      if (res.ok) { const r = await res.json(); toast.success('Merged ' + r.merged + ' duplicates!'); await loadDuplicates(); }
    } catch {}
    setMergingAll(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Scanning for duplicates...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Merge className="h-5 w-5" /> Merge Duplicates</h3>
          <p className="text-xs text-muted-foreground">{groups.length > 0 ? groups.length + ' duplicate groups found' : 'No duplicates. Inventory is clean!'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDuplicates}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          {groups.length > 0 && (
            <Button size="sm" onClick={() => setConfirmDialog({ type: 'all' })} disabled={mergingAll} className="bg-amber-600 hover:bg-amber-700 gap-1">
              {mergingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
              Merge All ({groups.length})
            </Button>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <Card><CardContent className="text-center py-8"><Check className="h-10 w-10 text-green-500 mx-auto mb-2" /><p className="font-medium text-green-700">No duplicates found</p></CardContent></Card>
      )}

      {groups.map(group => {
        const keep = group.items.find(i => i.book_id === group.suggested_keep);
        const dups = group.items.filter(i => i.book_id !== group.suggested_keep);
        return (
          <Card key={group.key} className="border-amber-200">
            <CardHeader className="py-2 px-4 bg-amber-50 dark:bg-amber-950/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-mono">{group.normalized_code}</span>
                <Badge variant="outline" className="text-[10px]">Grade {group.grade || '?'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {keep && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-200">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">{keep.name}</p>
                    <p className="text-[10px] text-green-600 font-mono">Code: {keep.code} | Stock: {keep.stock} | Reserved: {keep.reserved}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 text-[10px]">KEEP</Badge>
                </div>
              )}
              {dups.map(dup => (
                <div key={dup.book_id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <Trash2 className="h-4 w-4 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">{dup.name}</p>
                    <p className="text-[10px] text-red-600 font-mono">Code: {dup.code} | Stock: {dup.stock} | Reserved: {dup.reserved}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 shrink-0 border-red-300 text-red-700" disabled={merging === group.key}
                    onClick={() => setConfirmDialog({ type: 'single', source: dup, target: keep, groupKey: group.key })}>
                    {merging === group.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Merge className="h-3 w-3 mr-1" />} Merge
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {results.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4"><CardTitle className="text-xs">Merge Log ({results.length})</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-1 max-h-40 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500 shrink-0" />
                <span className="font-mono">{r.source?.code}</span>
                <ArrowRight className="h-2.5 w-2.5" />
                <span className="font-mono">{r.target?.code}</span>
                <span>| {r.orders_updated} orders</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{confirmDialog?.type === 'all' ? 'Merge All?' : 'Confirm Merge'}</DialogTitle>
            <DialogDescription className="text-xs">
              {confirmDialog?.type === 'all' ? 'Merge ' + groups.length + ' groups. Cannot be undone.' : confirmDialog?.source ? 'Move orders from "' + confirmDialog.source.name + '" into "' + (confirmDialog.target?.name || '') + '". Cannot be undone.' : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700"
              onClick={() => { if (confirmDialog?.type === 'all') { handleMergeAll(); setConfirmDialog(null); } else if (confirmDialog?.source) { handleMerge(confirmDialog.source.book_id, confirmDialog.target.book_id, confirmDialog.groupKey); } }}>
              <Merge className="h-3.5 w-3.5 mr-1" /> {confirmDialog?.type === 'all' ? 'Merge All' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
