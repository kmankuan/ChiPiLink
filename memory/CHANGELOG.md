# ChipiLink - Changelog

## Enero 23, 2026 - Migración de Arquitectura

### Reestructuración Completa del Proyecto

#### Base de Datos - Colecciones Migradas:
| Antes | Después |
|-------|---------|
| `schools` | `store_schools` |
| `textbook_access_students` | `store_students` |
| `form_field_configs` | `store_form_configs` |
| `users_profiles` | `user_profiles` |

#### Colecciones Eliminadas:
- `usuarios` (deprecated, Spanish)
- `vinculaciones` (deprecated, Spanish)
- `store_orders` (empty)

#### Frontend - Reestructuración:
- `/modules/customers/` → `/modules/admin/users/`
- `/modules/users/` → `/modules/account/`
- Carpetas legacy eliminadas

#### Archivos Principales Creados:
- `/app/memory/ARCHITECTURE.md` - Guía de arquitectura completa
- `/modules/admin/users/UsersManagementModule.jsx`
- `/modules/account/pages/AccountDashboard.jsx`
- `/modules/admin/users/components/AllStudentsTab.jsx`
- `/modules/admin/users/components/SchoolsManagementTab.jsx`

---

## Enero 22, 2026 - Sistema de Formularios Dinámicos

### Funcionalidades Implementadas:
- Sistema de configuración dinámica de campos de formulario
- Admin puede agregar/editar/eliminar campos
- Soporte multilingüe (EN, ES, ZH) para labels
- Formulario multi-estudiante con auto-scroll

### Bugs Resueltos:
- Status de aprobación no se reflejaba en usuario
- Grade desaparecía al editar estudiante
- Campo School no aparecía en formulario

---

## Enero 21, 2026 - Flujo de Vinculación de Estudiantes

### Funcionalidades:
- Formulario para vincular estudiantes a escuelas
- Sistema de aprobación por admin
- Tabla de todos los estudiantes en admin

---

## Enero 20, 2026 - Sistema de Escuelas

### Funcionalidades:
- CRUD de escuelas desde admin
- Dropdown de escuelas en formulario de vinculación

---

*Para detalles técnicos completos, ver `/app/memory/ARCHITECTURE.md`*
