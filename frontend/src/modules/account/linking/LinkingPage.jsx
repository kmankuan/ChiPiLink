/**
 * Exclusive Purchase - Component for managing access to exclusive catalogs
 * Allows linking students to access school textbooks
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Lock,
  ShoppingBag,
  User,
  Users,
  BookOpen,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Exclusive programs available
const EXCLUSIVE_PROGRAMS = [
  {
    id: 'pca',
    name: 'PCA Textbooks',
    description: 'Access the exclusive textbook catalog of Panama Christian Academy',
    icon: GraduationCap,
    color: 'purple',
    requires_linking: true
  }
];

// Generate available years (current year and next)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [
    { value: String(currentYear), label: `${currentYear} (Current year)` },
    { value: String(currentYear + 1), label: String(currentYear + 1) }
  ];
};

// Generate grades
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

export default function LinkingPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [activeTab, setActiveTab] = useState('programs');
  
  // Form configuration from API
  const [formConfig, setFormConfig] = useState({ fields: [] });
  
  // Schools list
  const [schools, setSchools] = useState([]);
  
  // Form state for single edit
  const [formData, setFormData] = useState({
    full_name: '',
    school_id: '',
    student_number: '',
    year: String(new Date().getFullYear()),
    grade: '',
    relationship: '',
    relationship_other: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);
  
  // Multiple students state for new entries
  const [multipleStudents, setMultipleStudents] = useState([]);
  
  // Ref for scroll area to auto-scroll when adding new student
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch students from textbook-access, form config, and schools
      const [studentsRes, configRes, schoolsRes] = await Promise.all([
        fetch(`${API_URL}/api/store/textbook-access/my-students`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/store/form-config/textbook_access`),
        fetch(`${API_URL}/api/store/textbook-access/schools`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }
      
      if (configRes.ok) {
        const config = await configRes.json();
        setFormConfig(config);
      }
      
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        setSchools(schoolsData.schools || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a field is active in config
  const isFieldActive = (fieldKey) => {
    const field = formConfig.fields?.find(f => f.field_key === fieldKey);
    // Default to true for essential fields if config not loaded yet
    if (!field && ['school_id', 'student_name', 'grade', 'relationship'].includes(fieldKey)) {
      return true;
    }
    return field ? field.is_active !== false : false;
  };

  // Helper to check if a field is required
  const isFieldRequired = (fieldKey) => {
    const field = formConfig.fields?.find(f => f.field_key === fieldKey);
    return field ? field.is_required === true : false;
  };

  // Get relation options from config
  const getRelationOptions = () => {
    const field = formConfig.fields?.find(f => f.field_key === 'relationship');
    return field?.options || [
      { value: 'parent', label_es: 'Padre/Madre' },
      { value: 'guardian', label_es: 'Tutor Legal' },
      { value: 'grandparent', label_es: 'Abuelo/a' },
      { value: 'representative', label_es: 'Representante' },
      { value: 'other', label_es: 'Otro' }
    ];
  };

  // Create empty student object
  const createEmptyStudent = () => ({
    id: Date.now(),
    full_name: '',
    school_id: '',
    student_number: '',
    year: String(new Date().getFullYear()),
    grade: '',
    relationship: '',
    relationship_other: '',
    notes: ''
  });

  const handleOpenLink = async (program) => {
    setSelectedProgram(program);
    const currentYear = String(new Date().getFullYear());
    setFormData({
      full_name: '',
      school_id: '',
      student_number: '',
      year: currentYear,
      grade: '',
      relationship: '',
      relationship_other: '',
      notes: ''
    });
    setEditingId(null);
    // Initialize with one empty student for multi-add
    setMultipleStudents([createEmptyStudent()]);
    
    // Refresh form config and schools to get latest settings
    try {
      const [configRes, schoolsRes] = await Promise.all([
        fetch(`${API_URL}/api/store/form-config/textbook_access`),
        fetch(`${API_URL}/api/store/textbook-access/schools`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (configRes.ok) {
        const config = await configRes.json();
        setFormConfig(config);
      }
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        setSchools(schoolsData.schools || []);
      }
    } catch (error) {
      console.error('Error refreshing form config:', error);
    }
    
    setShowLinkDialog(true);
  };

  const handleEditStudent = (student) => {
    setFormData({
      full_name: student.full_name || student.nombre || '',
      school_id: student.school_id || '',
      student_number: student.student_number || '',
      year: student.year || String(new Date().getFullYear()),
      grade: student.grade || '',
      relationship: student.relation_type || student.relationship || '',
      relationship_other: student.relation_other || student.relationship_other || '',
      notes: student.notes || ''
    });
    setEditingId(student.student_id);
    setSelectedProgram(EXCLUSIVE_PROGRAMS[0]);
    setMultipleStudents([]);
    setShowLinkDialog(true);
  };

  // Functions for multiple students
  const addStudentRow = () => {
    const newStudent = createEmptyStudent();
    setMultipleStudents(prev => [...prev, newStudent]);
    // Auto-scroll to the new student after state update
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          // Find the new student card
          const newStudentCard = scrollContainer.querySelector(`[data-student-id="${newStudent.id}"]`);
          if (newStudentCard) {
            newStudentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            // Fallback: scroll to bottom
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      }
    }, 150);
  };

  const removeStudentRow = (id) => {
    if (multipleStudents.length > 1) {
      setMultipleStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateStudentRow = (id, field, value) => {
    setMultipleStudents(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmitLink = async () => {
    // If editing, use single form data
    if (editingId) {
      if (!formData.full_name.trim()) {
        toast.error('Please enter the student name');
        return;
      }
      if (isFieldActive('school_id') && isFieldRequired('school_id') && !formData.school_id) {
        toast.error('Please select a school');
        return;
      }
      if (!formData.relationship) {
        toast.error('Please select your relationship with the student');
        return;
      }
      if (formData.relationship === 'other' && !formData.relationship_other?.trim()) {
        toast.error('Please specify the relationship');
        return;
      }

      try {
        setSaving(true);
        
        // Map frontend field names to backend API format
        const payload = {
          full_name: formData.full_name.trim(),
          school_id: formData.school_id,
          student_number: isFieldActive('student_id_number') ? formData.student_number?.trim() : undefined,
          relation_type: formData.relationship === 'other' ? 'other' : formData.relationship,
          relation_other: formData.relationship === 'other' ? formData.relationship_other : undefined
        };

        const response = await fetch(`${API_URL}/api/store/textbook-access/students/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Student updated');
          setShowLinkDialog(false);
          fetchData();
        } else {
          toast.error(data.detail || 'Error processing request');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error processing request');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Creating multiple students
    const validStudents = multipleStudents.filter(s => s.full_name.trim());
    
    if (validStudents.length === 0) {
      toast.error('Please enter at least one student name');
      return;
    }

    // Validate all students
    for (let i = 0; i < validStudents.length; i++) {
      const s = validStudents[i];
      const num = i + 1;
      if (isFieldActive('school_id') && isFieldRequired('school_id') && !s.school_id) {
        toast.error(`Student ${num}: Please select a school`);
        return;
      }
      if (isFieldActive('student_id_number') && isFieldRequired('student_id_number') && !s.student_number?.trim()) {
        toast.error(`Student ${num}: Please enter the student number`);
        return;
      }
      if (!s.year) {
        toast.error(`Student ${num}: Please select the year`);
        return;
      }
      if (!s.grade) {
        toast.error(`Student ${num}: Please select the grade`);
        return;
      }
      if (!s.relationship) {
        toast.error(`Student ${num}: Please select the relationship`);
        return;
      }
      if (s.relationship === 'other' && !s.relationship_other?.trim()) {
        toast.error(`Student ${num}: Please specify the relationship`);
        return;
      }
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const student of validStudents) {
        try {
          // Map frontend field names to backend API format
          const payload = {
            full_name: student.full_name.trim(),
            school_id: student.school_id,
            student_number: isFieldActive('student_id_number') ? student.student_number?.trim() : undefined,
            relation_type: student.relationship === 'other' ? 'other' : student.relationship,
            relation_other: student.relationship === 'other' ? student.relationship_other : undefined,
            year: parseInt(student.year),
            grade: student.grade
          };

          const response = await fetch(`${API_URL}/api/store/textbook-access/students`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            console.error('Error creating student:', errorData);
            // Show specific error message for first error
            if (errorCount === 0 && errorData.detail) {
              toast.error(`Error: ${errorData.detail}`);
            }
            errorCount++;
          }
        } catch (err) {
          console.error('Exception creating student:', err);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} student${successCount > 1 ? 's' : ''} linked successfully`);
      }
      if (errorCount > 0 && successCount === 0) {
        // Only show generic error if we haven't shown a specific one
        if (errorCount > 1) {
          toast.error(`${errorCount} student${errorCount > 1 ? 's' : ''} could not be linked`);
        }
      }
      
      setShowLinkDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error processing requests');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this linked student?')) return;

    try {
      const response = await fetch(`${API_URL}/api/store/textbook-access/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Student deleted');
        fetchData();
      } else {
        toast.error('Error deleting student');
      }
    } catch (error) {
      toast.error('Error deleting student');
    }
  };

  const getStatusBadge = (student) => {
    const status = student.status || 'pending';
    
    switch (status) {
      case 'approved':
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Compra Exclusiva
        </h2>
        <p className="text-muted-foreground mt-1">
          Access exclusive catalogs and products by linking your information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs" className="gap-2">
            <Lock className="h-4 w-4" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            My Students
            {students.length > 0 && (
              <Badge variant="secondary" className="ml-1">{students.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {EXCLUSIVE_PROGRAMS.map((program) => {
              const Icon = program.icon;
              const hasAccess = students.some(e => 
                (e.status === 'approved' || e.status === 'verified' || e.estado === 'aprobado') && 
                (e.programa === program.id || !e.programa)
              );

              return (
                <Card 
                  key={program.id}
                  className={`transition-all hover:shadow-md ${
                    hasAccess 
                      ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' 
                      : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-${program.color}-100 dark:bg-${program.color}-900/30`}>
                        <Icon className={`h-6 w-6 text-${program.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{program.name}</h3>
                          {hasAccess && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active Access
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">
                          {program.description}
                        </p>
                        <div className="flex gap-2">
                          {hasAccess ? (
                            <Button 
                              onClick={() => {
                                // Navigate to textbooks tab in account dashboard
                                const tabsElement = document.querySelector('[data-testid="textbooks-tab"]');
                                if (tabsElement) {
                                  tabsElement.click();
                                } else {
                                  // Fallback: set URL hash and reload
                                  window.location.href = '/mi-cuenta?tab=textbooks';
                                }
                              }}
                              className="gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              Order Textbooks
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleOpenLink(program)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Link Student
                            </Button>
                          )}
                          {students.length > 0 && !hasAccess && (
                            <Button 
                              variant="outline"
                              onClick={() => setActiveTab('students')}
                            >
                              View Requests
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">How does it work?</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Select the program you want to access</li>
                    <li>Complete the linking form with the student information</li>
                    <li>An administrator will verify your request</li>
                    <li>Once approved, you will have access to the exclusive catalog</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          {students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No linked students</h3>
                <p className="text-muted-foreground mb-4">
                  Link a student to access exclusive catalogs
                </p>
                <Button onClick={() => handleOpenLink(EXCLUSIVE_PROGRAMS[0])}>
                  <Plus className="h-4 w-4 mr-2" />
                  Link First Student
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {students.length} linked student{students.length !== 1 ? 's' : ''}
                </p>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenLink(EXCLUSIVE_PROGRAMS[0])}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </div>

              <div className="grid gap-3">
                {students.map((student) => (
                  <Card key={student.sync_id || student.student_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{student.full_name || student.nombre}</h4>
                              {getStatusBadge(student)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>ID: {student.sync_id || student.student_number}</span>
                              {student.grade && (
                                <>
                                  <span>•</span>
                                  <span>{student.grade}</span>
                                </>
                              )}
                              {student.relation_type && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{student.relation_type}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStudent(student)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStudent(student.sync_id || student.student_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog to link student */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {editingId ? 'Edit Student' : 'Link Students'}
            </DialogTitle>
            <DialogDescription>
              {selectedProgram?.name || 'Exclusive Program'} - {editingId ? 'Edit student information' : 'You can add one or more students at once'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] pr-4" ref={scrollAreaRef}>
            {editingId ? (
              /* Single student edit form */
              <div className="space-y-4 py-4">
                {/* Guardian name (auto-filled) */}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Guardian</Label>
                  <p className="font-medium">{user?.nombre || user?.name || user?.email}</p>
                </div>

                {/* Student name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Student Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. John Smith"
                  />
                </div>

                {/* School - only if active */}
                {isFieldActive('school_id') && (
                  <div className="space-y-2">
                    <Label>
                      School {isFieldRequired('school_id') && <span className="text-destructive">*</span>}
                    </Label>
                    {schools.length > 0 ? (
                      <Select
                        value={formData.school_id}
                        onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                      >
                        <SelectTrigger>
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
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading schools...</p>
                    )}
                  </div>
                )}

                {/* Student number - only if active */}
                {isFieldActive('student_id_number') && (
                  <div className="space-y-2">
                    <Label htmlFor="student_number">
                      Student Number {isFieldRequired('student_id_number') && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="student_number"
                      value={formData.student_number}
                      onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                      placeholder="e.g. STU-2024-001"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can find this number on the student ID card or school documents
                    </p>
                  </div>
                )}

                {/* Year */}
                <div className="space-y-2">
                  <Label>School Year <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grade - dropdown */}
                <div className="space-y-2">
                  <Label>Grade <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Relationship with student */}
                <div className="space-y-2">
                  <Label>
                    Relationship with Student <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value, relationship_other: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRelationOptions().map((rel) => (
                        <SelectItem key={rel.value} value={rel.value}>
                          {rel.label_es || rel.label_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* "Other" field - only if selected "other" */}
                {formData.relationship === 'other' && (
                  <div className="space-y-2">
                    <Label>Specify relationship <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.relationship_other}
                      onChange={(e) => setFormData({ ...formData, relationship_other: e.target.value })}
                      placeholder="e.g. Uncle, Godparent, etc."
                    />
                  </div>
                )}

                {/* Additional notes - only if active */}
                {isFieldActive('notes') && (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional information if needed"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Multiple students form */
              <div className="space-y-4 py-4">
                {/* Guardian name (auto-filled) */}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Guardian</Label>
                  <p className="font-medium">{user?.nombre || user?.name || user?.email}</p>
                </div>

                {multipleStudents.map((student, index) => (
                  <Card key={student.id} data-student-id={student.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-purple-600" />
                          Student {index + 1}
                        </CardTitle>
                        {multipleStudents.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStudentRow(student.id)}
                            className="text-destructive hover:text-destructive h-8"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Row 1: Name */}
                      <div className="space-y-2">
                        <Label>Full Name <span className="text-destructive">*</span></Label>
                        <Input
                          value={student.full_name}
                          onChange={(e) => updateStudentRow(student.id, 'full_name', e.target.value)}
                          placeholder="e.g. John Smith"
                        />
                      </div>

                      {/* School - only if active */}
                      {isFieldActive('school_id') && (
                        <div className="space-y-2">
                          <Label>
                            School {isFieldRequired('school_id') && <span className="text-destructive">*</span>}
                          </Label>
                          {schools.length > 0 ? (
                            <Select
                              value={student.school_id}
                              onValueChange={(v) => updateStudentRow(student.id, 'school_id', v)}
                            >
                              <SelectTrigger>
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
                          ) : (
                            <p className="text-sm text-muted-foreground">Loading schools...</p>
                          )}
                        </div>
                      )}

                      {/* Student Number - only if active */}
                      {isFieldActive('student_id_number') && (
                        <div className="space-y-2">
                          <Label>
                            Student Number {isFieldRequired('student_id_number') && <span className="text-destructive">*</span>}
                          </Label>
                          <Input
                            value={student.student_number}
                            onChange={(e) => updateStudentRow(student.id, 'student_number', e.target.value)}
                            placeholder="e.g. STU-2024-001"
                          />
                        </div>
                      )}
                      
                      {/* Row 2: Year and Grade */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>School Year <span className="text-destructive">*</span></Label>
                          <Select
                            value={student.year}
                            onValueChange={(v) => updateStudentRow(student.id, 'year', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableYears().map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                  {year.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Grade <span className="text-destructive">*</span></Label>
                          <Select
                            value={student.grade}
                            onValueChange={(v) => updateStudentRow(student.id, 'grade', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADES.map((grade) => (
                                <SelectItem key={grade.value} value={grade.value}>
                                  {grade.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Relation */}
                      <div className="space-y-2">
                        <Label>Relationship <span className="text-destructive">*</span></Label>
                        <Select
                          value={student.relationship}
                          onValueChange={(v) => updateStudentRow(student.id, 'relationship', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {getRelationOptions().map((rel) => (
                              <SelectItem key={rel.value} value={rel.value}>
                                {rel.label_es || rel.label_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* "Other" field - only if selected "other" */}
                      {student.relationship === 'other' && (
                        <div className="space-y-2">
                          <Label>Specify relationship <span className="text-destructive">*</span></Label>
                          <Input
                            value={student.relationship_other}
                            onChange={(e) => updateStudentRow(student.id, 'relationship_other', e.target.value)}
                            placeholder="e.g. Uncle, Godparent, etc."
                          />
                        </div>
                      )}
                      
                      {/* Notes (optional) - only if active */}
                      {isFieldActive('notes') && (
                        <div className="space-y-2">
                          <Label>Additional Notes (optional)</Label>
                          <Input
                            value={student.notes}
                            onChange={(e) => updateStudentRow(student.id, 'notes', e.target.value)}
                            placeholder="Additional information if needed"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Add Another Button - Only show when creating new students */}
            {!editingId && (
              <Button
                variant="outline"
                onClick={addStudentRow}
                className="w-full sm:w-auto sm:mr-auto"
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Student
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={handleSubmitLink} disabled={saving} className="flex-1 sm:flex-none">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? 'Save Changes' : (multipleStudents.length > 1 ? 'Submit All' : 'Submit Request')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
