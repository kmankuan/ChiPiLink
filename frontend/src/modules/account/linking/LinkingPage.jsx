/**
 * Link Student Page - Simplified version
 * Allows users to link students for textbook access
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  GraduationCap,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  User
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Grade options
const GRADES = [
  { value: 'PK', label: 'Pre-K' },
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' }
];

// Relationship types
const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' }
];

export default function LinkingPage({ embedded = false }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [grade, setGrade] = useState('');
  const [relationship, setRelationship] = useState('');
  const [relationshipOther, setRelationshipOther] = useState('');

  // Fetch data on load
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data with token:', token?.substring(0, 20) + '...');
      console.log('API_URL:', API_URL);
      
      // Fetch students
      const studentsRes = await fetch(`${API_URL}/api/store/textbook-access/my-students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Students response status:', studentsRes.status);
      
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        console.log('Students loaded:', data.students?.length || 0);
        setStudents(data.students || []);
      } else {
        console.error('Failed to load students:', studentsRes.status);
      }
      
      // Fetch schools
      const schoolsRes = await fetch(`${API_URL}/api/store/textbook-access/schools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Schools response status:', schoolsRes.status);
      
      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        console.log('Schools loaded:', data.schools?.length || 0, data.schools?.map(s => s.school_id));
        setSchools(data.schools || []);
      } else {
        console.error('Failed to load schools:', schoolsRes.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setSchoolId('');
    setStudentNumber('');
    setYear(String(new Date().getFullYear()));
    setGrade('');
    setRelationship('');
    setRelationshipOther('');
  };

  const openDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim()) {
      toast.error('Please enter the student name');
      return;
    }
    if (!schoolId) {
      toast.error('Please select a school');
      return;
    }
    
    // Validate school exists in our list
    const selectedSchool = schools.find(s => s.school_id === schoolId);
    if (!selectedSchool) {
      toast.error('Invalid school selected. Please refresh and try again.');
      console.error('School not found:', schoolId, 'Available:', schools.map(s => s.school_id));
      return;
    }
    
    if (!grade) {
      toast.error('Please select a grade');
      return;
    }
    if (!relationship) {
      toast.error('Please select your relationship');
      return;
    }
    if (relationship === 'other' && !relationshipOther.trim()) {
      toast.error('Please specify the relationship');
      return;
    }

    setSaving(true);

    try {
      // Check if token exists
      if (!token) {
        toast.error('Please log in again');
        console.error('No auth token available');
        setSaving(false);
        return;
      }

      const payload = {
        full_name: fullName.trim(),
        school_id: schoolId,
        student_number: studentNumber.trim() || undefined,
        year: parseInt(year),
        grade: grade,
        relation_type: relationship,
        relation_other: relationship === 'other' ? relationshipOther.trim() : undefined
      };

      console.log('Submitting payload:', JSON.stringify(payload));
      console.log('API URL:', `${API_URL}/api/store/textbook-access/students`);
      console.log('Token present:', !!token, 'Token start:', token?.substring(0, 20));

      const response = await fetch(`${API_URL}/api/store/textbook-access/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      
      // Read response as text first (can only read body once)
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        console.error('Raw response was:', responseText);
        toast.error('Server returned invalid response');
        setSaving(false);
        return;
      }

      if (response.ok) {
        toast.success('Student linked successfully!');
        setShowDialog(false);
        fetchData();
      } else {
        const errorMsg = data?.detail || data?.message || `Server error: ${response.status}`;
        console.error('API error:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Exception during submit:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      toast.error(`Error: ${error.message || 'Failed to submit request'}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                PCA Textbooks
              </CardTitle>
              <CardDescription>
                Link students to access exclusive school textbooks
              </CardDescription>
            </div>
            <Button onClick={openDialog} data-testid="link-student-btn">
              <Plus className="h-4 w-4 mr-2" />
              Link Student
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Students ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students linked yet</p>
              <p className="text-sm">Click "Link Student" to add a student</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.school_name} • Grade {student.grade}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(student.current_year_status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Student Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Student</DialogTitle>
            <DialogDescription>
              Enter the student's information to request textbook access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Smith"
                data-testid="student-name-input"
              />
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label>School <span className="text-destructive">*</span></Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger data-testid="school-select">
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.school_id} value={school.school_id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Number (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="studentNumber">Student Number (Optional)</Label>
              <Input
                id="studentNumber"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="School ID or student number"
              />
            </div>

            {/* Year and Grade Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Year <span className="text-destructive">*</span></Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(new Date().getFullYear())}>
                      {new Date().getFullYear()} (Current)
                    </SelectItem>
                    <SelectItem value={String(new Date().getFullYear() + 1)}>
                      {new Date().getFullYear() + 1}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger data-testid="grade-select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label>Relationship <span className="text-destructive">*</span></Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger data-testid="relationship-select">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Other Relationship */}
            {relationship === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="relationshipOther">Specify Relationship <span className="text-destructive">*</span></Label>
                <Input
                  id="relationshipOther"
                  value={relationshipOther}
                  onChange={(e) => setRelationshipOther(e.target.value)}
                  placeholder="e.g. Uncle, Family friend"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} data-testid="submit-student-btn">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
