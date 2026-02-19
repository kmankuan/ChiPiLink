/**
 * Users Management Module - Admin Panel
 * 
 * REFACTORED: Removed legacy "matriculas" system
 * All student management now uses textbook-access system
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  GraduationCap,
  Link2,
  Settings2,
  School,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import AdminUsuariosConexiones from './components/AdminUsuariosConexiones';
import FormFieldsConfigTab from './components/FormFieldsConfigTab';
import SchoolsManagementTab from './components/SchoolsManagementTab';
import StudentRequestsTab from './components/StudentRequestsTab';
import AllStudentsTab from './components/AllStudentsTab';
import RegisteredUsersTab from './components/RegisteredUsersTab';
import { useTranslation } from 'react-i18next';

export default function UsersManagementModule() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('registered-users');

  const lang = i18n.language || 'en';
  const labels = {
    en: { users: 'Accounts', requests: 'Access Requests', students: 'All Students', connections: 'Connections', schools: 'Schools', formConfig: 'Form Config' },
    es: { users: 'Cuentas', requests: 'Solicitudes Vinculación', students: 'Todos los Estudiantes', connections: 'Conexiones', schools: 'Escuelas', formConfig: 'Config. Formularios' },
    zh: { users: '账户', requests: '访问请求', students: '所有学生', connections: '连接', schools: '学校', formConfig: '表单配置' },
  }[lang] || { users: 'Accounts', requests: 'Access Requests', students: 'All Students', connections: 'Connections', schools: 'Schools', formConfig: 'Form Config' };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="registered-users" className="gap-2">
            <Users className="h-4 w-4" />
            {labels.users}
          </TabsTrigger>
          <TabsTrigger value="student-requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            {labels.requests}
          </TabsTrigger>
          <TabsTrigger value="all-students" className="gap-2">
            <UserCheck className="h-4 w-4" />
            {labels.students}
          </TabsTrigger>
          <TabsTrigger value="conexiones" className="gap-2">
            <Link2 className="h-4 w-4" />
            {labels.connections}
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" />
            {labels.schools}
          </TabsTrigger>
          <TabsTrigger value="form-config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {labels.formConfig}
          </TabsTrigger>
        </TabsList>

        {/* Registered Users */}
        <TabsContent value="registered-users" className="space-y-4">
          <RegisteredUsersTab />
        </TabsContent>

        {/* Student Link Requests */}
        <TabsContent value="student-requests" className="space-y-4">
          <StudentRequestsTab token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* All Students Table */}
        <TabsContent value="all-students" className="space-y-4">
          <AllStudentsTab token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Sistema de Conexiones y Capacidades */}
        <TabsContent value="conexiones" className="space-y-4">
          <AdminUsuariosConexiones token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Schools Management Tab */}
        <TabsContent value="schools" className="space-y-4">
          <SchoolsManagementTab token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Form Configuration Tab */}
        <TabsContent value="form-config" className="space-y-4">
          <FormFieldsConfigTab token={localStorage.getItem('auth_token')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
