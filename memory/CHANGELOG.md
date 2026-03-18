# ChipiLink - Changelog

## Enero 24, 2026 - Sistema de Pedidos de Textos

### Nueva Funcionalidad: Textbook Orders

#### Backend (21 tests pasados):
- **Nuevo módulo**: `/modules/store/routes/textbook_orders.py`
- **Servicio**: `textbook_order_service.py` - Lógica de negocio
- **Repositorio**: `textbook_order_repository.py` - Acceso a datos
- **Nueva colección**: `store_textbook_orders`

#### Endpoints Usuario:
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/store/textbook-orders/student/{id}` | Obtener/crear pedido para estudiante |
| `PUT /api/store/textbook-orders/{id}/items/{book}?quantity=N` | Seleccionar/deseleccionar libro |
| `POST /api/store/textbook-orders/{id}/submit` | Enviar pedido → Monday.com |
| `POST /api/store/textbook-orders/{id}/reorder/{book}` | Solicitar recompra |
| `GET /api/store/textbook-orders/my-orders` | Historial de pedidos |

#### Endpoints Admin:
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/store/textbook-orders/admin/all` | Todos los pedidos |
| `GET /api/store/textbook-orders/admin/stats` | Estadísticas |
| `PUT /api/store/textbook-orders/admin/{id}/status?status=X` | Cambiar estado |
| `GET /api/store/textbook-orders/admin/pending-reorders` | Solicitudes de recompra |
| `PUT /api/store/textbook-orders/admin/{id}/items/{book}/approve-reorder` | Aprobar recompra |

#### Frontend Usuario:
- **Nueva pestaña "Textos"** en Mi Cuenta (`/modules/account/orders/TextbookOrderPage.jsx`)
- Lista de libros por grado con checkboxes
- Cálculo de total en tiempo real
- Historial de pedidos
- Botón solicitar recompra

#### Frontend Admin:
- **Nueva pestaña "Pedidos Txt"** en Unatienda (`/modules/admin/store/TextbookOrdersAdminTab.jsx`)
- Tabla de pedidos con filtros
- Dashboard de estadísticas
- Gestión de solicitudes de recompra
- Cambio de estado de pedidos

#### Flujo Completo:
1. Usuario con estudiante aprobado ve lista de libros de su grado
2. Selecciona libros (checkbox) → total se actualiza en tiempo real
3. Envía pedido → se bloquean items + envía a Monday.com
4. Admin ve pedido en dashboard y actualiza estado
5. Si usuario necesita recompra → solicita → admin aprueba → puede ordenar de nuevo

### Bugs Corregidos:
- Status "approved" no se detectaba en frontend (buscaba "verified")

---

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
