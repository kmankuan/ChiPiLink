/**
 * Student Linking Page - Complete Rewrite v3.0
 * Uses axios for HTTP requests to avoid fetch body stream issues
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

// UI Components
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

// Icons
import {
  GraduationCap,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  RefreshCw
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Static grade options
const GRADE_OPTIONS = [
  { value: 'K3', label: 'K3' },
  { value: 'K4', label: 'K4' },
  { value: 'K5', label: 'K5' },
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

// Static relationship options
const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'representative', label: 'Representative' },
  { value: 'other', label: 'Other' }
];

// Create axios instance
const createApiClient = (token) => {
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
};

export default function LinkingPage({ embedded = false }) {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  
  // Data states
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    school_id: '',
    student_number: '',
    year: new Date().getFullYear(),
    grade: '',
    relation_type: '',
    relation_other: ''
  });

  // Load initial data
  const loadData = useCallback(async () => {
    // Wait for auth to be ready
    if (authLoading) {
      console.log('[LinkingPage] Auth still loading, waiting...');
      return;
    }
    
    // Check authentication
    if (!token || !isAuthenticated) {
      console.log('[LinkingPage] Not authenticated - token:', !!token, 'isAuthenticated:', isAuthenticated);
      setLoading(false);
      setLoadError('Please log in to access this feature');
      return;
    }
    
    console.log('[LinkingPage] Loading data with token:', token?.substring(0, 30) + '...');
    setLoading(true);
    setLoadError(null);
    
    try {
      const api = createApiClient(token);
      
      // Load schools first (doesn't require auth)
      console.log('[LinkingPage] Fetching schools...');
      const schoolsRes = await api.get('/api/store/textbook-access/schools');
      console.log('[LinkingPage] Schools loaded:', schoolsRes.data?.schools?.length || 0);
      setSchools(schoolsRes.data?.schools || []);
      
      // Then load students (requires auth)
      console.log('[LinkingPage] Fetching my-students...');
      const studentsRes = await api.get('/api/store/textbook-access/my-students');
      console.log('[LinkingPage] Students loaded:', studentsRes.data?.students?.length || 0);
      setStudents(studentsRes.data?.students || []);
      
      setLoadError(null);
    } catch (err) {
      console.error('[LinkingPage] Load data error:', err);
      console.error('[LinkingPage] Error response:', err.response?.data);
      console.error('[LinkingPage] Error status:', err.response?.status);
      
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load data';
      setLoadError(errorMsg);
      
      // Don't show toast for auth errors - just display inline
      if (err.response?.status !== 401) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, authLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset form
  const resetForm = () => {
    setFormData({
      full_name: '',
      school_id: '',
      student_number: '',
      year: new Date().getFullYear(),
      grade: '',
      relation_type: '',
      relation_other: ''
    });
  };

  // Open dialog
  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Close dialog
  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Handle form field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Submit form
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.full_name.trim()) {
      toast.error('Please enter student name');
      return;
    }
    if (!formData.school_id) {
      toast.error('Please select a school');
      return;
    }
    if (!formData.grade) {
      toast.error('Please select a grade');
      return;
    }
    if (!formData.relation_type) {
      toast.error('Please select your relationship');
      return;
    }
    if (formData.relation_type === 'other' && !formData.relation_other.trim()) {
      toast.error('Please specify the relationship');
      return;
    }

    setSubmitting(true);

    try {
      const api = createApiClient(token);
      
      const payload = {
        full_name: formData.full_name.trim(),
        school_id: formData.school_id,
        student_number: formData.student_number.trim() || null,
        year: formData.year,
        grade: formData.grade,
        relation_type: formData.relation_type,
        relation_other: formData.relation_type === 'other' ? formData.relation_other.trim() : null
      };

      await api.post('/api/store/textbook-access/students', payload);
      
      toast.success('Student linked successfully!');
      closeDialog();
      loadData();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to submit';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{loadError}</p>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="linking-page">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                PCA Textbooks
              </CardTitle>
              <CardDescription>
                Link students to access exclusive school textbooks
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadData}
                data-testid="refresh-btn"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={openDialog} data-testid="link-student-btn">
                <Plus className="h-4 w-4 mr-2" />
                Link Student
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Students List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            My Students ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No students linked yet</p>
              <p className="text-sm mt-1">
                Click "Link Student" to add a student
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`student-card-${student.student_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.school_name || 'School'} • Grade {student.grade || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {renderStatusBadge(student.current_year_status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Student</DialogTitle>
            <DialogDescription>
              Enter the student's information to request textbook access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label htmlFor="studentName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="studentName"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Enter student's full name"
                data-testid="input-student-name"
              />
            </div>

            {/* School Selection */}
            <div className="space-y-2">
              <Label>
                School <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.school_id} 
                onValueChange={(val) => handleChange('school_id', val)}
              >
                <SelectTrigger data-testid="select-school">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem 
                      key={school.school_id} 
                      value={school.school_id}
                    >
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
                value={formData.student_number}
                onChange={(e) => handleChange('student_number', e.target.value)}
                placeholder="School ID or student number"
                data-testid="input-student-number"
              />
            </div>

            {/* Year and Grade Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* School Year */}
              <div className="space-y-2">
                <Label>
                  School Year <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={String(formData.year)} 
                  onValueChange={(val) => handleChange('year', parseInt(val))}
                >
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(new Date().getFullYear())}>
                      {new Date().getFullYear()}
                    </SelectItem>
                    <SelectItem value={String(new Date().getFullYear() + 1)}>
                      {new Date().getFullYear() + 1}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label>
                  Grade <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.grade} 
                  onValueChange={(val) => handleChange('grade', val)}
                >
                  <SelectTrigger data-testid="select-grade">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => (
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
              <Label>
                Relationship <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.relation_type} 
                onValueChange={(val) => handleChange('relation_type', val)}
              >
                <SelectTrigger data-testid="select-relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Other Relationship (Conditional) */}
            {formData.relation_type === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="relationOther">
                  Specify Relationship <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="relationOther"
                  value={formData.relation_other}
                  onChange={(e) => handleChange('relation_other', e.target.value)}
                  placeholder="e.g., Uncle, Family friend"
                  data-testid="input-relation-other"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              data-testid="submit-student-btn"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
