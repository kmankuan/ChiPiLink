/**
 * StudentsSchoolsModule — Students, Schools, and School Year management
 * Extracted from UnatiendaModule into the School Textbooks sidebar group.
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, School, Calendar } from 'lucide-react';
import StudentsTab from '@/modules/unatienda/tabs/StudentsTab';
import SchoolsManagementTab from '@/modules/admin/users/components/SchoolsManagementTab';
import SchoolYearTab from '@/modules/unatienda/tabs/SchoolYearTab';

export default function StudentsSchoolsModule() {
  const token = localStorage.getItem('auth_token');
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-1.5 text-xs">
            <School className="h-3.5 w-3.5" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="school-year" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            School Year
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <StudentsTab token={token} />
        </TabsContent>
        <TabsContent value="schools" className="mt-4">
          <SchoolsManagementTab token={token} />
        </TabsContent>
        <TabsContent value="school-year" className="mt-4">
          <SchoolYearTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
