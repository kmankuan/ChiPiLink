/**
 * Hook para gestión de permisos del usuario
 * Carga permisos desde el backend y proporciona helpers para verificar acceso
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cache de permisos para evitar llamadas innecesarias
let permissionsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos (reducido para mejor UX)

// Función para limpiar el caché (exportada para uso externo)
export function clearPermissionsCache() {
  permissionsCache = null;
  cacheTimestamp = null;
}

export function usePermissions() {
  const { token, isAuthenticated, user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setPermissions([]);
      setRole(null);
      setLoading(false);
      return;
    }

    // Check cache
    if (permissionsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      setPermissions(permissionsCache.permissions || []);
      setRole(permissionsCache.role || null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/roles/my-permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar permisos');
      }

      const data = await response.json();
      
      // Update cache
      permissionsCache = data;
      cacheTimestamp = Date.now();
      
      setPermissions(data.permissions || []);
      setRole(data.role || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err.message);
      // Default to basic user permissions
      setPermissions([]);
      setRole({ role_id: 'user', nombre: 'Usuario' });
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Clear cache ONLY on explicit logout, not on initial mount
  useEffect(() => {
    // Listen for logout event to clear cache
    const handleLogout = () => {
      permissionsCache = null;
      cacheTimestamp = null;
      setPermissions([]);
      setRole(null);
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  /**
   * Verifica si el usuario tiene un permiso específico
   * Soporta wildcards: "*" (todos), "modulo.*" (todos del módulo)
   */
  const hasPermission = useCallback((requiredPermission) => {
    if (!requiredPermission) return true;
    
    // Super admin tiene todos los permisos
    if (permissions.includes('*')) return true;
    
    // Verificar permiso directo
    if (permissions.includes(requiredPermission)) return true;
    
    // Verificar wildcards de módulo (ej: "admin.*")
    const [module] = requiredPermission.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    
    return false;
  }, [permissions]);

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    return requiredPermissions.every(perm => hasPermission(perm));
  }, [hasPermission]);

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    return requiredPermissions.some(perm => hasPermission(perm));
  }, [hasPermission]);

  /**
   * Verifica si el usuario tiene un rol específico
   */
  const hasRole = useCallback((roleId) => {
    if (!role) return false;
    return role.role_id === roleId;
  }, [role]);

  /**
   * Verifica si el usuario es super admin
   */
  const isSuperAdmin = useMemo(() => {
    return role?.role_id === 'super_admin' || permissions.includes('*');
  }, [role, permissions]);

  /**
   * Verifica si el usuario es admin o superior
   */
  const isAdmin = useMemo(() => {
    return isSuperAdmin || role?.role_id === 'admin' || hasPermission('admin.access');
  }, [isSuperAdmin, role, hasPermission]);

  /**
   * Verifica si el usuario es moderador o superior
   */
  const isModerator = useMemo(() => {
    return isAdmin || role?.role_id === 'moderator';
  }, [isAdmin, role]);

  /**
   * Fuerza recarga de permisos desde el servidor
   */
  const refreshPermissions = useCallback(() => {
    permissionsCache = null;
    cacheTimestamp = null;
    return fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    role,
    loading,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isModerator,
    refreshPermissions
  };
}

/**
 * Componente para controlar visibilidad basada en permisos
 */
export function PermissionGate({ 
  permission, 
  permissions: requiredPermissions, 
  requireAll = true,
  fallback = null, 
  children 
}) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermissions();

  if (loading) return null;

  // Single permission check
  if (permission) {
    return hasPermission(permission) ? children : fallback;
  }

  // Multiple permissions check
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    return hasAccess ? children : fallback;
  }

  // No permission required
  return children;
}

export default usePermissions;
