/**
 * Users Management Module - Admin Panel
 * 
 * Manages user accounts and connections only.
 * Student-related workflows (enrollment, schools, forms) are in Unatienda.
 */
import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  Link2,
} from 'lucide-react';
import AdminUsuariosConexiones from './components/AdminUsuariosConexiones';
import RegisteredUsersTab from './components/RegisteredUsersTab';
import { useTranslation } from 'react-i18next';

export default function UsersManagementModule() {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('registered-users');

  const lang = i18n.language || 'en';
  const labels = {
    en: { users: 'Accounts', connections: 'Connections' },
    es: { users: 'Cuentas', connections: 'Conexiones' },
    zh: { users: '账户', connections: '连接' },
  }[lang] || { users: 'Accounts', connections: 'Connections' };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="registered-users" className="gap-2">
            <Users className="h-4 w-4" />
            {labels.users}
          </TabsTrigger>
          <TabsTrigger value="conexiones" className="gap-2">
            <Link2 className="h-4 w-4" />
            {labels.connections}
          </TabsTrigger>
        </TabsList>

        {/* Registered Users */}
        <TabsContent value="registered-users" className="space-y-4">
          <RegisteredUsersTab />
        </TabsContent>

        {/* Connections */}
        <TabsContent value="conexiones" className="space-y-4">
          <AdminUsuariosConexiones token={localStorage.getItem('auth_token')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
