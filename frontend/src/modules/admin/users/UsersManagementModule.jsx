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

export default function UsersManagementModule() {
  const [activeTab, setActiveTab] = useState('student-requests');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="student-requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Solicitudes Vinculación
          </TabsTrigger>
          <TabsTrigger value="all-students" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Todos los Estudiantes
          </TabsTrigger>
          <TabsTrigger value="conexiones" className="gap-2">
            <Link2 className="h-4 w-4" />
            Conexiones
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" />
            Escuelas
          </TabsTrigger>
          <TabsTrigger value="form-config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Config. Formularios
          </TabsTrigger>
        </TabsList>

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

        {/* Wallet Management Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <AdminWalletTab token={localStorage.getItem('auth_token')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
