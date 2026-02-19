import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BoardHeader } from '@/components/shared/BoardHeader';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/shared/TablePagination';
import { toast } from 'sonner';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Loader2,
  Pencil,
  UserX,
  Mail,
  Phone,
  Calendar,
  Clock,
  GraduationCap,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatRelative(isoStr) {
  if (!isoStr) return '—';
  const now = new Date();
  const d = new Date(isoStr);
  const diffMs = now - d;
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay < 1) return 'Today';
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return formatDate(isoStr);
}

export default function RegisteredUsersTab({ token }) {
  const { i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, admins: 0, regular_users: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editDialog, setEditDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const lang = i18n.language || 'en';
  const t = {
    en: {
      title: 'Registered Users', subtitle: 'View and manage all app user accounts',
      total: 'Total Users', admins: 'Admins', regular: 'Regular', active: 'Active',
      all: 'All', adminsOnly: 'Admins Only', regularOnly: 'Regular Only',
      name: 'Name', email: 'Email', role: 'Role', status: 'Status',
      lastLogin: 'Last Login', created: 'Created', students: 'Students', actions: 'Actions',
      admin: 'Admin', user: 'User', activeBadge: 'Active', inactive: 'Inactive',
      edit: 'Edit', editUser: 'Edit User', save: 'Save', cancel: 'Cancel',
      isAdmin: 'Administrator', isActive: 'Active Account', phone: 'Phone',
      noUsers: 'No users found', searchPlaceholder: 'Search by name or email...',
      updated: 'User updated', never: 'Never',
    },
    es: {
      title: 'Usuarios Registrados', subtitle: 'Ver y gestionar todas las cuentas de usuario',
      total: 'Total Usuarios', admins: 'Admins', regular: 'Regulares', active: 'Activos',
      all: 'Todos', adminsOnly: 'Solo Admins', regularOnly: 'Solo Regulares',
      name: 'Nombre', email: 'Correo', role: 'Rol', status: 'Estado',
      lastLogin: 'Último Acceso', created: 'Creado', students: 'Estudiantes', actions: 'Acciones',
      admin: 'Admin', user: 'Usuario', activeBadge: 'Activo', inactive: 'Inactivo',
      edit: 'Editar', editUser: 'Editar Usuario', save: 'Guardar', cancel: 'Cancelar',
      isAdmin: 'Administrador', isActive: 'Cuenta Activa', phone: 'Teléfono',
      noUsers: 'No se encontraron usuarios', searchPlaceholder: 'Buscar por nombre o correo...',
      updated: 'Usuario actualizado', never: 'Nunca',
    },
    zh: {
      title: '注册用户', subtitle: '查看和管理所有用户账户',
      total: '总用户', admins: '管理员', regular: '普通用户', active: '活跃',
      all: '全部', adminsOnly: '仅管理员', regularOnly: '仅普通用户',
      name: '姓名', email: '邮箱', role: '角色', status: '状态',
      lastLogin: '最后登录', created: '创建时间', students: '学生', actions: '操作',
      admin: '管理员', user: '用户', activeBadge: '活跃', inactive: '未活跃',
      edit: '编辑', editUser: '编辑用户', save: '保存', cancel: '取消',
      isAdmin: '管理员', isActive: '活跃账户', phone: '电话',
      noUsers: '未找到用户', searchPlaceholder: '按名称或邮箱搜索...',
      updated: '用户已更新', never: '从未',
    },
  }[lang] || {};

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API}/api/auth-v2/users?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/auth-v2/users/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useRealtimeEvent('user_registered', useCallback(() => fetchUsers(), [fetchUsers]));

  // Filter and search
  const filtered = users.filter(u => {
    if (filterRole === 'admin' && !u.is_admin) return false;
    if (filterRole === 'regular' && u.is_admin) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    }
    return true;
  });

  const { paginatedItems, currentPage, totalPages, setCurrentPage } = usePagination(filtered, 15);
  const activeCount = users.filter(u => u.is_active !== false).length;

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/auth-v2/users/${editDialog.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editDialog.name,
          phone: editDialog.phone,
          is_admin: editDialog.is_admin,
          is_active: editDialog.is_active,
        }),
      });
      if (res.ok) {
        toast.success(t.updated);
        setEditDialog(null);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="registered-users-tab">
      <BoardHeader
        title={t.title}
        icon={Users}
        subtitle={t.subtitle}
        tabs={[
          { value: 'all', label: t.all },
          { value: 'admin', label: t.adminsOnly, icon: Shield },
          { value: 'regular', label: t.regularOnly },
        ]}
        activeTab={filterRole}
        onTabChange={setFilterRole}
        stats={[
          { label: t.total, value: stats.total_users, color: 'default' },
          { label: t.admins, value: stats.admins, color: 'blue', highlight: stats.admins > 0 },
          { label: t.regular, value: stats.regular_users, color: 'default' },
          { label: t.active, value: activeCount, color: 'green' },
        ]}
        loading={loading}
        onRefresh={fetchUsers}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-9 h-9"
          data-testid="users-search"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground">{t.noUsers}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.email}</TableHead>
                  <TableHead className="text-center">{t.role}</TableHead>
                  <TableHead className="text-center">{t.status}</TableHead>
                  <TableHead className="text-center">{t.students}</TableHead>
                  <TableHead>{t.lastLogin}</TableHead>
                  <TableHead>{t.created}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((u) => (
                  <TableRow key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                    <TableCell className="font-medium">{u.name || '—'}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{u.email}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={u.is_admin ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {u.is_admin ? (
                          <><Shield className="h-3 w-3 mr-1" />{t.admin}</>
                        ) : (
                          t.user
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${u.is_active !== false
                          ? 'border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-950/20'
                          : 'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/20'
                        }`}
                      >
                        {u.is_active !== false ? t.activeBadge : t.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(u.students || []).length > 0 ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {u.students.length}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" title={u.last_login || ''}>
                        {u.last_login ? formatRelative(u.last_login) : t.never}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditDialog({ ...u })}
                        data-testid={`edit-user-${u.user_id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={15}
          />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md" data-testid="edit-user-dialog">
          <DialogHeader>
            <DialogTitle>{t.editUser}</DialogTitle>
            <DialogDescription>{editDialog?.email}</DialogDescription>
          </DialogHeader>

          {editDialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t.name}</Label>
                <Input
                  value={editDialog.name || ''}
                  onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })}
                  data-testid="edit-user-name"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={editDialog.phone || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, phone: e.target.value })}
                    className="pl-9"
                    data-testid="edit-user-phone"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="is-admin-switch">{t.isAdmin}</Label>
                </div>
                <Switch
                  id="is-admin-switch"
                  checked={editDialog.is_admin}
                  onCheckedChange={(v) => setEditDialog({ ...editDialog, is_admin: v })}
                  data-testid="edit-user-admin-toggle"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="is-active-switch">{t.isActive}</Label>
                </div>
                <Switch
                  id="is-active-switch"
                  checked={editDialog.is_active !== false}
                  onCheckedChange={(v) => setEditDialog({ ...editDialog, is_active: v })}
                  data-testid="edit-user-active-toggle"
                />
              </div>

              {/* Read-only info */}
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {editDialog.email}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {t.created}: {formatDate(editDialog.created_at)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {t.lastLogin}: {editDialog.last_login ? formatRelative(editDialog.last_login) : t.never}
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {t.students}: {(editDialog.students || []).length}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)} data-testid="edit-user-cancel">
              {t.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} data-testid="edit-user-save">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
