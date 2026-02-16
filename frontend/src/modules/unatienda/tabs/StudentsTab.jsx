/**
 * Students Management Tab (Admin)
 * Compact table with sorting, pagination, inline pre-sale toggle
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, Lock, Unlock, GraduationCap,
  Eye, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, Plus
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/shared/TablePagination';

const API = process.env.REACT_APP_BACKEND_URL;

export default function StudentsTab({ token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionStudent, setActionStudent] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/all-students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || data || []);
      } else {
        const res2 = await fetch(`${API}/api/store/students/synced`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res2.ok) {
          const data = await res2.json();
          setStudents(data.students || []);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const handleLockUnlock = async () => {
    if (!actionStudent) return;
    setProcessing(true);
    const studentId = actionStudent.student_id || actionStudent.sync_id;
    const endpoint = actionType === 'lock'
      ? `${API}/api/store/school-year/students/${studentId}/lock`
      : `${API}/api/store/school-year/students/${studentId}/unlock`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(actionType === 'unlock' && unlockReason ? { body: JSON.stringify({ reason: unlockReason }) } : {})
      });
      if (res.ok) {
        toast.success(actionType === 'lock' ? 'Profile locked' : 'Profile unlocked');
        fetchStudents();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error updating student');
      }
    } catch { toast.error('Error updating student'); }
    finally { setProcessing(false); setActionStudent(null); setActionType(null); setUnlockReason(''); }
  };

  const handleTogglePresale = async (studentId, currentMode) => {
    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/students/bulk-presale`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: [studentId], presale_mode: !currentMode })
      });
      if (res.ok) {
        setStudents(prev => prev.map(s =>
          (s.student_id || s.sync_id) === studentId ? { ...s, presale_mode: !currentMode } : s
        ));
        toast.success(`Pre-sale ${!currentMode ? 'enabled' : 'disabled'}`);
      } else { toast.error('Failed to toggle pre-sale'); }
    } catch { toast.error('Error toggling pre-sale'); }
  };

  const handleBulkPresale = async (enable) => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/students/bulk-presale`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: [...selectedIds], presale_mode: enable })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Pre-sale ${enable ? 'enabled' : 'disabled'} for ${data.modified} students`);
        setSelectedIds(new Set());
        fetchStudents();
      } else { toast.error('Failed to update pre-sale mode'); }
    } catch { toast.error('Error updating pre-sale mode'); }
    finally { setBulkProcessing(false); }
  };

  // Filtering
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(term) ||
      s.student_number?.toLowerCase().includes(term) ||
      s.student_id?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // Sorting
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    const { key, direction } = sortConfig;
    sorted.sort((a, b) => {
      let va, vb;
      switch (key) {
        case 'full_name': va = a.full_name || ''; vb = b.full_name || ''; break;
        case 'grade': {
          const ea = (a.enrollments || []).sort((x, y) => (y.year || 0) - (x.year || 0))[0];
          const eb = (b.enrollments || []).sort((x, y) => (y.year || 0) - (x.year || 0))[0];
          va = parseInt(ea?.grade) || 0; vb = parseInt(eb?.grade) || 0;
          break;
        }
        case 'school': va = a.school_name || ''; vb = b.school_name || ''; break;
        case 'locked': va = a.is_locked ? 1 : 0; vb = b.is_locked ? 1 : 0; break;
        case 'presale': va = a.presale_mode ? 1 : 0; vb = b.presale_mode ? 1 : 0; break;
        default: va = ''; vb = '';
      }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return direction === 'asc' ? -1 : 1;
      if (va > vb) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredStudents, sortConfig]);

  // Pagination
  const { page, pageSize, totalPages, paginated, setPage, setPageSize, canPrev, canNext, totalItems } = usePagination(sortedStudents, 25);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const toggleAll = useCallback(() => {
    const visibleIds = paginated.map(s => s.student_id || s.sync_id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  }, [paginated, selectedIds]);

  const lockedCount = students.filter(s => s.is_locked).length;
  const presaleCount = students.filter(s => s.presale_mode).length;
  const gradeCount = [...new Set(students.flatMap(s => (s.enrollments || []).map(e => e.grade)).filter(Boolean))].length;

  const SortHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <button onClick={() => handleSort(sortKey)} className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors ${className}`}>
        {label}
        {isActive ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
      </button>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3" data-testid="students-tab">
      {/* Compact inline stats */}
      <div className="flex items-center gap-2 flex-wrap" data-testid="student-stats">
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-xs font-medium">
          <Users className="h-3.5 w-3.5" /> <span className="text-base font-bold leading-none">{students.length}</span> students
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-amber-50 dark:bg-amber-950/40 text-amber-600 text-xs font-medium">
          <Lock className="h-3.5 w-3.5" /> <span className="text-base font-bold leading-none">{lockedCount}</span> locked
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${presaleCount > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/40 text-orange-600' : 'border-border/50 bg-muted/50 text-muted-foreground'}`}>
          <ShoppingCart className="h-3.5 w-3.5" /> <span className="text-base font-bold leading-none">{presaleCount}</span> pre-sale
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-medium">
          <GraduationCap className="h-3.5 w-3.5" /> <span className="text-base font-bold leading-none">{gradeCount}</span> grades
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or student ID..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" data-testid="student-search" />
        </div>
        <div className="flex items-center gap-1.5">
          {selectedIds.size > 0 && (
            <>
              <span className="text-[11px] text-muted-foreground font-medium">{selectedIds.size} sel.</span>
              <Button variant="outline" size="sm" onClick={() => handleBulkPresale(true)} disabled={bulkProcessing}
                className="gap-1 h-7 text-[11px] border-orange-300 text-orange-700 hover:bg-orange-50" data-testid="bulk-presale-on">
                <ShoppingCart className="h-3 w-3" /> Pre-sale On
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkPresale(false)} disabled={bulkProcessing}
                className="gap-1 h-7 text-[11px]" data-testid="bulk-presale-off">
                Pre-sale Off
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-7 text-[11px]">Clear</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={fetchStudents} className="gap-1 h-7 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Row count */}
      <div className="text-[11px] text-muted-foreground">
        Showing {paginated.length} of {sortedStudents.length} students
        {searchTerm && ` (filtered from ${students.length})`}
      </div>

      {/* Table */}
      {sortedStudents.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No students found</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-8 px-2">
                      <Checkbox
                        checked={paginated.length > 0 && paginated.every(s => selectedIds.has(s.student_id || s.sync_id))}
                        onCheckedChange={toggleAll} data-testid="select-all-students" />
                    </TableHead>
                    <TableHead className="px-2"><SortHeader label="Student" sortKey="full_name" /></TableHead>
                    <TableHead className="px-2 w-16"><SortHeader label="Grade" sortKey="grade" /></TableHead>
                    <TableHead className="px-2 hidden md:table-cell"><SortHeader label="School" sortKey="school" /></TableHead>
                    <TableHead className="px-2 w-24"><SortHeader label="Status" sortKey="locked" /></TableHead>
                    <TableHead className="px-2 w-20 text-center"><SortHeader label="Pre-sale" sortKey="presale" className="justify-center" /></TableHead>
                    <TableHead className="px-2 w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((student) => {
                    const id = student.student_id || student.sync_id;
                    const enrollment = (student.enrollments || []).sort((a, b) => (b.year || 0) - (a.year || 0))[0];
                    const isLocked = student.is_locked === true;
                    const isPresale = student.presale_mode === true;
                    const isSelected = selectedIds.has(id);

                    return (
                      <TableRow key={id} className={`h-10 ${isSelected ? 'bg-primary/5' : ''}`} data-testid={`student-row-${id}`}>
                        <TableCell className="px-2 py-1">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(id)} data-testid={`select-student-${id}`} />
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className="text-xs font-medium leading-tight block">{student.full_name}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight block">{student.student_number || id}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <span className="text-xs font-medium">{enrollment?.grade || '-'}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 hidden md:table-cell">
                          <span className="text-[11px] text-muted-foreground truncate max-w-[140px] block">{student.school_name || '-'}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            {isLocked ? (
                              <Badge variant="destructive" className="gap-0.5 text-[10px] px-1.5 py-0 h-5"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 h-5"><Unlock className="h-2.5 w-2.5" /> Editable</Badge>
                            )}
                            {enrollment?.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex">Approved</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleTogglePresale(id, isPresale)}
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              isPresale
                                ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            data-testid={`presale-toggle-${id}`}
                            title={isPresale ? 'Disable pre-sale' : 'Enable pre-sale'}
                          >
                            <ShoppingCart className="h-2.5 w-2.5" />
                            {isPresale ? 'On' : 'Off'}
                          </button>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(student)}
                              className="h-6 w-6 p-0" data-testid={`view-student-${id}`}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {isLocked ? (
                              <Button variant="ghost" size="sm" onClick={() => { setActionStudent(student); setActionType('unlock'); setUnlockReason(''); }}
                                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700" data-testid={`unlock-student-${id}`}>
                                <Unlock className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => { setActionStudent(student); setActionType('lock'); }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700" data-testid={`lock-student-${id}`}>
                                <Lock className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={sortedStudents.length}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
          />
        </>
      )}

      {/* Lock/Unlock Dialog */}
      <Dialog open={!!actionStudent} onOpenChange={() => { setActionStudent(null); setActionType(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionType === 'lock' ? 'Lock Student Profile' : 'Unlock Student Profile'}</DialogTitle>
            <DialogDescription>
              {actionType === 'lock'
                ? `Lock "${actionStudent?.full_name}"'s profile to prevent editing.`
                : `Unlock "${actionStudent?.full_name}"'s profile to allow editing.`}
            </DialogDescription>
          </DialogHeader>
          {actionType === 'unlock' && (
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Parent needs to update info" rows={2} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionStudent(null)}>Cancel</Button>
            <Button onClick={handleLockUnlock} disabled={processing}
              variant={actionType === 'lock' ? 'destructive' : 'default'} className="gap-2">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> :
                actionType === 'lock' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {actionType === 'lock' ? 'Lock' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> {selectedStudent?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Student ID</p><p className="font-mono text-xs">{selectedStudent.student_id || selectedStudent.sync_id}</p></div>
                <div><p className="text-xs text-muted-foreground">Student Number</p><p>{selectedStudent.student_number || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">School</p><p>{selectedStudent.school_name || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Relation</p><p className="capitalize">{selectedStudent.relation_type || '-'}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Profile Status</p>
                  <Badge variant={selectedStudent.is_locked ? 'destructive' : 'outline'} className="text-xs">
                    {selectedStudent.is_locked ? 'Locked' : 'Editable'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pre-sale</p>
                  <Badge className={`text-xs ${selectedStudent.presale_mode ? 'bg-orange-100 text-orange-700' : ''}`} variant={selectedStudent.presale_mode ? 'default' : 'outline'}>
                    {selectedStudent.presale_mode ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enrollments</p>
                <div className="space-y-2">
                  {(selectedStudent.enrollments || []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{e.year}</Badge>
                        <span className="text-sm">Grade {e.grade || '?'}</span>
                      </div>
                      <Badge variant={e.status === 'approved' ? 'default' : 'outline'}
                        className={`text-xs ${e.status === 'approved' ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}`}>
                        {e.status || 'pending'}
                      </Badge>
                    </div>
                  ))}
                  {(!selectedStudent.enrollments || selectedStudent.enrollments.length === 0) && (
                    <p className="text-xs text-muted-foreground">No enrollments</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
