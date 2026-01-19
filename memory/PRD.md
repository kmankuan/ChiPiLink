# ChiPi Link - Product Requirements Document

## Original Problem Statement
Sistema multi-módulo "Super App" con enfoque principal en el módulo **PinpanClub** para gestión de clubes de ping pong, incluyendo el sistema de ranking **Super Pin** y el nuevo sistema de partidos espontáneos **Rapid Pin**.

También incluye un sistema unificado de gestión de usuarios basado en "Capacidades" (Capacities), "Membresías" (Subscriptions), y "Conexiones" (Relationships), con wallet de usuario y sistema de notificaciones push.

## Latest Update (Enero 19, 2026)

### 🆕 Sistema Global de Breadcrumbs ✅ COMPLETADO

Se implementó un sistema global de navegación con breadcrumbs en todas las páginas de la aplicación.

#### Características del Header Global
- **Botón de Regresar**: Visible en todas las páginas excepto la home, navega a la página anterior
- **Logo ChiPi Link**: Siempre visible, lleva al inicio al hacer clic
- **Breadcrumb**: Muestra la ubicación actual con ícono representativo
- **Dropdown de Navegación**: Acceso rápido a páginas principales

#### Rutas con Header
- **Públicas**: `/`, `/unatienda`, `/pinpanclub`, `/login`, `/registro`, `/comunidad`, `/eventos`, `/galeria`, `/rapidpin`
- **Protegidas**: `/mi-cuenta`, `/pedidos`, `/mis-pedidos-libros`, `/orden`, `/recibo/*`, `/catalogo`
- **Admin**: `/admin`, `/admin/notifications`, `/admin/posts`, `/admin/memberships`, `/admin/book-orders`, `/admin/chat`

#### Rutas SIN Header (por diseño)
- TV: `/tv`, `/tv/pinpanclub`, `/canvas`, `/tv/canvas`
- Embed: `/embed/orden`
- Auth Callback: `/auth/callback`

#### Archivos Modificados
- `/app/frontend/src/App.js` - Router con Header en todas las rutas relevantes
- `/app/frontend/src/components/layout/Header.jsx` - Componente Header con ROUTE_CONFIG

#### Test Results
- **Frontend:** 19/19 tests passed (100%)

---

## Previous Update (Enero 14, 2026)

### 🆕 Sistema RBAC (Role-Based Access Control) ✅ NUEVO

Se implementó un sistema completo de roles y permisos para controlar el acceso a funcionalidades del sistema.

#### Roles del Sistema
| Rol | Nivel | Descripción | Permisos |
|-----|-------|-------------|----------|
| super_admin | 100 | Control total del sistema | `*` (todos) |
| admin | 80 | Gestión completa de la plataforma | `admin.*`, `users.*`, `unatienda.*`, `pinpanclub.*`, etc. |
| moderator | 50 | Gestión de contenido y usuarios básicos | `admin.access`, `users.view`, `tickets.*`, etc. |
| user | 10 | Acceso básico a funcionalidades públicas | `unatienda.access`, `pinpanclub.access`, etc. |

#### Módulos de Permisos
- **admin**: access, dashboard, site_config, landing_editor
- **users**: view, create, edit, delete, assign_roles, manage_memberships
- **roles**: view, create, edit, delete, assign_permissions
- **unatienda**: access, view_public_catalog, view_private_catalog, manage_products, manage_orders, etc.
- **pinpanclub**: access, view_rankings, create_match, create_league, admin_panel, etc.
- **memberships**: view, create_plans, manage_subscriptions
- **integrations**: access, monday, google_sheets, yappy, notifications
- **tickets**: access, view, respond, manage

#### Archivos Nuevos
**Backend:**
- `/app/backend/modules/roles/models.py` - Modelos y permisos disponibles
- `/app/backend/modules/roles/routes.py` - Endpoints API
- `/app/backend/modules/roles/service.py` - Lógica de negocio
- `/app/backend/core/auth.py` - Funciones `require_permission()`, `require_role()`

**Frontend:**
- `/app/frontend/src/hooks/usePermissions.js` - Hook para verificar permisos
- `/app/frontend/src/modules/admin/RolesModule.jsx` - UI de gestión de roles

#### Endpoints API
- `GET /api/roles` - Listar todos los roles (admin)
- `GET /api/roles/my-permissions` - Obtener permisos del usuario actual
- `GET /api/roles/available-permissions` - Listar permisos disponibles
- `POST /api/roles/assign` - Asignar rol a usuario
- `GET /api/roles/check/{permission}` - Verificar si usuario tiene permiso
- `PUT /api/roles/{role_id}` - Actualizar rol
- `POST /api/roles` - Crear rol personalizado

#### Características Implementadas
- ✅ Sidebar del admin filtra items según permisos del usuario
- ✅ Menú de usuario oculta "Admin" para usuarios sin permisos
- ✅ "Mis Libros Escolares" solo visible para usuarios con estudiantes vinculados
- ✅ Badge de rol actual visible en header del admin
- ✅ UI completa para gestionar roles y asignar permisos
- ✅ Soporte para wildcards (`*`, `modulo.*`)
- ✅ Cache de permisos en frontend (5 minutos)

#### Test Results
- **Backend:** 13/13 tests passed (100%)
- **Frontend:** 100% UI permission checks working

### 📋 Log de Auditoría ✅ NUEVO

Se implementó un sistema completo de log de auditoría para rastrear todas las acciones relacionadas con roles y permisos.

#### Acciones Auditadas
- `role_created` - Creación de nuevo rol
- `role_updated` - Actualización de rol
- `role_deleted` - Eliminación de rol
- `role_assigned` - Asignación de rol a usuario
- `role_removed` - Remoción de rol de usuario
- `permission_added` - Agregado de permiso
- `permission_removed` - Remoción de permiso
- `permissions_updated` - Actualización de permisos

#### Información Registrada
- ID del actor (quién realizó la acción)
- Email y nombre del actor
- Tipo de target (role/user)
- ID y nombre del target
- Detalles específicos (rol anterior, rol nuevo, permisos agregados/removidos)
- IP del cliente
- User-Agent
- Timestamp ISO

#### Endpoints API de Auditoría
- `GET /api/roles/audit/logs` - Obtener logs con filtros
- `GET /api/roles/audit/stats` - Obtener estadísticas (total, últimas 24h, por tipo)
- `GET /api/roles/audit/user/{cliente_id}` - Logs de un usuario específico

#### UI de Auditoría
- Pestaña "Auditoría" en el módulo de Roles y Permisos
- Cards con estadísticas en tiempo real
- Filtro de búsqueda por actor/destino
- Lista cronológica de cambios con detalles expandidos
- Badges de color por tipo de acción

---

### 🆕 Interfaz de Compra Exclusiva ✅ NUEVO

Se implementó un nuevo flujo para que los usuarios accedan a catálogos exclusivos desde Mi Cuenta.

#### Ubicación
- Nueva pestaña "Compra Exclusiva" en `/mi-cuenta`
- Archivo: `/app/frontend/src/modules/users/components/CompraExclusiva.jsx`

#### Funcionalidad
- Lista de programas exclusivos disponibles (actualmente: "Textos de PCA")
- Formulario de vinculación de estudiantes con:
  - Nombre del acudiente (auto-rellenado)
  - Nombre completo del estudiante
  - Número de estudiante
  - Grado (opcional)
  - Relación con el estudiante (padre, madre, acudiente, estudiante mismo, etc.)
  - Notas adicionales
- Gestión de múltiples estudiantes vinculados
- Estados de solicitud: Pendiente, Verificado, Rechazado
- Posibilidad de editar y eliminar estudiantes vinculados

---

### 🆕 Tienda Unatienda Unificada ✅ NUEVO

Se rediseñó la página de Unatienda para presentar una tienda unificada sin revelar conceptos de catálogo público/privado.

#### Cambios
- Eliminados tabs "Catálogo General" y "Libros PCA"
- Categorías mostradas como botones: Snacks, Bebidas, Comida Preparada, etc.
- Para usuarios con estudiantes vinculados: aparece botón "Textos Escolares" como una categoría más
- Al acceder a "Textos Escolares", se muestra header especial con filtros por grado y materia
- Botón "Ver tienda general" para regresar al catálogo público

---

### 🆕 Renombrado "Clientes" a "Usuarios" ✅ NUEVO

- Sidebar del admin: "Clientes" → "Usuarios"
- Descripción actualizada: "Gestiona usuarios, sus solicitudes de acceso exclusivo y vinculaciones"

---

### 🆕 Unificación del Módulo Unatienda ✅

Se completó la unificación del sistema de tienda en un único módulo llamado **Unatienda**.

#### Estructura del Módulo Unatienda (Admin)
```
Admin → Unatienda
├── 📊 Dashboard (estadísticas generales)
├── 🏪 Catálogo Público (ecommerce general - todos los usuarios)
│   ├── Productos
│   ├── Categorías  
│   └── Inventario
├── 📚 Catálogo Privado PCA (solo usuarios con estudiantes vinculados)
├── 👨‍🎓 Estudiantes (estudiantes PCA sincronizados)
├── 🔗 Vinculaciones (relación estudiante-acudiente)
├── 📦 Pedidos (pedidos de libros)
├── ⚙️ Configuración
│   ├── General (info de la tienda)
│   ├── Yappy Comercial (método de pago)
│   └── Monday.com (enlace a integraciones)
└── 🧪 Demo (generación de datos de prueba)
```

#### Cambios Realizados
1. **Renombrado**: "Tienda" → "Unatienda" en sidebar y títulos
2. **Consolidado**: "Libros Escolares" absorbido en Unatienda como "Catálogo Privado PCA"
3. **Movido**: Configuración de Yappy de Integraciones a Unatienda → Config
4. **Eliminado**: Sección duplicada "Unatienda / Yappy" de Integraciones
5. **Nuevo módulo**: `/app/frontend/src/modules/unatienda/` con tabs individuales

#### Archivos Creados
- `/app/frontend/src/modules/unatienda/UnatiendaModule.jsx`
- `/app/frontend/src/modules/unatienda/tabs/CatalogoPublicoTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/CatalogoPrivadoTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/EstudiantesTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/VinculacionesTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/PedidosTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/ConfiguracionTab.jsx`
- `/app/frontend/src/modules/unatienda/tabs/DemoDataTab.jsx`

#### Endpoints Backend Nuevos
- `GET /api/admin/unatienda/stats` - Estadísticas generales de Unatienda
- `GET /api/store/products/grades` - Grados disponibles para filtros
- `GET /api/store/products/subjects` - Materias disponibles para filtros

---

### 🆕 Vista Pública de Unatienda ✅

Implementada la vista pública de Unatienda (`/unatienda`) con soporte dual de catálogos.

#### Características
- **Tabs de navegación**: "Catálogo General" y "Libros PCA"
- **Catálogo General**: Productos públicos visibles para todos
- **Catálogo Privado PCA**: 
  - Solo visible para usuarios con estudiantes PCA vinculados
  - Muestra sección "Tus Estudiantes Vinculados" con nombres y grados
  - Filtros por grado y materia
  - Badge "PCA" en cada producto
- **Banner informativo**: Si el usuario no tiene acceso, muestra CTA para iniciar sesión o vincular estudiante
- **Cards de producto**: Imagen, grado, materia, editorial, precio, botón agregar al carrito

#### Lógica de Acceso
```
Usuario no autenticado → Ve catálogo público + banner de "Iniciar Sesión"
Usuario autenticado sin estudiantes → Ve catálogo público + banner de "Vincular Estudiante"
Usuario autenticado con estudiantes → Ve ambos catálogos (público + privado PCA)
```

---

### Catálogo Privado de Unatienda ✅

Sistema completo de gestión de catálogo privado para libros escolares de PCA (Panama Christian Academy).

#### Backend - Endpoints Implementados
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/store/catalogo-privado/acceso` | GET | Verificar acceso del usuario (requiere estudiante vinculado) |
| `/api/store/catalogo-privado/productos` | GET | Obtener productos del catálogo privado (con filtros) |
| `/api/store/catalogo-privado/productos/{id}` | GET | Detalle de un producto |
| `/api/store/catalogo-privado/por-grado/{grado}` | GET | Productos filtrados por grado |
| `/api/store/catalogo-privado/resumen` | GET | Resumen del catálogo para el usuario |
| `/api/store/catalogo-privado/admin/productos` | GET | Admin: Listar todos los productos |
| `/api/store/catalogo-privado/admin/productos` | POST | Admin: Crear producto |
| `/api/store/catalogo-privado/admin/productos/{id}` | PUT | Admin: Actualizar producto |
| `/api/store/catalogo-privado/admin/productos/{id}` | DELETE | Admin: Eliminar producto |

#### Frontend - Panel de Admin
- **Ubicación**: Admin → Libros Escolares → Tab "Catálogo"
- **Características**:
  - Vista de tabla con 100 productos
  - Filtros por grado y materia
  - Buscador por nombre, código, editorial
  - Formulario para agregar/editar productos
  - Estadísticas: total, activos, grados, materias

#### Lógica de Acceso
- Solo usuarios con estudiantes PCA vinculados pueden ver el catálogo
- Los productos se filtran automáticamente según el grado del estudiante
- Campo `es_catalogo_privado: true` identifica productos del catálogo privado

---

### UI/UX Fixes Completados ✅
| Issue | Descripción | Estado |
|-------|-------------|--------|
| Back Button | Botón "Volver" en `/mis-pedidos-libros` | ✅ Verificado |
| Header Cleanup | Eliminado botón "Editar Texto" del header | ✅ Verificado |
| Landing Page Editor | Panel de admin con controles funcionales (reordenar, mostrar/ocultar bloques) | ✅ Verificado |

### Mejoras Implementadas - Editor de Landing Page ✅

#### 1. Editor de Texto Enriquecido (RichTextEditor)
- **Ubicación**: `/app/frontend/src/components/common/RichTextEditor.jsx`
- **Tecnología**: TipTap
- **Características**:
  - Encabezados (H1, H2, H3)
  - Formato de texto (negrita, cursiva, subrayado, tachado)
  - Listas (con viñetas y numeradas)
  - Citas (blockquote)
  - Alineación de texto (izq, centro, der, justificado)
  - Enlaces con URL
  - Inserción de imágenes (URL o subida)
  - Deshacer/Rehacer

#### 2. Subida de Imágenes (ImageUploader)
- **Ubicación**: `/app/frontend/src/components/common/ImageUploader.jsx`
- **Backend**: `/app/backend/modules/upload/routes.py`
- **Características**:
  - Drag & drop
  - Preview de imagen
  - Barra de progreso
  - Opción de URL directa
  - Límites configurables (2MB logo, 1MB favicon)
  - Soporte para JPG, PNG, GIF, WebP, SVG

#### 3. Integración en Admin
- **Configuración del Sitio** (`SiteConfigModule.jsx`):
  - ImageUploader para Logo
  - ImageUploader para Favicon
- **Editor de Landing Page** (`LandingPageEditor.jsx`):
  - RichTextEditor para bloques de texto
  - ImageUploader para Hero, Banner, Imagen
  - Editor de bloques funcional con reordenamiento

### Landing Page Unificada
- `Landing.jsx` y `CommunityLanding.jsx` fusionados en `SuperAppLanding.jsx`
- Editor de bloques para admins con:
  - Reordenamiento (flechas arriba/abajo)
  - Toggle visibilidad (ícono de ojo)
  - Guardado de configuración

## Módulos Activos en Admin

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| Dashboard | Vista general de la tienda | ✅ Activo |
| Tienda | Gestión de productos e inventario | ✅ Activo |
| Pedidos | Administración de pedidos | ✅ Activo |
| Clientes | Gestión de clientes, conexiones y capacidades | ✅ **Actualizado** |
| **Membresías** | Planes, membresías, visitas y QR codes | ✅ **Recuperado** |
| PinpanClub | Club de Tenis de Mesa | ✅ Activo |
| Administración | Configuración del sitio | ✅ Activo |
| Integraciones | Monday.com, Google Sheets, Yappy | ✅ Activo |
| Libros Escolares | Pre-pedidos de libros | ✅ Activo |

## Módulos de Usuario

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/mi-cuenta` | Dashboard con Wallet, Conexiones, Acudidos, Capacidades | ✅ **Actualizado** |
| `/mis-pedidos-libros` | Pedidos de libros escolares | ✅ Activo |
| `/pinpanclub` | Club de Ping Pong para usuarios | ✅ Activo |

## Completed Features Summary

| Priority | Feature | Tests | Status |
|----------|---------|-------|--------|
| P0 | Super Pin Core + 3 Improvements | 12/12 | ✅ 100% |
| P1 | i18n (ES/EN/ZH) + Check-in System | 15/15 | ✅ 100% |
| P2 | Tournaments + Brackets | 19/19 | ✅ 100% |
| P3 | Badge/Achievement System | 20/20 | ✅ 100% |
| P4 | Player Profile Dashboard | 18/18 | ✅ 100% |
| P5 | Multi-Player Comparison Tool | 20/20 | ✅ 100% |
| P6 | Rapid Pin System | 21/21 | ✅ 100% |
| P7 | Match Predictor + Close Season + Notifications | 17/17 | ✅ 100% |
| P8 | P1 Features: Social + Challenges + Real-time | 24/24 | ✅ 100% |
| P9 | P2 Features: Analytics + Achievements + Socials | 22/22 | ✅ 100% |
| **P10** | **Rapid Pin Challenge System (Player vs Player)** | **13/13** | ✅ **100%** |

**Total: 201/201 tests passed** 🎉

## Latest Features (P9) ✅ NEW (Enero 2026)

### 1. Analytics Dashboard 📊
Dashboard completo de estadísticas y tendencias de la comunidad:
- **Ruta:** `/pinpanclub/analytics`
- **Endpoint:** `GET /api/pinpanclub/analytics/dashboard`
- **Métricas incluidas:**
  - Jugadores activos totales
  - Partidos esta semana (Super Pin + Rapid Pin)
  - Retos completados
  - Actividad semanal (gráfico de barras)
  - Distribución Super Pin vs Rapid Pin
  - Top jugadores más activos
  - Logros recientes
  - Ranking de retos (leaderboard)
  - Retos populares

**Endpoints:**
- `GET /api/pinpanclub/analytics/dashboard` - Dashboard completo
- `GET /api/pinpanclub/analytics/summary` - Resumen rápido

### 2. Sistema de Logros Automáticos 🏆
Sistema que otorga logros automáticamente al completar retos:
- **11 tipos de logros diferentes**
- **Rarezas:** Común, Raro, Épico, Legendario
- **Triggers automáticos** al completar retos

**Logros disponibles:**
| Nombre | Requisito | Rareza | Puntos |
|--------|-----------|--------|--------|
| Principiante | 1 reto completado | Común | 10 |
| Retador | 5 retos completados | Común | 25 |
| Maestro de Retos | 25 retos | Raro | 100 |
| Leyenda de Retos | 100 retos | Legendario | 500 |
| Semana Perfecta | Todos los retos de una semana | Épico | 200 |
| Constante | 3 semanas seguidas | Raro | 75 |
| Imparable | 10 semanas seguidas | Épico | 300 |
| Coleccionista | 500 puntos | Raro | 50 |
| Gran Coleccionista | 2000 puntos | Épico | 200 |
| Valiente | 5 retos difíciles | Raro | 100 |
| Intrépido | 3 retos extremos | Épico | 200 |

**Endpoints:**
- `GET /api/pinpanclub/achievements/` - Listar todos los logros
- `GET /api/pinpanclub/achievements/player/{jugador_id}` - Logros del jugador
- `POST /api/pinpanclub/achievements/check/{jugador_id}` - Verificar y otorgar
- `POST /api/pinpanclub/achievements/initialize` - Inicializar logros (admin)

### 3. Social Features Expandido 👥

#### Botón "Seguir" en Perfiles
- Integrado en `/pinpanclub/superpin/player/{jugadorId}`
- Muestra contador de seguidores/siguiendo
- Solo visible para usuarios autenticados
- No aparece en tu propio perfil

#### Sistema de Comentarios con Moderación
- Comentarios en perfiles de jugadores y partidos
- **Reglas de la comunidad** mostradas al escribir:
  - Respeto a todos los miembros
  - Sin lenguaje obsceno
  - Sin malos valores o pensamientos negativos
  - Sin comentarios que provoquen consecuencias negativas
- **Sistema de amonestaciones:**
  - Primera infracción: Amonestación
  - Con amonestaciones: Comentarios requieren moderación previa
- Opción de reportar comentarios

**Endpoints nuevos:**
- `GET /api/pinpanclub/social/user/{user_id}/warnings` - Obtener amonestaciones
- `POST /api/pinpanclub/social/comments/{comment_id}/report` - Reportar comentario

### 4. Achievement Showcase (Badges Visuales) 🎖️ NEW
Componente visual de badges en el header del perfil:
- **Muestra los 5 logros más importantes** (ordenados por rareza)
- **Etiqueta "NEW"** para logros obtenidos en las últimas 24 horas
- **Estilos por rareza:**
  - Común: Fondo gris, borde gris
  - Raro: Fondo azul, borde azul con sombra
  - Épico: Fondo púrpura, borde púrpura, icono de sparkles
  - Legendario: Fondo dorado, borde amarillo, animación de pulso
- **Tooltips interactivos** con descripción completa del logro
- **Animación de celebración** (confeti) al obtener logros recientes
- **Contador "+X"** para logros adicionales

**Archivo:** `/app/frontend/src/modules/pinpanclub/components/AchievementShowcase.jsx`

### 5. Sistema de Niveles/Ranks 🏅 NEW
Sistema de ranking basado en puntos acumulados de retos:
- **7 niveles progresivos:**

| Rango | Puntos | Icono | Descripción |
|-------|--------|-------|-------------|
| Bronce | 0-99 | 🥉 | Iniciando tu camino |
| Plata | 100-299 | 🥈 | Jugador comprometido |
| Oro | 300-599 | 🥇 | Jugador destacado |
| Platino | 600-999 | 💎 | Élite del club |
| Diamante | 1000-1999 | 💠 | Leyenda viviente |
| Maestro | 2000-4999 | 👑 | Dominador absoluto |
| Gran Maestro | 5000+ | 🏆 | El mejor de todos |

**Características:**
- **Badge compacto** en esquina del avatar (con tooltip)
- **Tarjeta de progreso** con barra visual hacia siguiente nivel
- **Tooltips interactivos** con info del rango
- **Animaciones para rangos altos** (pulse, sparkles para Diamante+)
- **Badge "MAX"** al alcanzar Gran Maestro
- **Efectos shimmer** en barra de progreso

**Endpoints:**
- `GET /api/pinpanclub/challenges/player/{jugador_id}/rank` - Info completa del rango

**Archivos:**
- `/app/frontend/src/modules/pinpanclub/components/PlayerRankBadge.jsx`
- `/app/backend/modules/pinpanclub/routes/challenges.py` (nuevo endpoint)

### 6. Recompensas Automáticas por Subida de Rango 🎁 NEW
Sistema de recompensas que se otorgan automáticamente al subir de rango:

| Rango | Recompensa | Badges/Perks |
|-------|------------|--------------|
| Plata | +50 pts | - |
| Oro | +100 pts | - |
| Platino | +200 pts | ⚡ Badge "Élite del Club" (rare) |
| Diamante | +500 pts | Título "Leyenda" |
| Maestro | +1000 pts | 👑 Badge "Maestro Supremo" (epic) + VIP Access |
| Gran Maestro | +2500 pts | 🏆 Badge Legendario + Hall of Fame + Todos los perks |

**Características:**
- **Detección automática** de promoción al completar retos
- **Multi-idioma** (es, en, zh) para nombres y descripciones
- **Modal de celebración** con confeti al subir de rango
- **Historial de promociones** por jugador
- **Prevención de duplicados** - no otorga recompensa si ya fue recibida
- **Notificaciones** automáticas al subir de rango
- **Activity Feed** - se publica en el feed social

**Endpoints:**
- `GET /api/pinpanclub/rank-rewards/info?lang=es` - Info de todos los rangos con recompensas
- `GET /api/pinpanclub/rank-rewards/current/{jugador_id}?lang=es` - Rango actual con progreso
- `GET /api/pinpanclub/rank-rewards/player/{jugador_id}/history` - Historial de promociones
- `POST /api/pinpanclub/rank-rewards/check-promotion/{jugador_id}?old_points=X&new_points=Y` - Verificar y otorgar promoción

**Archivos:**
- `/app/backend/modules/pinpanclub/services/rank_rewards_service.py`
- `/app/backend/modules/pinpanclub/routes/rank_rewards.py`
- `/app/frontend/src/modules/pinpanclub/components/RankRewardsDisplay.jsx`

**Test Results:** 15/15 tests passed (100%)

### 7. Sistema de Temporadas de Ranking 🏆 NEW
Sistema de temporadas competitivas con resets periódicos y recompensas exclusivas:

**Características Principales:**
- **Auto-creación de temporadas mensuales** con fechas y nombres localizados
- **Contador regresivo** en tiempo real (días, horas, minutos)
- **Leaderboard de temporada** ordenado por puntos con iconos de posición
- **5 niveles de recompensas** al final de cada temporada
- **Temas visuales** por temporada (primavera, verano, otoño, invierno, campeonato)
- **Requisitos de calificación:** mín. 5 retos + 50 puntos

**Recompensas por Posición:**
| Tier | Posición | Puntos Bonus | Badge | Perks |
|------|----------|--------------|-------|-------|
| Champion | #1 | +1000 | 🏆 Legendario | frame, emotes, priority |
| Top 3 | #2-3 | +500 | 🥇 Épico | frame |
| Top 10 | #4-10 | +250 | ⭐ Raro | - |
| Top 25 | #11-25 | +100 | 🌟 Común | - |
| Participant | #26+ | +25 | - | - |

**Multi-idioma:** Nombres, descripciones y notificaciones en ES, EN, ZH

**Endpoints:**
- `GET /api/pinpanclub/seasons/current?lang=es` - Temporada activa con localización
- `GET /api/pinpanclub/seasons/current/leaderboard` - Clasificación de temporada
- `GET /api/pinpanclub/seasons/player/{jugador_id}/current` - Stats del jugador
- `GET /api/pinpanclub/seasons/player/{jugador_id}/rewards` - Recompensas ganadas
- `GET /api/pinpanclub/seasons/all` - Todas las temporadas
- `GET /api/pinpanclub/seasons/past` - Temporadas pasadas
- `POST /api/pinpanclub/seasons/{season_id}/close` - Cerrar y otorgar recompensas (admin)
- `POST /api/pinpanclub/seasons/ensure-active` - Asegurar temporada activa (cron)

**Frontend:** `/pinpanclub/seasons` y `/pinpanclub/seasons/:seasonId`

**Archivos:**
- `/app/backend/modules/pinpanclub/models/seasons.py`
- `/app/backend/modules/pinpanclub/services/seasons_service.py`
- `/app/backend/modules/pinpanclub/routes/seasons.py`
- `/app/frontend/src/modules/pinpanclub/components/RankingSeasons.jsx`
- `/app/frontend/src/modules/pinpanclub/pages/SeasonsPage.jsx`

**Test Results:** 30/30 tests passed (100%)

## Frontend Routes

### Super Pin
- `/pinpanclub/superpin/admin` - Admin Dashboard
- `/pinpanclub/superpin/ranking` - Public Ranking
- `/pinpanclub/superpin/league/:ligaId` - League Detail
- `/pinpanclub/superpin/match/:partidoId` - Match View
- `/pinpanclub/superpin/tournament/:torneoId` - Tournament Brackets
- `/pinpanclub/superpin/player/:jugadorId` - Player Profile (con Social tab)
- `/pinpanclub/superpin/compare` - Multi-Player Comparison

### Rapid Pin
- `/pinpanclub/rapidpin` - Dashboard de temporadas
- `/pinpanclub/rapidpin/season/:seasonId` - Vista de temporada

### Analytics & Challenges ⭐ NEW
- `/pinpanclub/analytics` - Analytics Dashboard
- `/pinpanclub/challenges` - Página de retos semanales

## Database Collections

### Core Collections
- `pinpanclub_superpin_leagues`
- `pinpanclub_superpin_matches`
- `pinpanclub_superpin_rankings`
- `pinpanclub_superpin_checkins`
- `pinpanclub_superpin_tournaments`
- `pinpanclub_superpin_badges`
- `pingpong_players`

### Rapid Pin Collections
- `pinpanclub_rapidpin_seasons`
- `pinpanclub_rapidpin_matches`
- `pinpanclub_rapidpin_rankings`

### Social Collections
- `pinpanclub_follows`
- `pinpanclub_comments`
- `pinpanclub_reactions`
- `pinpanclub_activity_feed`
- `pinpanclub_notifications`
- `pinpanclub_user_moderation` ⭐ NEW
- `pinpanclub_comment_reports` ⭐ NEW

### Challenges Collections
- `pinpanclub_challenges_definitions`
- `pinpanclub_challenges_progress`
- `pinpanclub_challenges_weekly`
- `pinpanclub_challenges_leaderboard`

### Achievements Collections ⭐ NEW
- `pinpanclub_achievements`
- `pinpanclub_player_achievements`

### Prizes Collections
- `pinpanclub_prizes_catalog`
- `pinpanclub_prizes_definitions`
- `pinpanclub_prizes_awarded`

## Test Credentials
- Email: admin@libreria.com
- Password: admin
- Auth endpoint: `/api/auth-v2/login` (field: `contrasena`)
- Test Player: `jugador_544167d88272` (Carlos González / "El Rayo")

## 🆕 PHASE 1: User Management System & ChipiWallet (Enero 2026)

### Sistema de Usuarios Avanzado ✅
Sistema configurable de perfiles de usuario con tipos y relaciones:

**Tipos de Usuario (6 por defecto):**
| ID | Nombre (ES) | Nombre (EN) | Categoría |
|----|-------------|-------------|-----------|
| utype_customer | Cliente | Customer | customer |
| utype_member_adult | Miembro Adulto | Adult Member | member |
| utype_member_child | Miembro Niño | Child Member | member |
| utype_guardian | Acudiente | Guardian | family |
| utype_staff | Personal | Staff | staff |
| utype_special | Invitado Especial | Special Guest | special |

**Campos de Perfil (8 configurables):**
- Nombre para mostrar, Biografía, Teléfono, Dirección
- Contacto de emergencia, Nombre del acudiente
- Nivel de habilidad, Preferencias de notificación

**Relaciones:**
- Padre-Hijo, Acudiente-Dependiente, Tutor-Pupilo
- Permisos configurables: ver wallet, pagar por, gestionar

**Frontend:** `/mi-cuenta` → Tab "Perfil"

### ChipiWallet (Billetera Digital) ✅
Sistema de billetera con doble moneda:

| Moneda | Descripción | Tasa |
|--------|-------------|------|
| USD | Dólares americanos | 1:1 |
| ChipiPoints | Puntos virtuales | 0.008 USD |

**Funcionalidades:**
- Depósitos (efectivo, tarjeta, Yappy)
- Transferencias entre usuarios
- Conversión ChipiPoints → USD
- Historial de transacciones
- Estadísticas de uso

**Frontend:** `/mi-cuenta` → Tab "ChipiWallet"

### Sistema de Membresías ✅
Planes de membresía y sistema de visitas inteligente:

**Planes por Defecto (5):**
| Plan | Precio | Visitas | Duración | Bonus |
|------|--------|---------|----------|-------|
| Pase 12 Visitas | $300 | 12 | 90 días | 500 pts |
| Pase 6 Visitas | $165 | 6 | 60 días | 200 pts |
| Ilimitado Mensual | $150 | ∞ | 30 días | 300 pts |
| Prueba Gratis | $0 | 2 | 14 días | 50 pts |
| Cortesía | $0 | ∞ | 365 días | 0 pts |

**Check-in/Check-out Inteligente:**
- Detecta visitas rápidas (< 15 min) → no consume pase
- Visitas regulares (> 30 min) → consume 1 pase
- Auto-checkout después de 8 horas

**Frontend:** `/mi-cuenta` → Tab "Membresía"

### 🆕 Sistema de Códigos QR ✅ (Enero 2026)
Códigos QR para check-in rápido y pagos desde el perfil del usuario:

**Funcionalidades:**
- **QR Code único** por usuario (base64 encoded JSON)
- **Check-in rápido** vía escaneo QR (método: "qr")
- **Pagos QR con USD** - Deducir saldo del wallet
- **Pagos QR con ChipiPoints** - Deducir puntos del wallet
- **Regenerar QR** - Invalidar QR anterior si se pierde
- **Historial de transacciones QR** - Tracking de todas las acciones

**Endpoints API:**
- `GET /api/qr/me` - Obtener mi código QR
- `POST /api/qr/me/regenerate` - Regenerar QR (invalida anterior)
- `POST /api/qr/scan` (admin) - Escanear QR de cliente
- `POST /api/qr/process` (admin) - Procesar acción (checkin, pay_usd, pay_points)
- `POST /api/qr/checkin` (admin) - Check-in rápido
- `POST /api/qr/pay` (admin) - Procesar pago
- `GET /api/qr/transactions` - Historial de transacciones QR
- `POST /api/qr/session/create` - Crear sesión de pago

**Componentes Frontend:**
- `UserQRCode.jsx` - Muestra QR del usuario con saldo disponible
- `QRScanner.jsx` - Scanner para staff (check-in y pagos)

**Collections MongoDB:**
- `chipi_qr_codes` - Códigos QR de usuarios
- `chipi_qr_transactions` - Transacciones vía QR
- `chipi_qr_sessions` - Sesiones de pago

**Test Results:** 22/23 tests passed (1 skipped por falta de puntos)

### Endpoints API

**Users:**
- `GET /api/users/types` - Tipos de usuario
- `GET /api/users/fields` - Campos de perfil
- `GET /api/users/profile/me` - Mi perfil
- `POST /api/users/profile` - Crear perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/relationships` - Mis relaciones

**Wallet:**
- `GET /api/wallet/me` - Mi billetera
- `GET /api/wallet/summary` - Resumen con stats
- `POST /api/wallet/deposit` - Depositar
- `POST /api/wallet/transfer` - Transferir
- `POST /api/wallet/points/convert` - Convertir puntos
- `GET /api/wallet/transactions` - Historial

**Memberships:**
- `GET /api/memberships/plans` - Planes disponibles
- `GET /api/memberships/me/active` - Membresía activa
- `POST /api/memberships/purchase` - Comprar membresía
- `POST /api/memberships/visits/checkin` - Registrar entrada
- `POST /api/memberships/visits/checkout` - Registrar salida
- `GET /api/memberships/visits/stats` - Estadísticas de visitas

**Test Results:** 27/27 tests passed (100%)

### Collections MongoDB (Nuevas)
- `chipi_wallets` - Billeteras de usuarios
- `chipi_transactions` - Transacciones
- `chipi_points_history` - Historial de puntos
- `chipi_wallet_config` - Configuración
- `chipi_user_types` - Tipos de usuario
- `chipi_profile_fields` - Campos de perfil
- `chipi_user_profiles` - Perfiles de usuario
- `chipi_user_relationships` - Relaciones
- `chipi_membership_plans` - Planes de membresía
- `chipi_user_memberships` - Membresías de usuarios
- `chipi_user_visits` - Registro de visitas
- `chipi_visit_config` - Configuración de visitas

### Archivos Nuevos
**Backend:**
- `/app/backend/modules/users/models/user_models.py`
- `/app/backend/modules/users/models/wallet_models.py`
- `/app/backend/modules/users/services/user_profile_service.py`
- `/app/backend/modules/users/services/wallet_service.py`
- `/app/backend/modules/users/services/membership_service.py`
- `/app/backend/modules/users/routes/users.py`
- `/app/backend/modules/users/routes/wallet.py`
- `/app/backend/modules/users/routes/memberships.py`

**Frontend:**
- `/app/frontend/src/modules/users/pages/UsersDashboard.jsx`
- `/app/frontend/src/modules/users/components/ChipiWallet.jsx`
- `/app/frontend/src/modules/users/components/UserProfile.jsx`
- `/app/frontend/src/modules/users/components/MembershipCard.jsx`

---

## Tareas Pendientes (Consolidadas)

### Completadas ✅
1. ~~Sistema de premios avanzado configurable~~ ✅
2. ~~Real-time notifications (WebSocket)~~ ✅
3. ~~Social features: Seguir jugadores, comentarios~~ ✅
4. ~~Weekly challenges system~~ ✅
5. ~~Analytics Dashboard~~ ✅
6. ~~Sistema de logros automáticos~~ ✅
7. ~~Social expandido: Botón seguir, moderación~~ ✅
8. **Sistema de Usuarios Avanzado (Phase 1)** ✅
9. **ChipiWallet (Phase 1)** ✅
10. **Sistema de Membresías (Phase 1)** ✅
11. **Sistema de QR Code para Check-in y Pagos** ✅
12. **Sistema de Notificaciones Push** ✅ (Enero 10, 2026)
13. **Demo Data Seeding System** ✅ (Enero 10, 2026)
14. **Integración OneSignal** ✅ (Enero 11, 2026)
15. **Sistema de Desafíos Rapid Pin** ✅ (Enero 11, 2026)
16. **Negociación de Fecha para Desafíos** ✅ (Enero 11, 2026)
17. **Likes y Comentarios en Partidos** ✅ (Enero 11, 2026)
18. **WebSocket para Notificaciones en Tiempo Real** ✅ NEW (Enero 11, 2026)

### 🆕 WebSocket Real-Time Notifications ✅ (Enero 11, 2026)
Sistema de notificaciones en tiempo real usando WebSocket:

**Características:**
- Conexión WebSocket persistente con reconexión automática
- Soporte multi-idioma (ES/EN/ZH) - mensajes localizados según preferencia del usuario
- Múltiples rooms/canales (global, rapidpin, community, store)
- Indicador visual de conexión (LIVE/Offline)
- Keep-alive con ping/pong cada 30 segundos

**Eventos Emitidos:**
- `like_update`: Cuando alguien da/quita like (actualiza contador en tiempo real)
- `comment_added`: Cuando se agrega un comentario aprobado
- `challenge_created`: Cuando se crea un nuevo desafío
- `date_proposed`: Cuando se propone nueva fecha
- `date_accepted`: Cuando se acepta fecha
- `waiting_referee`: Cuando partido espera árbitro
- `referee_assigned`: Cuando se asigna árbitro

**Rooms Disponibles:**
| Room | Descripción |
|------|-------------|
| `global` | Notificaciones generales |
| `rapidpin` | Desafíos, likes, comentarios de Rapid Pin |
| `community` | Posts y eventos de la comunidad |
| `store` | Actualizaciones de pedidos |

**Arquitectura Multi-Servicio:**
- Módulo independiente `/app/backend/modules/realtime/`
- Singleton `ws_manager` para gestión de conexiones
- Helper functions para emitir eventos desde otros módulos
- Preparado para separación a microservicio

**Endpoints REST:**
- `GET /api/realtime/stats` - Estadísticas de conexiones
- `GET /api/realtime/rooms` - Lista de rooms disponibles
- `WS /api/realtime/ws` - WebSocket endpoint

**Frontend Hook:**
- `useWebSocket` hook en `/app/frontend/src/hooks/useWebSocket.js`
- Auto-connect con reconexión automática
- Callback handlers para diferentes eventos

**Nota:** En ambiente de preview el WebSocket se desconecta por restricciones del proxy. Funcionará correctamente en producción.

**Archivos:**
- `/app/backend/modules/realtime/__init__.py`
- `/app/backend/modules/realtime/routes.py`
- `/app/backend/modules/realtime/services/websocket_manager.py`
- `/app/frontend/src/hooks/useWebSocket.js`
- `/app/frontend/src/pages/RapidPinPublicPage.jsx` (integración)

### 🆕 Sistema de Desafíos Rapid Pin ✅ (Enero 11, 2026)
Sistema completo para que jugadores se desafíen entre sí a partidos de Rapid Pin:

**Flujo de Desafío con Negociación de Fecha:** ✅ ACTUALIZADO
1. Jugador A hace clic en el botón "我要挑战" (Quiero desafiar)
2. Modal muestra lista de jugadores con búsqueda + **selector de fecha**
3. Jugador A selecciona oponente, propone fecha y envía desafío
4. Jugador B recibe notificación y puede:
   - ✅ **Aceptar fecha** → pasa a "Esperando Árbitro"
   - 🔄 **Contraproponer fecha** → sigue negociando
   - ⏸️ **Poner en cola** → queda en "Retos en Cola" para retomar
5. Negociación continúa hasta acordar o poner en cola
6. Con fecha acordada, aparece botón "Yo Arbitro"
7. El público puede dar **likes** y **comentarios** en los partidos
8. Árbitro se ofrece y notifica a los jugadores
9. El árbitro registra el resultado del partido

**Ruta Frontend:** `/rapidpin`

**Componentes UI:**
- Botón principal "我要挑战" visible para usuarios autenticados
- Modal de selección de oponente con:
  - Búsqueda de jugadores
  - Avatar, nombre, apodo y rating ELO
  - **Selector de fecha y hora (datetime-local)**
  - Campo de mensaje opcional
- Modal de negociación de fecha con:
  - Historial de propuestas
  - Botones: Aceptar / Contraproponer / Poner en Cola
- Sección "Mis Desafíos" con tabs:
  - Recibidos (con botones según estado)
  - Enviados (con estado y acciones)
- Sección "Partidos Esperando Árbitro":
  - Muestra fecha acordada
  - **Botones de Like y Comentarios**
  - Botón "Yo Arbitro"
- Modal de comentarios con:
  - Contador de likes y comentarios
  - Lista de comentarios con avatar y fecha
  - Textarea con límite configurable (280 chars)
  - Mensaje de advertencia de moderación

**Endpoints API:**
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/pinpanclub/rapidpin/challenge-with-date` | POST | Crear desafío con fecha |
| `/api/pinpanclub/rapidpin/challenge/{id}/respond-date` | POST | Responder a propuesta (accept/counter/queue) |
| `/api/pinpanclub/rapidpin/challenge/{id}/resume` | POST | Retomar reto de cola |
| `/api/pinpanclub/rapidpin/challenge/{id}/like` | POST | Toggle like |
| `/api/pinpanclub/rapidpin/challenge/{id}/comment` | POST | Agregar comentario |
| `/api/pinpanclub/rapidpin/challenge/{id}/comments` | GET | Obtener comentarios |
| `/api/pinpanclub/rapidpin/comment-config` | GET/PUT | Configuración de comentarios |
| `/api/pinpanclub/rapidpin/challenge` | POST | Crear desafío (sin fecha) |
| `/api/pinpanclub/rapidpin/challenge/{id}/accept` | POST | Aceptar desafío |
| `/api/pinpanclub/rapidpin/challenge/{id}/decline` | POST | Rechazar desafío |
| `/api/pinpanclub/rapidpin/my-challenges/{player_id}` | GET | Mis desafíos |
| `/api/pinpanclub/rapidpin/queue/{id}/assign` | POST | Asignar árbitro |
| `/api/pinpanclub/rapidpin/queue/{id}/complete` | POST | Completar partido |

**Estados del Desafío:**
- `challenge_pending`: Esperando respuesta (sin fecha)
- `date_negotiation`: Negociando fecha
- `queued`: En cola sin fecha acordada
- `waiting`: Fecha acordada, esperando árbitro
- `assigned`: Árbitro asignado, partido en curso
- `completed`: Partido finalizado
- `declined`: Rechazado
- `cancelled`: Cancelado

**Campos de Negociación de Fecha:**
- `proposed_date`: Fecha propuesta actual
- `proposed_by_id`: Quién propuso la fecha actual
- `date_history[]`: Historial completo de propuestas
- `agreed_date`: Fecha acordada final

**Sistema de Likes y Comentarios:**
- `likes_count`: Contador de likes
- `comments_count`: Contador de comentarios
- **Moderación**: Usuarios sancionados van a moderación
- **Configurable**: Límite de caracteres (280 por defecto)
- **Multi-idioma**: Mensajes de advertencia en ES/EN/ZH

**Validaciones:**
- No puedes desafiarte a ti mismo
- No puede haber múltiples desafíos activos entre mismos jugadores
- Solo el otro jugador puede responder a propuestas de fecha
- Admins/Mods pueden forzar acciones
- El árbitro no puede ser uno de los jugadores
- Comentarios de usuarios sancionados van a moderación

**Notificaciones Push:** ✅ Integrado
- `challenge_received`: Notifica al oponente cuando recibe un desafío
- `date_proposed`: Notifica cuando hay nueva propuesta de fecha
- `date_accepted`: Notifica cuando se acepta la fecha
- `challenge_accepted`: Notifica al retador cuando su desafío es aceptado
- `referee_assigned`: **Notifica a AMBOS jugadores** cuando se asigna árbitro
- `referee_needed`: **Broadcast** a todos cuando hay partido esperando árbitro
- Usa categoría `cat_rapidpin` con prioridad alta
- Multi-idioma (ES/EN/ZH)

**Tests:** 19/19 passed (100%) - `/app/tests/test_rapidpin_date_likes_comments.py`

**Archivos:**
- `/app/frontend/src/pages/RapidPinPublicPage.jsx` (Frontend completo)
- `/app/backend/modules/pinpanclub/routes/rapidpin.py` (Endpoints)
- `/app/backend/modules/pinpanclub/services/rapidpin_service.py` (Lógica)
- `/app/backend/modules/pinpanclub/models/rapidpin.py` (Modelos)

**Test Results:** 13/13 tests passed (100%)

### 🆕 Integración OneSignal ✅ (Enero 11, 2026)
Integración completa con OneSignal para envío de notificaciones push reales:

**Configuración:**
| Variable | Valor |
|----------|-------|
| App ID | `f102b19d-0897-4480-b0f8-6eef3bfb8669` |
| Dominio configurado | `https://www.chipilink.me` |
| API Key | Configurada en backend/.env |

**Backend:**
- Provider `OneSignalProvider` actualizado a API v2
- Soporte para envío por segmentos, external_id, subscription_id
- Endpoint de prueba: `POST /api/notifications/admin/test-push`

**Frontend:**
- Contexto `OneSignalContext.js` para gestión de suscripciones
- Componente `PushNotificationSubscribe.jsx` con 3 variantes (full, button, switch)
- Integrado en dashboard de usuario → Tab "Notificaciones"

**Funcionalidades:**
- ✅ Suscripción/desuscripción de usuarios
- ✅ Envío a segmentos ("Subscribed Users", etc.)
- ✅ Envío por external_id (cliente_id)
- ✅ Envío por subscription_id
- ✅ Tags para categorías de notificación
- ✅ Manejo de permisos denegados
- ✅ Multi-idioma (ES/EN)

**Endpoints API:**
- `POST /api/notifications/admin/test-push` - Enviar push de prueba a segmento
- `POST /api/notifications/admin/send` - Enviar a usuario específico
- `POST /api/notifications/admin/send/bulk` - Enviar masivo

**Archivos:**
- `/app/backend/modules/notifications/providers/push_providers.py` (OneSignalProvider)
- `/app/frontend/src/contexts/OneSignalContext.js`
- `/app/frontend/src/components/notifications/PushNotificationSubscribe.jsx`

**Nota:** Frontend solo funciona en dominio de producción (`chipilink.me`). En preview muestra mensaje informativo.

### P0 - Fase 2: Sistema de Usuarios Avanzado
1. **Límites de gasto configurables** para cuentas de niños
2. **Monitoreo parental** en tiempo real
3. **Conversión USD → ChipiPoints** (inversa)
4. **ChipiPoints como método de pago** en la tienda

### 🆕 Demo Data Seeding System ✅ (Enero 10, 2026)
Sistema para poblar la aplicación con datos demo realistas para pruebas y demos:

**Datos Generados:**
| Módulo | Datos | Cantidad |
|--------|-------|----------|
| PinPanClub | Jugadores | 12 |
| PinPanClub | Rankings | 12 |
| PinPanClub | Partidos Super Pin | 30 |
| PinPanClub | Partidos Rapid Pin | 20 |
| PinPanClub | Retos | 4 |
| PinPanClub | Logros | 4 |
| PinPanClub | Torneos | 1 |
| Users/Wallets | Usuarios demo | 3 |
| Users/Wallets | Wallets | 3 |
| Notifications | Posts | 3 |

**Endpoints API:**
- `POST /api/seed/demo-data` (admin) - Crear datos demo
- `GET /api/seed/demo-stats` (público) - Estadísticas de datos
- `DELETE /api/seed/demo-data` (admin) - Limpiar datos demo

**Archivos:**
- `/app/backend/modules/admin/seed_demo.py`
- `/app/frontend/src/modules/admin/DemoDataModule.jsx` (UI para admin)

**Frontend:**
- Panel Admin → Administración → Pestaña "Datos Demo"
- Botones: "Crear Datos Demo", "Limpiar Datos Demo"
- Estadísticas en tiempo real de todos los módulos

**Test Results:** 18/18 tests passed (100%)

### P1 - Fase 3: Integración Completa
1. **Integración wallet con tienda** - Pagar con ChipiWallet
2. **Rewards automáticos** - ChipiPoints por participación
3. **Sistema de referidos** - Bonus por invitar amigos

### P2 - Backlog
1. **Containerización completa:** Desplegar módulos como microservicios separados
2. **Mobile app:** Versión nativa para iOS/Android
3. **Sistema de torneos automáticos:** Brackets generados automáticamente
4. **Integración con redes sociales:** Compartir logros y resultados
5. **Sistema de equipos/clanes:** Recompensas colectivas
6. ~~Push notifications: Notificaciones móviles~~ ✅ DONE - Ver Sistema de Notificaciones Push
7. **Integración FCM/OneSignal real:** Implementar lógica de envío real (actualmente mock)
8. **Monday.com y Fusebase:** Integración para contenido programado

## Known Issues
- **WebSocket en Preview:** Las conexiones WebSocket pueden fallar en el ambiente de preview debido a la configuración del ingress. El sistema tiene fallback a REST API que funciona correctamente.

## Architecture

```
/app/
├── backend/
│   └── modules/
│       ├── pinpanclub/
│       │   ├── routes/
│       │   │   ├── analytics.py      # Dashboard stats
│       │   │   ├── achievements.py   # Auto achievements
│       │   │   ├── social.py         # Follow, comments, moderation
│       │   │   ├── challenges.py
│       │   │   ├── prizes.py
│       │   │   └── websocket.py
│       │   ├── services/
│       │   │   ├── achievements_service.py
│       │   │   ├── challenges_service.py
│       │   │   └── social_service.py
│       │   └── models/
│       │       ├── achievements.py
│       │       ├── challenges.py
│       │       └── social.py
│       └── users/                    # 🆕 NEW MODULE
│           ├── routes/
│           │   ├── users.py          # User profiles
│           │   ├── wallet.py         # ChipiWallet
│           │   └── memberships.py    # Membership plans
│           ├── services/
│           │   ├── user_profile_service.py
│           │   ├── wallet_service.py
│           │   └── membership_service.py
│           └── models/
│               ├── user_models.py
│               └── wallet_models.py
└── frontend/
    └── src/
        └── modules/
            ├── pinpanclub/
            │   ├── components/
            │   │   ├── MatchComments.jsx
            │   │   ├── SocialFeatures.jsx
            │   │   ├── NotificationCenter.jsx
            │   │   └── WeeklyChallenges.jsx
            │   └── pages/
            │       ├── AnalyticsDashboard.jsx
            │       ├── WeeklyChallengesPage.jsx
            │       └── superpin/
            │           └── PlayerProfile.jsx
            └── users/                # 🆕 NEW MODULE
                ├── pages/
                │   └── UsersDashboard.jsx
                └── components/
                    ├── ChipiWallet.jsx
                    ├── UserProfile.jsx
                    └── MembershipCard.jsx
```

---
*Last Updated: January 10, 2026*
*All Priorities Complete: P0-P9 + Phase 1 Users + QR System + Push Notifications + PinPanClub Feed + Memberships*
*320/321 tests passed across all features* (188 + 27 + 22 + 41 + 15 + 27 new)

---

## 🆕 Sistema de Membresías/Pases Frontend Completo (Enero 2026) ✅

### Panel de Administración
**Ruta:** `/admin/memberships`

**Características:**
- **Tab Planes:** CRUD completo de planes de membresía
  - Crear/Editar planes con multi-idioma (ES, EN, ZH)
  - Tipos: visits, unlimited, trial, courtesy
  - Precio en USD y ChipiPoints
  - Total de visitas, duración en días, bonus points
  - Toggles: Destacado, Renovación automática
  - Soft delete (is_active=false)

- **Tab "En el Club":** Visitantes actuales
  - Lista de usuarios actualmente en el club
  - Hora de entrada
  - Botón "Registrar Salida"

- **Otorgar Membresía:** Dialog para dar cortesía
  - Seleccionar usuario y plan
  - Agregar nota de cortesía

### MembershipCard del Usuario
**Ruta:** `/mi-cuenta` → Tab "Membresía"

**Características:**
- **Tarjeta de membresía activa:**
  - Nombre y descripción del plan
  - Progreso de visitas (X/Y restantes)
  - Fecha de validez
  - Botón Check-in/Check-out con timer

- **Compra de membresía:**
  - Grid de planes disponibles
  - Opción de pago con ChipiPoints o efectivo/tarjeta
  - Verificación de saldo de puntos
  - Confirmación de compra

- **Estadísticas:**
  - Total de visitas
  - Visitas este mes
  - Duración promedio

- **Historial de visitas:**
  - Fecha y hora de entrada/salida
  - Duración de cada visita
  - Tipo (regular/quick)

### Endpoints API
- `GET /api/memberships/plans` - Listar planes (público)
- `POST /api/memberships/plans` - Crear plan (admin)
- `PUT /api/memberships/plans/{id}` - Actualizar plan (admin)
- `DELETE /api/memberships/plans/{id}` - Soft delete plan (admin)
- `GET /api/memberships/my-membership` - Mi membresía activa
- `POST /api/memberships/purchase` - Comprar (pay_with_points option)
- `POST /api/memberships/visits/checkin` - Registrar entrada
- `POST /api/memberships/visits/checkout` - Registrar salida
- `GET /api/memberships/visits/recent` - Mis visitas recientes
- `GET /api/memberships/visits/current` - Visitantes actuales (admin)
- `POST /api/memberships/admin/grant` - Otorgar cortesía (admin)

### Archivos Principales
- `/app/frontend/src/modules/users/pages/AdminMemberships.jsx`
- `/app/frontend/src/modules/users/components/MembershipCard.jsx`
- `/app/backend/modules/users/routes/memberships.py`
- `/app/backend/modules/users/services/membership_service.py`

### Test Results
- **Backend:** 27/27 tests passed (100%)
- **Frontend:** 17/17 features working (100%)

---

## 🆕 PinPanClub Activity Feed Block (Enero 2026) ✅

### Descripción
Bloque configurable para la página principal (Landing) que muestra actividades del club de PinPanClub. Visible para usuarios no registrados con control granular de visibilidad por audiencia.

### Características
- **Visibilidad por Audiencia**: Configurable para público, registrado, moderador, admin, super_admin, usuario específico
- **6 Secciones** (todas habilitadas por defecto):
  1. **Partidos Recientes** (Super Pin + Rapid Pin)
  2. **Top Jugadores** (Leaderboard)
  3. **Retos Activos** (Challenges semanales)
  4. **Logros Recientes** (Achievements de la comunidad)
  5. **Estadísticas de Jugadores** (Active Players, matches totales)
  6. **Próximos Torneos**
- **Multi-idioma**: ES, EN, ZH
- **Admin Controls**: Panel de configuración para activar/desactivar secciones y ajustar visibilidad

### Endpoints Públicos (sin autenticación)
- `GET /api/pinpanclub/public/activity-feed` - Feed completo con parámetros de secciones y límites
- `GET /api/pinpanclub/public/stats-summary` - Resumen rápido de estadísticas

### Integración
- **Página principal**: Integrado en `CommunityLanding.jsx` (ruta `/`)
- **Landing Editor**: Disponible como bloque `pinpanclub_feed` en el editor de landing pages

### Archivos
- `/app/backend/modules/pinpanclub/routes/public_feed.py`
- `/app/frontend/src/components/blocks/PinPanClubFeedBlock.jsx`
- `/app/backend/modules/landing/models.py` (BLOCK_TEMPLATES)

### Test Results
- **Backend:** 15/15 tests passed (100%)
- **Frontend:** 100% componentes funcionando

---

## 🆕 Sistema de Notificaciones Push (Enero 2026) ✅

### Descripción
Sistema de notificaciones push altamente configurable con soporte para múltiples proveedores (FCM, OneSignal), categorías configurables, editor avanzado de posts tipo bloques, y preferencias de usuario.

### Panel de Administración ✅
**Ruta:** `/admin/notifications`

**Características:**
- **Tab Proveedores:** Configuración de FCM y OneSignal
  - Enable/disable cada proveedor
  - API Keys y credenciales (ocultas en respuestas)
  - Peso de balanceo de carga
  - Rate limits por minuto
  - Estrategia de load balancing (weighted, round_robin, least_loaded)
  - Failover automático

- **Tab Categorías:** Gestión de categorías de notificación
  - 8 categorías predeterminadas (QR Payments, Check-in, Memberships, etc.)
  - CRUD completo con soporte multi-idioma (ES, EN, ZH)
  - Iconos emoji personalizables
  - Colores personalizables
  - Prioridad (low, normal, high, urgent)
  - Módulo asociado

- **Tab Enviar:** Formulario de envío de notificaciones
  - Audiencia: Todos los usuarios o usuario específico
  - Selector de categoría
  - Título y mensaje
  - URL de imagen y acción opcionales

### Gestión de Posts/Anuncios ✅
**Ruta:** `/admin/posts`

**Características:**
- **Listado de posts** con búsqueda y filtros (Todos, Borradores, Publicados, Programados)
- **Editor avanzado tipo bloques** con 12+ tipos:
  - Párrafo, Heading 1/2/3
  - Lista, Lista numerada
  - Imagen, Video
  - Cita, Callout (info/warning/success/error)
  - Botón, Embed, Separador
- **Multi-idioma** para título, resumen y contenido
- **Publicar/Programar** posts
- **Enviar notificación** al publicar

### Preferencias de Usuario ✅
**Ruta:** `/mi-cuenta` → Tab "Notificaciones"

**Características:**
- **Configuración Global:**
  - Toggle Push Notifications
  - Toggle Email Notifications
  - Horario Silencioso (quiet hours)

- **Preferencias por Categoría:**
  - Enable/disable cada categoría
  - Toggle Push por categoría
  - Toggle Email por categoría

### Endpoints API

**Categorías:**
- `GET /api/notifications/categories` - Listar categorías (público)
- `GET /api/notifications/categories/{id}` - Obtener categoría
- `POST /api/notifications/admin/categories` - Crear categoría (admin)
- `PUT /api/notifications/admin/categories/{id}` - Actualizar categoría
- `DELETE /api/notifications/admin/categories/{id}` - Eliminar categoría

**Preferencias:**
- `GET /api/notifications/preferences` - Obtener preferencias
- `PUT /api/notifications/preferences` - Actualizar preferencias globales
- `PUT /api/notifications/preferences/category/{id}` - Actualizar por categoría

**Proveedores (Admin):**
- `GET /api/notifications/admin/config` - Obtener configuración
- `PUT /api/notifications/admin/config/{provider}` - Actualizar proveedor

**Envío (Admin):**
- `POST /api/notifications/admin/send` - Enviar a usuario
- `POST /api/notifications/admin/send/bulk` - Enviar masivo

**Dispositivos:**
- `GET /api/notifications/devices` - Mis dispositivos
- `POST /api/notifications/devices/register` - Registrar dispositivo
- `DELETE /api/notifications/devices/{token}` - Eliminar dispositivo

**Posts:**
- `GET /api/posts/` - Posts públicos
- `GET /api/posts/{id}` - Obtener post
- `POST /api/posts/{id}/like` - Like post
- `GET /api/posts/admin/all` - Todos los posts (admin)
- `POST /api/posts/admin/create` - Crear post
- `PUT /api/posts/admin/{id}` - Actualizar post
- `POST /api/posts/admin/{id}/publish` - Publicar post
- `DELETE /api/posts/admin/{id}` - Eliminar post

**Historial:**
- `GET /api/notifications/history` - Mi historial
- `GET /api/notifications/admin/logs` - Logs admin

### Collections MongoDB
- `notifications_categories` - Categorías de notificación
- `notifications_preferences` - Preferencias de usuarios
- `notifications_devices` - Dispositivos registrados
- `notifications_config` - Configuración de proveedores
- `notifications_logs` - Historial de envíos
- `notifications_posts` - Posts/anuncios
- `notifications_templates` - Plantillas

### Archivos Nuevos
**Backend:**
- `/app/backend/modules/notifications/models/notification_models.py`
- `/app/backend/modules/notifications/services/push_service.py`
- `/app/backend/modules/notifications/services/post_service.py`
- `/app/backend/modules/notifications/providers/push_providers.py` (MOCK)
- `/app/backend/modules/notifications/routes/notifications.py`
- `/app/backend/modules/notifications/routes/posts.py`

**Frontend:**
- `/app/frontend/src/modules/notifications/pages/AdminNotifications.jsx`
- `/app/frontend/src/modules/notifications/pages/AdminPosts.jsx`
- `/app/frontend/src/modules/notifications/components/ProviderConfig.jsx`
- `/app/frontend/src/modules/notifications/components/CategoryManager.jsx`
- `/app/frontend/src/modules/notifications/components/SendNotification.jsx`
- `/app/frontend/src/modules/notifications/components/PostEditor.jsx`
- `/app/frontend/src/modules/notifications/components/NotificationPreferences.jsx`
- `/app/frontend/src/modules/notifications/components/NotificationHistory.jsx`

### Integraciones MOCKED
- **FCM Push Sending** - Placeholder en `push_providers.py`
- **OneSignal Push Sending** - Placeholder en `push_providers.py`
- **Monday.com Integration** - Placeholder para contenido programado
- **Fusebase Integration** - Placeholder para contenido programado

### Test Results
- **Backend:** 41/41 tests passed (100%)
- **Frontend:** 100% paneles funcionando

---

## P11: Sistema de Pedidos de Libros Escolares ✅ NUEVO (Enero 2026)

### Descripción
Sistema completo para pre-pedidos de libros escolares con funcionalidad de importación masiva desde Google Sheets (copiar/pegar) y sistema de vinculación estudiante-acudiente.

### Funcionalidades Implementadas

#### 1. Importación Masiva de Datos (Bulk Import) ✅
**Ruta Admin:** `/admin/book-orders`

**Características:**
- **Parseo TSV** - Procesa datos copiados de Google Sheets (tab-separated)
- **Mapeo de Columnas** - Selector intuitivo para mapear columnas A, B, C... a campos
- **Preview antes de Importar** - Validación de datos con detección de:
  - Duplicados en la importación
  - Registros existentes en DB
  - Errores de validación
  - Resumen de acciones (crear/actualizar)
- **Importación de Estudiantes** - Con grado, sección, nombre completo
- **Importación de Libros** - Con código, precio, editorial, ISBN, grado, materia
- **Historial de Importaciones** - Registro de todas las importaciones con auditoría

**Endpoints API:**
- `POST /api/store/bulk-import/parse` - Parsear texto TSV
- `POST /api/store/bulk-import/estudiantes/preview` - Preview de estudiantes
- `POST /api/store/bulk-import/estudiantes/import` - Importar estudiantes
- `GET /api/store/bulk-import/estudiantes` - Listar estudiantes importados
- `GET /api/store/bulk-import/grados` - Obtener grados disponibles
- `POST /api/store/bulk-import/libros/preview` - Preview de libros
- `POST /api/store/bulk-import/libros/import` - Importar libros
- `GET /api/store/bulk-import/history` - Historial de importaciones

#### 2. Sistema de Vinculación Estudiante-Acudiente ✅
Sistema de vinculación con flujo de aprobaciones:

**Flujos de Aprobación:**
- **Primera Vinculación:** Acudiente solicita → Admin aprueba → Rol "principal"
- **Vinculaciones Posteriores:** Acudiente solicita → Principal aprueba (o Admin)
- **Invitación:** Principal invita → Invitado acepta → Rol "autorizado"

**Roles:**
- `principal` - Acudiente principal, puede invitar otros
- `autorizado` - Acudiente autorizado por el principal
- `solo_lectura` - Solo puede ver información

**Endpoints API:**
- `POST /api/store/vinculacion/buscar-estudiante` - Buscar estudiante por número
- `POST /api/store/vinculacion/solicitar` - Solicitar vinculación
- `GET /api/store/vinculacion/mis-estudiantes` - Mis estudiantes vinculados
- `GET /api/store/vinculacion/mis-solicitudes-pendientes` - Solicitudes pendientes (principal)
- `POST /api/store/vinculacion/invitar` - Invitar otro acudiente (principal)
- `POST /api/store/vinculacion/invitacion/{id}/aceptar` - Aceptar invitación
- `POST /api/store/vinculacion/{id}/aprobar` - Aprobar vinculación (principal)
- `POST /api/store/vinculacion/{id}/rechazar` - Rechazar vinculación
- `DELETE /api/store/vinculacion/{id}` - Desvincularse

**Endpoints Admin:**
- `GET /api/store/vinculacion/admin/solicitudes-pendientes` - Solicitudes pendientes
- `GET /api/store/vinculacion/admin/todas` - Todas las vinculaciones
- `GET /api/store/vinculacion/admin/estudiante/{id}/acudientes` - Acudientes de estudiante
- `POST /api/store/vinculacion/admin/{id}/aprobar` - Aprobar (admin)
- `POST /api/store/vinculacion/admin/{id}/rechazar` - Rechazar (admin)
- `POST /api/store/vinculacion/admin/{id}/cambiar-rol` - Cambiar rol
- `DELETE /api/store/vinculacion/admin/{id}` - Desvincular (admin)
- `POST /api/store/vinculacion/admin/vincular-directo` - Vincular sin aprobación

#### 3. Panel de Administración Frontend ✅
**Ruta:** `/admin/book-orders`

**Pestañas:**
1. **Estudiantes** - Lista de estudiantes importados con búsqueda y filtros por grado
2. **Importar Estudiantes** - Interfaz de copiar/pegar desde Google Sheets
3. **Importar Libros** - Interfaz de copiar/pegar para catálogo de libros
4. **Vinculaciones** - Gestión de solicitudes pendientes y todas las vinculaciones

### Archivos Nuevos

**Backend:**
- `/app/backend/modules/store/services/bulk_import_service.py`
- `/app/backend/modules/store/routes/bulk_import.py`
- `/app/backend/modules/store/routes/vinculacion.py`

**Frontend:**
- `/app/frontend/src/modules/store/BookOrdersAdmin.jsx`

### Collections MongoDB
- `estudiantes_sincronizados` - Estudiantes importados desde Google Sheets
- `libros` - Catálogo de libros escolares
- `vinculaciones` - Vinculaciones estudiante-acudiente
- `invitaciones_acudiente` - Invitaciones entre acudientes
- `import_logs` - Historial de importaciones

### Test Results
- **Backend:** 20/20 tests passed (100%)
- **Frontend:** 100% funcionalidades verificadas

### Test P0 - Flujo de Pedidos
- **Backend:** 20/20 tests passed (100%) - iteration_24.json
- **Frontend:** 100% funcionalidades verificadas

---

## Próximas Tareas (Backlog)

### P0 - Crítico ✅ COMPLETADO
- [x] Vista previa del pedido mostrando todos los libros del grado
- [x] Flujo de pedidos de libros para acudientes vinculados
- [x] Restricción: un libro por estudiante por año escolar
- [x] Sistema de pre-órdenes con demanda agregada
- [x] Panel admin con demanda agregada y gestión de estados

### P1 - Alta Prioridad ✅ COMPLETADO
- [x] Notificaciones push para aprobaciones de vinculación
- [x] Agregar enlace a "Mis Libros Escolares" en el menú principal
- [x] Integración con Monday.com para seguimiento de pedidos
- [x] **Chat con Monday.com Updates** - Comunicación bidireccional cliente ↔ Books de Light ✅ NEW (Enero 12, 2026)

### 🆕 Chat con Monday.com Updates ✅ (Enero 12, 2026)
Sistema de chat integrado que usa Monday.com Updates como canal de comunicación:

**Características:**
- Comunicación bidireccional entre cliente (en ChipiLink) y equipo de Books de Light (en Monday.com)
- Los mensajes enviados desde la app aparecen como Updates en Monday.com
- Los mensajes de Monday.com aparecen en el chat de la app
- Auto-detección de origen del mensaje (cliente vs Books de Light)
- Limpieza automática de prefijos y formato del autor

**Flujo:**
1. El pedido se sincroniza con Monday.com (automático al confirmar o manual vía admin)
2. El cliente abre el pedido confirmado y hace clic en "Abrir Chat con Books de Light"
3. El cliente puede enviar mensajes que aparecen en Monday.com
4. El equipo de Books de Light responde desde Monday.com
5. El cliente ve las respuestas en tiempo real (al refrescar o polling)

**Endpoints API:**
- `GET /api/store/monday/pedido/{pedido_id}/messages` - Obtener mensajes del chat
- `POST /api/store/monday/pedido/{pedido_id}/message` - Enviar mensaje
- `POST /api/store/monday/sync/{pedido_id}` - Sincronizar pedido con Monday.com (admin)

**Componentes Frontend:**
- `PedidoChat` - Panel de chat con historial y envío de mensajes
- `PedidoDetalle` - Vista de detalle con botón para abrir/ocultar chat

**Archivos:**
- `/app/backend/modules/store/routes/monday.py`
- `/app/backend/modules/store/services/monday_pedidos_service.py`
- `/app/frontend/src/modules/store/MisPedidosLibros.jsx`

**Test Results:** 15/15 tests passed (100%) - iteration_25.json

### 🆕 Monday.com Unificado en Integraciones ✅ (Enero 12, 2026)
Toda la configuración de Monday.com centralizada en Admin → Integraciones → Monday.com:

**Estructura de pestañas:**
1. **Workspaces** - Gestión de múltiples cuentas/workspaces con diferentes API Keys
2. **Pedidos de Libros** - Configuración específica para Books de Light
3. **General** - Configuración legacy para otras integraciones

**Características:**
- Agregar múltiples workspaces con diferentes API Keys
- Activar/desactivar workspaces según necesidad
- API Key enmascarada por seguridad
- Seleccionar boards y mapear columnas
- Sincronización manual o automática de pedidos
- Instrucciones para obtener API Key de Monday.com

**Navegación:**
- Desde "Libros Escolares → Monday": Muestra enlace a Integraciones
- Desde menú lateral: Admin → Integraciones → Monday.com
- Botones "Volver" y "Panel Admin" en Libros Escolares

**Archivos modificados:**
- `/app/frontend/src/modules/monday/MondayModule.jsx` - Reescrito completo con pestañas
- `/app/frontend/src/modules/store/BookOrdersAdmin.jsx` - Monday reemplazado con enlace
- `/app/backend/modules/store/routes/monday.py` - Endpoints para workspaces
- `/app/backend/modules/store/services/monday_pedidos_service.py` - Lógica de workspaces

---

### 🆕 Sistema de Conexiones y Capacidades ✅ (Enero 12, 2026)
Nuevo sistema de gestión de usuarios que unifica "Clientes", "Usuarios" y "Membresías" en una arquitectura flexible basada en Capacidades, Membresías y Conexiones.

**Conceptos clave:**
- **Capacidades:** Habilidades/roles que pueden tener los usuarios (predeterminada, por_suscripcion, beneficio_extendido, solicitada)
- **Conexiones:** Relaciones entre usuarios con permisos específicos (familiar, social, especial)
- **Acudidos:** Cuentas dependientes gestionadas por un Acudiente
- **Marketing configurable:** Servicios sugeridos personalizables por admin

**Backend APIs creados:**
- `GET /api/conexiones/mis-conexiones` - Conexiones del usuario
- `GET /api/conexiones/capacidades` - Capacidades disponibles
- `GET /api/conexiones/mis-capacidades` - Capacidades activas del usuario
- `POST /api/conexiones/solicitar` - Crear solicitud de conexión
- `GET /api/conexiones/solicitudes/recibidas` - Solicitudes recibidas
- `GET /api/conexiones/solicitudes/enviadas` - Solicitudes enviadas
- `POST /api/conexiones/crear-acudido` - Crear usuario dependiente
- `GET /api/conexiones/mis-acudidos` - Obtener acudidos del usuario
- `GET /api/conexiones/servicios-sugeridos` - Marketing configurable
- `GET /api/conexiones/buscar?q=X` - Buscar usuarios
- `POST /api/conexiones/invitar` - Invitar usuario no registrado
- `GET /api/conexiones/admin/solicitudes-pendientes` - Admin: solicitudes pendientes
- `POST /api/conexiones/admin/otorgar-capacidad` - Admin: otorgar capacidad

**Frontend - /mi-cuenta:**
- **Tabs nuevos:** Conexiones, Acudidos, Capacidades
- **Transferencias:** Botón "Transferir" en header + dialog completo
- **Marketing:** Sección "Servicios para ti" con sugerencias configurables

**Frontend - Admin > Clientes:**
- **Tab nuevo:** "Conexiones y Capacidades"
- **Sistema de Usuarios panel** con stats cards
- **Tabla de Capacidades:** 5 capacidades configuradas (Cliente, Jugador en Ranking, Árbitro, Acudiente, Estudiante Tutoría)
- **Sub-tabs:** Capacidades, Solicitudes, Otorgar Capacidad, Permisos

**Archivos creados/modificados:**
- `/app/backend/modules/users/models/conexiones_models.py` - Modelos de datos
- `/app/backend/modules/users/routes/conexiones.py` - Rutas API
- `/app/backend/modules/users/services/conexiones_service.py` - Lógica de negocio
- `/app/frontend/src/modules/users/pages/UsersDashboard.jsx` - Página Mi Cuenta actualizada
- `/app/frontend/src/modules/users/components/MisConexiones.jsx` - Gestión de conexiones
- `/app/frontend/src/modules/users/components/MisAcudidos.jsx` - Gestión de acudidos
- `/app/frontend/src/modules/users/components/MisCapacidades.jsx` - Ver capacidades
- `/app/frontend/src/modules/users/components/TransferenciasDialog.jsx` - Transferir fondos
- `/app/frontend/src/modules/users/components/ServiciosSugeridos.jsx` - Marketing
- `/app/frontend/src/modules/users/components/AdminUsuariosConexiones.jsx` - Panel Admin
- `/app/frontend/src/modules/customers/CustomersModule.jsx` - Integrado con nuevo sistema

**Test Results:** 17/17 tests passed (100%) - iteration_26.json

### 🆕 Transferencias Wallet y Alertas Bilaterales ✅ (Enero 12, 2026)
Sistema completo de transferencias de wallet entre usuarios conectados y alertas bilaterales para saldo insuficiente.

**Backend APIs:**
- `POST /api/conexiones/transferir` - Transferir saldo entre usuarios conectados
- `POST /api/conexiones/alerta-saldo-insuficiente` - Crear alerta bilateral
- `GET /api/conexiones/mis-alertas` - Obtener alertas (como usuario o acudiente)
- `POST /api/conexiones/alertas/{alerta_id}/resolver` - Marcar alerta como resuelta

**Características de Transferencias:**
- Requiere conexión entre usuarios con permiso `transferir_wallet`
- Valida límite diario de transferencia por relación
- Valida saldo suficiente antes de transferir
- Registra historial de transferencias

**Sistema de Alertas Bilaterales:**
- Las alertas se envían al usuario y a sus acudientes automáticamente
- Marcador `es_mia` o `es_de_acudido` para diferenciar
- Acudientes pueden recargar saldo desde la alerta
- Botón "Resolver" para marcar alertas como atendidas

**Frontend Updates:**
- Componente `AlertasSaldo` en `/mi-cuenta` (arriba de "Services for you")
- Badge "Mi alerta" / "De acudido" según corresponda
- Botón "Recargar" para acudientes con transferencia directa
- Botón "Resolver" para cerrar alertas

**Archivos creados/modificados:**
- `/app/backend/modules/users/routes/conexiones.py` - Endpoints de alertas
- `/app/backend/modules/users/services/conexiones_service.py` - Lógica de transferencias
- `/app/frontend/src/modules/users/components/AlertasSaldo.jsx` - Componente UI

**Test Results:** 20/20 tests passed (1 skipped) - iteration_27.json

### 🆕 CXGenie Widget Movido al Header ✅ (Enero 12, 2026)
El botón de soporte/chat se movió al header para mejor accesibilidad.

**Cambios:**
- Nuevo botón `MessageCircle` en el header junto al carrito
- CSS para ocultar el widget flotante original
- Función `toggleSupportChat()` para abrir el chat desde el header

**Archivo modificado:**
- `/app/frontend/src/components/layout/Header.jsx`

### 🆕 Admin: Edición de Permisos y Capacidades ✅ (Enero 12, 2026)
Panel completo de administración con CRUD interactivo para permisos por relación y capacidades.

**Backend APIs:**
- `GET /api/conexiones/admin/permisos-relacion` - Lista permisos configurados
- `PUT /api/conexiones/admin/permisos-relacion` - Actualizar permisos por relación (upsert)
- `POST /api/conexiones/admin/capacidades` - Crear nueva capacidad
- `PUT /api/conexiones/admin/capacidades/{id}` - Actualizar capacidad
- `DELETE /api/conexiones/admin/capacidades/{id}` - Desactivar capacidad (soft delete)

**Frontend - Admin > Clientes > Permisos:**
- Tabla con 10 tipos de relación (Acudiente, Padre/Madre, Amigo, etc.)
- 5 columnas de permisos: Transferir, Ver Wallet, Recargar, Alertas, Límite Diario
- Switches interactivos con auto-guardado
- Input de límite diario por relación

**Frontend - Admin > Clientes > Capacidades:**
- Botón "Nueva Capacidad" con formulario completo
- Campos: ID único, Nombre ES/EN, Descripción, Ícono (emoji), Color (picker), Tipo, Membresía requerida, Requiere aprobación, Activa
- Botones de edición y eliminación por capacidad
- Tabla con 6 capacidades activas

**Test Results:** 16/16 tests passed (100%) - iteration_28.json

### 🆕 Notificaciones Push Reales para Alertas ✅ (Enero 12, 2026)
Integración completa de notificaciones push para alertas de wallet y transferencias.

**Backend Integración:**
- `crear_alerta_saldo_insuficiente()` ahora envía push al usuario Y a todos sus acudientes
- `transferir_wallet()` envía push al remitente (confirmación) y destinatario (recibido)
- Notificaciones incluyen `action_url` para navegación directa a `/mi-cuenta?tab=wallet`
- Datos estructurados: `type`, `alerta_id`/`transferencia_id`, `action`

**Nuevas Categorías de Notificación:**
- `wallet_alerts`: 💰 Alertas de Wallet (color #f59e0b, prioridad HIGH)
- `connections`: 🔗 Conexiones (color #8b5cf6, prioridad NORMAL)

**Tipos de Notificación Enviados:**
| Evento | Destinatario | Título | Categoría |
|--------|--------------|--------|-----------|
| Saldo insuficiente | Usuario | 💰 Saldo Insuficiente | wallet_alerts |
| Saldo insuficiente | Acudiente(s) | 🔔 Alerta de Acudido | wallet_alerts |
| Transferencia enviada | Remitente | 💸 Transferencia Enviada | wallet_alerts |
| Transferencia recibida | Destinatario | 💰 Transferencia Recibida | wallet_alerts |

**Frontend:**
- `PushNotificationSubscribe.jsx` actualizado con nuevos beneficios:
  - 💰 Alertas de saldo insuficiente
  - 💸 Confirmaciones de transferencias recibidas
  - 🔗 Solicitudes de conexión nuevas

**Nota:** En ambiente preview, las notificaciones retornan `success=false` porque no hay dispositivos móviles/web push registrados. En producción (chipilink.me), las notificaciones se enviarán a través de OneSignal.

**Test Results:** 13/13 tests passed (100%) - iteration_29.json

### 🆕 Notificaciones Push para Solicitudes de Conexión ✅ (Enero 12, 2026)
Integración de notificaciones push para el flujo completo de solicitudes de conexión.

**Eventos que envían notificaciones:**
| Evento | Destinatario | Título | Tipo |
|--------|--------------|--------|------|
| Nueva solicitud | Destinatario | 🔗 Nueva Solicitud de Conexión | connection_request |
| Solicitud aceptada | Solicitante | ✅ Conexión Aceptada | connection_accepted |
| Solicitud rechazada | Solicitante | ❌ Conexión Rechazada | connection_rejected |

**Backend:**
- `crear_solicitud()` envía push al destinatario (para_usuario_id)
- `responder_solicitud()` envía push al solicitante original (de_usuario_id)
- Método helper `_get_subtipo_label()` convierte subtipos a etiquetas legibles
- Todas las notificaciones usan `category_id='connections'` y `action_url='/mi-cuenta?tab=conexiones'`

**Frontend (MisConexiones.jsx):**
- `handleSendRequest()` muestra toast "🔔 Se notificó al usuario" cuando push es exitoso
- `handleRespondRequest()` muestra indicador de notificación en toast

**Test Results:** 12/12 tests passed (5 skipped) - iteration_30.json

### 🆕 Unificación Landing Pages → SuperAppLanding ✅ (Enero 12, 2026)
Se unificaron `Landing.jsx` y `CommunityLanding.jsx` en un solo componente `SuperAppLanding.jsx`.

**Archivos eliminados:**
- `/app/frontend/src/pages/Landing.jsx` (1410 líneas)
- `/app/frontend/src/pages/CommunityLanding.jsx` (635 líneas)

**Archivo creado:**
- `/app/frontend/src/pages/SuperAppLanding.jsx` - Página principal unificada

**Características del nuevo SuperAppLanding:**
- **Hero Carousel** - Posts destacados rotativos
- **Quick Access** - 6 botones de acceso rápido (Tienda, Super Pin, Rapid Pin, Eventos, Galería, Jugadores)
- **Announcements Banner** - Anuncios importantes
- **PinPanClub Feed** - Actividad del club (stats, matches, challenges)
- **News Section** - Últimas noticias con cards
- **Events Section** - Próximos eventos
- **Gallery Section** - Álbumes de fotos

**Modo de Edición (Solo Admins):**
- Botón "Editar" flotante en esquina inferior derecha
- Panel lateral con toggle de visibilidad por bloque
- 7 bloques configurables: Hero, Quick Access, Announcements, PinPanClub, News, Events, Gallery

**Rutas actualizadas:**
- `/` → SuperAppLanding (página principal)
- `/comunidad` → SuperAppLanding
- `/eventos` → SuperAppLanding
- `/galeria` → SuperAppLanding
- Eliminada: `/landing-editor` (ya no necesaria)

---

### 🆕 Datos Demo para Unatienda ✅ (Enero 14, 2026)
Sistema de generación de datos demo específico para el catálogo privado "Unatienda" (libros escolares).

**Características:**
- Genera 100 libros de texto para todos los grados (Pre-Kinder a 12vo)
- Crea ~110 estudiantes distribuidos por grado con datos completos
- Genera 10 pedidos de ejemplo con múltiples productos
- Los productos incluyen: código, ISBN, editorial, materia, precio y precio de oferta
- Los estudiantes incluyen: número, nombre, grado, sección y datos de acudiente

**Ubicación:**
- Frontend: Admin → Libros Escolares → Tab "Demo"
- Backend: `/api/admin/unatienda/demo-data` (POST/DELETE)
- Script: `/app/backend/scripts/generate_unatienda_demo.py`

**Endpoints API:**
- `POST /api/admin/unatienda/demo-data` - Generar datos demo
- `DELETE /api/admin/unatienda/demo-data` - Limpiar datos demo
- `GET /api/admin/unatienda/demo-stats` - Obtener estadísticas

**Nota:** Los pedidos generados pueden sincronizarse con Monday.com si está configurado, incluyendo la creación de subitems para cada producto del pedido.

---

### P2 - Media Prioridad
- [ ] Intermediación de pagos (tarjeta crédito → Books de Light)
- [ ] Solicitud especial para re-compras (libro perdido)
- [ ] Reporte de demanda para publishers
- [ ] **Selector de plantillas prediseñadas** para bloques de texto (títulos, CTAs, anuncios con estilos consistentes)

### P3 - Baja Prioridad
- [ ] Integración directa con Google Sheets (Service Account)
- [ ] Sincronización automática programada
- [ ] Límites de gasto configurables por acudiente
