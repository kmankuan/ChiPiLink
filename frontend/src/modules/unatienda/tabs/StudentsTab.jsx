/**
 * Students Management Tab (Admin)
 * View all linked students, lock/unlock profiles, manage enrollments
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  GraduationCap,
  Eye,
  Shield,
  ShoppingCart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API = process.env.REACT_APP_BACKEND_URL;

export default function StudentsTab({ token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionStudent, setActionStudent] = useState(null);
  const [actionType, setActionType] = useState(null); // 'lock' | 'unlock'
  const [unlockReason, setUnlockReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
        // Fallback to synced students
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        ...(actionType === 'unlock' && unlockReason ? { body: JSON.stringify({ reason: unlockReason }) } : {})
      });

      if (res.ok) {
        toast.success(actionType === 'lock' ? 'Student profile locked' : 'Student profile unlocked');
        fetchStudents();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error updating student');
      }
    } catch (error) {
      toast.error('Error updating student');
    } finally {
      setProcessing(false);
      setActionStudent(null);
      setActionType(null);
      setUnlockReason('');
    }
  };

  const openAction = (student, type) => {
    setActionStudent(student);
    setActionType(type);
    setUnlockReason('');
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(term) ||
      s.student_number?.toLowerCase().includes(term) ||
      s.student_id?.toLowerCase().includes(term)
    );
  });

  const lockedCount = students.filter(s => s.is_locked).length;
  const presaleCount = students.filter(s => s.presale_mode).length;

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const visibleIds = filteredStudents.map(s => s.student_id || s.sync_id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }, [filteredStudents, selectedIds]);

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
      } else {
        toast.error('Failed to update pre-sale mode');
      }
    } catch { toast.error('Error updating pre-sale mode'); }
    finally { setBulkProcessing(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="students-tab">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{lockedCount}</p>
                <p className="text-xs text-muted-foreground">Locked Profiles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{presaleCount}</p>
                <p className="text-xs text-muted-foreground">Pre-sale Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {[...new Set(students.flatMap(s => (s.enrollments || []).map(e => e.grade)).filter(Boolean))].length}
                </p>
                <p className="text-xs text-muted-foreground">Active Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Refresh + Bulk Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Student Profiles</CardTitle>
                <CardDescription>Manage student profiles, lock/unlock editing access</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                  <Button variant="outline" size="sm" onClick={() => handleBulkPresale(true)} disabled={bulkProcessing}
                    className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50" data-testid="bulk-presale-on">
                    <ShoppingCart className="h-3.5 w-3.5" /> Enable Pre-sale
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkPresale(false)} disabled={bulkProcessing}
                    className="gap-1.5 text-xs" data-testid="bulk-presale-off">
                    Disable Pre-sale
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs">
                    Clear
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={fetchStudents} className="gap-2 shrink-0">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="student-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No students found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.student_id || s.sync_id))}
                        onCheckedChange={toggleAll}
                        data-testid="select-all-students"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Grade</TableHead>
                    <TableHead className="hidden md:table-cell">School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const id = student.student_id || student.sync_id;
                    const latestEnrollment = (student.enrollments || []).sort((a, b) => (b.year || 0) - (a.year || 0))[0];
                    const isLocked = student.is_locked === true;
                    const isPresale = student.presale_mode === true;
                    const isSelected = selectedIds.has(id);

                    return (
                      <TableRow key={id} className={isSelected ? 'bg-primary/5' : ''} data-testid={`student-row-${id}`}>
                        <TableCell className="w-[40px]">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(id)} data-testid={`select-student-${id}`} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student.student_number || id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">
                            {latestEnrollment?.grade || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                            {student.school_name || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isLocked ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <Lock className="h-3 w-3" /> Locked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Unlock className="h-3 w-3" /> Editable
                              </Badge>
                            )}
                            {latestEnrollment?.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs hidden sm:inline-flex">
                                Approved
                              </Badge>
                            )}
                            {isPresale && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                                Pre-sale
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStudent(student)}
                              className="h-7 px-2"
                              data-testid={`view-student-${id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isLocked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAction(student, 'unlock')}
                                className="h-7 px-2 text-amber-600 hover:text-amber-700"
                                data-testid={`unlock-student-${id}`}
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAction(student, 'lock')}
                                className="h-7 px-2 text-red-600 hover:text-red-700"
                                data-testid={`lock-student-${id}`}
                              >
                                <Lock className="h-3.5 w-3.5" />
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
          </CardContent>
        </Card>
      )}

      {/* Lock/Unlock Confirmation Dialog */}
      <Dialog open={!!actionStudent} onOpenChange={() => { setActionStudent(null); setActionType(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'lock' ? 'Lock Student Profile' : 'Unlock Student Profile'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'lock'
                ? `Lock "${actionStudent?.full_name}"'s profile to prevent editing by the parent/user.`
                : `Unlock "${actionStudent?.full_name}"'s profile to allow editing again.`
              }
            </DialogDescription>
          </DialogHeader>
          {actionType === 'unlock' && (
            <div className="space-y-2">
              <Label>Reason for unlocking (optional)</Label>
              <Textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Parent needs to update student info"
                rows={2}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionStudent(null)}>Cancel</Button>
            <Button
              onClick={handleLockUnlock}
              disabled={processing}
              variant={actionType === 'lock' ? 'destructive' : 'default'}
              className="gap-2"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> :
                actionType === 'lock' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />
              }
              {actionType === 'lock' ? 'Lock Profile' : 'Unlock Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {selectedStudent?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Student ID</p>
                  <p className="font-mono text-xs">{selectedStudent.student_id || selectedStudent.sync_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student Number</p>
                  <p>{selectedStudent.student_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">School</p>
                  <p>{selectedStudent.school_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Relation</p>
                  <p className="capitalize">{selectedStudent.relation_type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profile Status</p>
                  <Badge variant={selectedStudent.is_locked ? 'destructive' : 'outline'} className="text-xs">
                    {selectedStudent.is_locked ? 'Locked' : 'Editable'}
                  </Badge>
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enrollments</p>
                <div className="space-y-2">
                  {(selectedStudent.enrollments || []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{e.year}</Badge>
                        <span className="text-sm">Grade {e.grade || '?'}</span>
                      </div>
                      <Badge
                        variant={e.status === 'approved' ? 'default' : 'outline'}
                        className={`text-xs ${e.status === 'approved' ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}`}
                      >
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
