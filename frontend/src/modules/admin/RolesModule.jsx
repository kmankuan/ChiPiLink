import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Shield, ShieldCheck, Crown, User, Plus, Edit2, Trash2, Search,
  Loader2, Save, Users, Key, ChevronRight, AlertTriangle, RefreshCw,
  History, UserPlus, UserMinus, FileEdit, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

const ROLE_ICONS = {
  'Crown': Crown,
  'ShieldCheck': ShieldCheck,
  'Shield': Shield,
  'User': User,
};

// Action type labels and colors
const ACTION_LABELS = {
  'role_created': { label: 'Rol Creado', icon: Plus, color: 'bg-green-100 text-green-700' },
  'role_updated': { label: 'Rol Actualizado', icon: FileEdit, color: 'bg-blue-100 text-blue-700' },
  'role_deleted': { label: 'Rol Eliminado', icon: Trash2, color: 'bg-red-100 text-red-700' },
  'role_assigned': { label: 'Rol Asignado', icon: UserPlus, color: 'bg-purple-100 text-purple-700' },
  'role_removed': { label: 'Rol Removido', icon: UserMinus, color: 'bg-orange-100 text-orange-700' },
  'permission_added': { label: 'Permiso Agregado', icon: Key, color: 'bg-cyan-100 text-cyan-700' },
  'permission_removed': { label: 'Permiso Removido', icon: Key, color: 'bg-amber-100 text-amber-700' },
  'permissions_updated': { label: 'Permisos Actualizados', icon: Shield, color: 'bg-indigo-100 text-indigo-700' },
};

export default function RolesModule() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Users tab
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Audit log tab
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#6366f1',
    nivel: 20,
    permisos: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        fetch(`${API}/api/roles`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/roles/available-permissions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();
      
      setRoles(rolesData.roles || []);
      setAvailablePermissions(permissionsData.permissions || {});
      
      if (rolesData.roles?.length > 0) {
        setSelectedRole(rolesData.roles[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t("roles.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API}/api/users-v2/all?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/roles/audit/logs?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/roles/audit/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();
      
      setAuditLogs(logsData.logs || []);
      setAuditStats(statsData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t("roles.auditLoadError"));
    } finally {
      setLoadingAudit(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleOpenRoleForm = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        nombre: role.nombre,
        descripcion: role.description || '',
        color: role.color || '#6366f1',
        nivel: role.nivel || 20,
        permisos: role.permisos || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#6366f1',
        nivel: 20,
        permisos: []
      });
    }
    setShowRoleForm(true);
  };

  const handleSaveRole = async () => {
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setSaving(true);
    try {
      const url = editingRole 
        ? `${API}/api/roles/${editingRole.role_id}`
        : `${API}/api/roles`;
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success || response.ok) {
        toast.success(editingRole ? t("roles.roleUpdated") : t("roles.roleCreated"));
        setShowRoleForm(false);
        fetchData();
      } else {
        toast.error(data.detail || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar rol');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('¿Eliminar este rol? Los usuarios con este rol serán cambiados a Usuario.')) return;
    
    try {
      const response = await fetch(`${API}/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success(t("roles.roleDeleted"));
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'No se puede eliminar este rol');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserForRole || !selectedRole) return;
    
    try {
      const response = await fetch(`${API}/api/roles/assign?user_id=${selectedUserForRole.user_id}&role_id=${selectedRole.role_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t("roles.roleAssigned"));
        setShowAssignDialog(false);
        setSelectedUserForRole(null);
        fetchUsers();
      } else {
        toast.error(data.detail || 'Error al asignar rol');
      }
    } catch (error) {
      toast.error('Error al asignar rol');
    }
  };

  const togglePermission = (permission) => {
    const current = formData.permisos;
    if (current.includes(permission)) {
      setFormData({ ...formData, permisos: current.filter(p => p !== permission) });
    } else {
      setFormData({ ...formData, permisos: [...current, permission] });
    }
  };

  const toggleModulePermissions = (module) => {
    const modulePerms = Object.keys(availablePermissions[module] || {}).map(p => `${module}.${p}`);
    const allSelected = modulePerms.every(p => formData.permisos.includes(p));
    
    if (allSelected) {
      setFormData({ ...formData, permisos: formData.permisos.filter(p => !modulePerms.includes(p)) });
    } else {
      setFormData({ ...formData, permisos: [...new Set([...formData.permisos, ...modulePerms])] });
    }
  };

  // Helper function for role icon
  const getRoleIcon = (iconName, className) => {
    const Icon = ROLE_ICONS[iconName] || Shield;
    return <Icon className={className} />;
  };

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

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
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>{t('roles.title')}</CardTitle>
                <CardDescription>
                  {t('roles.titleDesc')}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenRoleForm()} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('roles.newRole')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="roles" onValueChange={(v) => {
        if (v === 'users') fetchUsers();
        if (v === 'audit') fetchAuditLogs();
      }}>
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('roles.rolesTab')}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {t('roles.usersTab')}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            {t('roles.auditTab')}
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t('roles.systemRoles')}
              </h3>
              {roles.map((role) => (
                <Card 
                  key={role.role_id}
                  className={`cursor-pointer transition-all ${
                    selectedRole?.role_id === role.role_id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${role.color}20` }}
                        >
                          {getRoleIcon(role.icono, "h-5 w-5")}
                        </div>
                        <div>
                          <h4 className="font-semibold">{role.nombre}</h4>
                          <p className="text-xs text-muted-foreground">
                            Level {role.nivel} • {role.users_count || role.usuarios_count} users
                          </p>
                        </div>
                      </div>
                      {!role.es_sistema && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenRoleForm(role); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.role_id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      {role.es_sistema && (
                        <Badge variant="secondary" className="text-xs">{t('common.system')}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Role Details */}
            <div className="md:col-span-2">
              {selectedRole ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: `${selectedRole.color}20` }}
                        >
                          {getRoleIcon(selectedRole.icono, "h-6 w-6")}
                        </div>
                        <div>
                          <CardTitle>{selectedRole.nombre}</CardTitle>
                          <CardDescription>{selectedRole.description}</CardDescription>
                        </div>
                      </div>
                      {selectedRole.es_sistema && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenRoleForm(selectedRole)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Permissions
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Level: <strong>{selectedRole.nivel}</strong></span>
                        <span>Users: <strong>{selectedRole.users_count || selectedRole.usuarios_count}</strong></span>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Permissions ({selectedRole.permisos?.length || 0})
                        </h4>
                        
                        {selectedRole.permisos?.includes('*') ? (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Full Access - All system permissions
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                              {Object.entries(availablePermissions).map(([module, perms]) => {
                                const modulePerms = Object.keys(perms).map(p => `${module}.${p}`);
                                const hasAny = modulePerms.some(p => 
                                  selectedRole.permisos?.includes(p) || 
                                  selectedRole.permisos?.includes(`${module}.*`)
                                );
                                
                                if (!hasAny) return null;
                                
                                return (
                                  <div key={module} className="p-3 bg-muted/50 rounded-lg">
                                    <h5 className="font-medium capitalize mb-2">{module}</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedRole.permisos?.includes(`${module}.*`) ? (
                                        <Badge variant="default">{t('roles.allPermissions')}</Badge>
                                      ) : (
                                        modulePerms.filter(p => selectedRole.permisos?.includes(p)).map(p => (
                                          <Badge key={p} variant="secondary" className="text-xs">
                                            {p.split('.')[1]}
                                          </Badge>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('roles.selectRoleDetails')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.searchUsers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers} disabled={loadingUsers}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredUsers.map((user) => {
                const userRole = roles.find(r => r.role_id === user.role_id) || roles.find(r => r.role_id === 'user');
                
                return (
                  <Card key={user.usuario_id || user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name || 'Sin nombre'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {userRole && (
                            <Badge 
                              style={{ 
                                backgroundColor: `${userRole.color}20`,
                                color: userRole.color,
                                borderColor: userRole.color
                              }}
                              variant="outline"
                            >
                              {getRoleIcon(userRole.icono, "h-3 w-3 mr-1")}
                              {userRole.nombre}
                            </Badge>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedUserForRole(user);
                              setShowAssignDialog(true);
                            }}
                          >
                            Cambiar Rol
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          {loadingAudit ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {auditStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{auditStats.total_logs || 0}</div>
                      <p className="text-sm text-muted-foreground">{t('roles.totalRecords')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{auditStats.recent_24h || 0}</div>
                      <p className="text-sm text-muted-foreground">{t('roles.last24h')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{auditStats.by_action?.role_assigned || 0}</div>
                      <p className="text-sm text-muted-foreground">{t('roles.rolesAssigned')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{auditStats.by_action?.permissions_updated || 0}</div>
                      <p className="text-sm text-muted-foreground">{t('roles.permissionsUpdated')}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Actions Bar */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('roles.filterByActorTarget')}
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={fetchAuditLogs} disabled={loadingAudit}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingAudit ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </Button>
              </div>

              {/* Audit Logs List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('roles.changeHistory')}
                  </CardTitle>
                  <CardDescription>
                    {t('roles.changeHistoryDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {auditLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>{t('roles.noAuditRecords')}</p>
                        </div>
                      ) : (
                        auditLogs
                          .filter(log => {
                            if (!auditFilter) return true;
                            const term = auditFilter.toLowerCase();
                            return (
                              log.actor_nombre?.toLowerCase().includes(term) ||
                              log.actor_email?.toLowerCase().includes(term) ||
                              log.target_nombre?.toLowerCase().includes(term) ||
                              log.target_id?.toLowerCase().includes(term)
                            );
                          })
                          .map((log) => {
                            const actionConfig = ACTION_LABELS[log.action] || {
                              label: log.action,
                              icon: Shield,
                              color: 'bg-gray-100 text-gray-700'
                            };
                            const ActionIcon = actionConfig.icon;

                            return (
                              <div
                                key={log.log_id}
                                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className={`p-2 rounded-lg ${actionConfig.color}`}>
                                  <ActionIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className={actionConfig.color}>
                                      {actionConfig.label}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDate(log.timestamp)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm">
                                    <strong>{log.actor_nombre || log.actor_email || 'Sistema'}</strong>
                                    {' '}
                                    {log.target_type === 'user' ? (
                                      <>modificó el rol de <strong>{log.target_nombre || log.target_id}</strong></>
                                    ) : (
                                      <>modificó el rol <strong>{log.target_nombre || log.target_id}</strong></>
                                    )}
                                  </p>
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                      {log.details.rol_anterior && (
                                        <p>Rol anterior: {log.details.rol_anterior}</p>
                                      )}
                                      {log.details.rol_nuevo && (
                                        <p>Rol nuevo: {log.details.rol_nuevo}</p>
                                      )}
                                      {log.details.permisos_agregados?.length > 0 && (
                                        <p className="text-green-600">
                                          + Agregados: {log.details.permisos_agregados.slice(0, 3).join(', ')}
                                          {log.details.permisos_agregados.length > 3 && ` (+${log.details.permisos_agregados.length - 3} más)`}
                                        </p>
                                      )}
                                      {log.details.permisos_removidos?.length > 0 && (
                                        <p className="text-red-600">
                                          - Removidos: {log.details.permisos_removidos.slice(0, 3).join(', ')}
                                          {log.details.permisos_removidos.length > 3 && ` (+${log.details.permisos_removidos.length - 3} más)`}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Form Dialog */}
      <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              {editingRole?.es_sistema 
                ? 'Solo puedes modificar los permisos de roles de sistema'
                : 'Configura el nombre, nivel y permisos del rol'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            {!editingRole?.es_sistema && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre del Rol</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder=t("roles.roleNamePlaceholder")
                  />
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder=t("roles.roleDescPlaceholder")
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Nivel Jerárquico</Label>
                  <Input
                    type="number"
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={99}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mayor nivel = más privilegios (1-99)
                  </p>
                </div>
              </div>
            )}

            {/* Permissions */}
            <div>
              <Label className="text-base font-semibold">Permisos</Label>
              <ScrollArea className="h-[300px] mt-3 border rounded-lg p-4">
                <div className="space-y-4">
                  {Object.entries(availablePermissions).map(([module, perms]) => (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium capitalize flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          {module}
                        </h5>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => toggleModulePermissions(module)}
                        >
                          Todos
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        {Object.entries(perms).map(([perm, desc]) => {
                          const fullPerm = `${module}.${perm}`;
                          const isChecked = formData.permisos.includes(fullPerm) || 
                                          formData.permisos.includes(`${module}.*`) ||
                                          formData.permisos.includes('*');
                          
                          return (
                            <label 
                              key={fullPerm}
                              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(fullPerm)}
                                disabled={formData.permisos.includes('*')}
                              />
                              <div>
                                <span className="font-medium">{perm}</span>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Rol</DialogTitle>
            <DialogDescription>
              Selecciona el rol para {selectedUserForRole?.nombre || selectedUserForRole?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {roles.map((role) => (
              <Card 
                key={role.role_id}
                className={`cursor-pointer transition-all ${
                  selectedRole?.role_id === role.role_id 
                    ? 'ring-2 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${role.color}20` }}
                    >
                      {getRoleIcon(role.icono, "h-5 w-5")}
                    </div>
                    <div>
                      <h4 className="font-semibold">{role.nombre}</h4>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedRole?.role_id === 'super_admin' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                El rol Super Admin otorga acceso total al sistema
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignRole}>
              Asignar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
