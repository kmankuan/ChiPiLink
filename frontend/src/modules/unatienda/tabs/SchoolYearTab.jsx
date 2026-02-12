/**
 * School Year Configuration Admin Tab
 * Manage school year settings, calendar type, enrollment periods, and auto-enrollment
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Calendar,
  Settings,
  RefreshCw,
  Loader2,
  Save,
  PlayCircle,
  AlertTriangle,
  CheckCircle,
  Users,
  GraduationCap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SchoolYearTab({ token }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  // Editable form state
  const [form, setForm] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch(`${API}/api/store/school-year/config`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/store/school-year/status`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data);
        setForm({
          calendar_type: data.calendar_type || 'official',
          enrollment_start_month: data.enrollment_start_month || 1,
          enrollment_start_day: data.enrollment_start_day || 15,
          current_school_year: data.current_school_year || new Date().getFullYear(),
          auto_add_enabled: data.auto_add_enabled !== false,
          months_before_year_end: data.months_before_year_end || 2
        });
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching school year config:', error);
      toast.error('Error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/store/school-year/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Configuration saved');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error saving configuration');
      }
    } catch (error) {
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerAutoEnrollment = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API}/api/store/school-year/trigger-auto-enrollment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setTriggerResult(result);
        toast.success(`Auto-enrollment completed: ${result.enrollments_added} students enrolled`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error triggering auto-enrollment');
      }
    } catch (error) {
      toast.error('Error triggering auto-enrollment');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="school-year-tab">
      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{form.current_school_year}</p>
                <p className="text-xs text-muted-foreground">Current School Year</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{status?.next_school_year || '-'}</p>
                <p className="text-xs text-muted-foreground">Next School Year</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {status?.should_add_new_enrollment ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {status?.should_add_new_enrollment ? 'Enrollment Due' : 'Up to Date'}
                </p>
                <p className="text-xs text-muted-foreground">Enrollment Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">School Year Configuration</CardTitle>
              <CardDescription>Manage calendar type, enrollment periods, and automation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calendar type + Current year */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Calendar Type</Label>
              <Select value={form.calendar_type} onValueChange={(v) => setForm(p => ({ ...p, calendar_type: v }))}>
                <SelectTrigger data-testid="calendar-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Official (Mar-Dec)</SelectItem>
                  <SelectItem value="particular">Private (Jan-Nov)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current School Year</Label>
              <Input
                type="number"
                value={form.current_school_year}
                onChange={(e) => setForm(p => ({ ...p, current_school_year: parseInt(e.target.value) || 2026 }))}
                data-testid="current-year-input"
              />
            </div>
          </div>

          {/* Enrollment period */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Enrollment Start Month</Label>
              <Select
                value={String(form.enrollment_start_month)}
                onValueChange={(v) => setForm(p => ({ ...p, enrollment_start_month: parseInt(v) }))}
              >
                <SelectTrigger data-testid="enrollment-month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Enrollment Start Day</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.enrollment_start_day}
                onChange={(e) => setForm(p => ({ ...p, enrollment_start_day: parseInt(e.target.value) || 1 }))}
                data-testid="enrollment-day-input"
              />
            </div>
          </div>

          {/* Auto-enrollment toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Auto-Enrollment</Label>
              <p className="text-xs text-muted-foreground">
                Automatically add new enrollment entries for next school year
              </p>
            </div>
            <Switch
              checked={form.auto_add_enabled}
              onCheckedChange={(v) => setForm(p => ({ ...p, auto_add_enabled: v }))}
              data-testid="auto-enrollment-switch"
            />
          </div>

          {form.auto_add_enabled && (
            <div className="space-y-2">
              <Label>Months Before Year End to Trigger</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={form.months_before_year_end}
                onChange={(e) => setForm(p => ({ ...p, months_before_year_end: parseInt(e.target.value) || 2 }))}
              />
              <p className="text-xs text-muted-foreground">New enrollment fields appear this many months before the school year ends</p>
            </div>
          )}

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-config-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Auto-enrollment trigger */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <PlayCircle className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle className="text-base">Manual Auto-Enrollment Trigger</CardTitle>
              <CardDescription>
                Add enrollment entries for the next school year to all currently approved students
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {triggerResult && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm space-y-1">
              <p className="font-medium text-green-700 dark:text-green-400">Last Run Results:</p>
              <p>Next Year: {triggerResult.next_year}</p>
              <p>Students Processed: {triggerResult.students_processed}</p>
              <p>Enrollments Added: {triggerResult.enrollments_added}</p>
              <p>Skipped (already exists): {triggerResult.skipped_already_exists}</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setShowTriggerDialog(true)}
            className="gap-2"
            data-testid="trigger-enrollment-btn"
          >
            <PlayCircle className="h-4 w-4" />
            Trigger Auto-Enrollment for {status?.next_school_year || 'Next Year'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Auto-Enrollment</DialogTitle>
            <DialogDescription>
              This will add a new enrollment entry (year {status?.next_school_year}) for all students
              with an approved enrollment in the current year ({form.current_school_year}).
              Students who already have an enrollment for {status?.next_school_year} will be skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>Cancel</Button>
            <Button
              onClick={() => { setShowTriggerDialog(false); handleTriggerAutoEnrollment(); }}
              disabled={triggering}
              className="gap-2"
            >
              {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Confirm & Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
