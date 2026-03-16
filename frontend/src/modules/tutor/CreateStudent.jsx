/**
 * Create Student — Form to add a new student manually
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Save } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function CreateStudent() {
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [form, setForm] = useState({
    name: '', grade: '', school: '', school_platform: '',
    parent_name: '', parent_phone: '', parent_language: 'zh',
    membership_type: 'tutoring', monday_board_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Student name required'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/tutor/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        const student = await r.json();
        toast.success('Student created!');
        navigate(`/tutor/student/${student.student_id}`);
      } else {
        const e = await r.json();
        toast.error(e.detail || 'Error');
      }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/tutor')}><ArrowLeft className="h-4 w-4" /></Button>
          <GraduationCap className="h-5 w-5 text-white" />
          <h1 className="text-base font-bold text-white">New Student</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs">Student Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Kevin Yan" className="h-10" /></div>
              <div><Label className="text-xs">Grade</Label><Input value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="8" className="h-10" /></div>
              <div><Label className="text-xs">School</Label><Input value={form.school} onChange={e => set('school', e.target.value)} placeholder="ABC School" className="h-10" /></div>
            </div>

            <div>
              <Label className="text-xs">School Platform</Label>
              <Select value={form.school_platform} onValueChange={v => set('school_platform', v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="imereb">iMereb</SelectItem>
                  <SelectItem value="smart_academy">Smart Academy</SelectItem>
                  <SelectItem value="google_classroom">Google Classroom</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-xs font-bold mb-2">Parent Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Parent Name</Label><Input value={form.parent_name} onChange={e => set('parent_name', e.target.value)} placeholder="Mrs. Yan" className="h-10" /></div>
                <div><Label className="text-xs">Language</Label>
                  <Select value={form.parent_language} onValueChange={v => set('parent_language', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">Chinese 中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Phone</Label><Input value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} placeholder="+507 6XXX-XXXX" className="h-10" /></div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-xs font-bold mb-2">Membership</h3>
              <Select value={form.membership_type} onValueChange={v => set('membership_type', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutoring">Tutoring + Sports</SelectItem>
                  <SelectItem value="sports_only">Sports Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs">Monday.com Board ID (optional)</Label>
              <Input value={form.monday_board_id} onChange={e => set('monday_board_id', e.target.value)} placeholder="Link to student's Monday board" className="h-10 font-mono" />
            </div>

            <Button className="w-full h-12 text-base font-bold text-white bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={submitting}>
              <Save className="h-5 w-5 mr-2" /> {submitting ? 'Creating...' : 'Create Student'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
