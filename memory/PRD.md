# ChiPi Link - Product Requirements Document

> **📚 Related Documents:**
> - **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture, naming standards, folder structure
> - **[CHANGELOG.md](./CHANGELOG.md)** - History of changes and updates
> - **[ROADMAP.md](./ROADMAP.md)** - Prioritized backlog and future features

---

## Original Problem Statement

**ChipiLink** es una Super App multi-módulo diseñada para gestionar múltiples servicios integrados bajo una sola plataforma.

### Módulos Principales:

#### 1. 🛒 Unatienda (Tienda Principal)
- **Catálogo Público** - Productos disponibles para todos
- **Catálogo Privado** - Libros escolares exclusivos (requiere vinculación)
- **Pedidos** - Gestión de órdenes y entregas
- **Configuración** - Ajustes de la tienda

#### 2. 📚 Textbook Access (Acceso a Libros Escolares)
- Vinculación de estudiantes a escuelas
- Padres/acudientes solicitan acceso al catálogo privado
- Admin aprueba/rechaza solicitudes
- Estudiantes vinculados pueden ver libros de su escuela/grado
- **📦 Pedidos de Textos** (NUEVO)
  - Lista de libros por grado con precios configurables
  - Usuario selecciona libros → total en tiempo real
  - Envío bloquea items + notifica a Monday.com
  - Sistema de recompra (solicitar → admin aprueba)
  - Dashboard admin con estadísticas

#### 3. 🏓 PinpanClub (Clubes de Ping Pong)
- Gestión de clubes y jugadores
- **Super Pin** - Sistema de ranking
- **Rapid Pin** - Partidos espontáneos
- Torneos y temporadas

#### 4. 👤 User Management (Gestión de Usuarios)
- **Capacidades** (Capacities) - Habilidades/permisos del usuario
- **Membresías** (Subscriptions) - Planes de suscripción
- **Conexiones** (Relationships) - Red de contactos
- **Acudidos** (Dependents) - Personas a cargo

#### 5. 💰 ChipiWallet (Billetera Digital)
- Balance en USD
- ChipiPoints (puntos de fidelidad)
- Transferencias entre usuarios
- Historial de transacciones

#### 6. 🔐 Roles & Permissions (RBAC)
- Roles personalizables
- Permisos granulares por módulo
- Asignación de roles a usuarios

#### 7. 🔔 Notifications (Notificaciones)
- Push notifications (OneSignal - pendiente)
- Historial de notificaciones
- Preferencias por usuario

#### 8. 🔌 Integrations (Integraciones)
- Monday.com - Sincronización de pedidos
- Yappy - Pagos (Panamá)
- i18next - Multilenguaje

#### 9. 📊 Dashboard (Panel de Control)
- Estadísticas generales
- Métricas por módulo

#### 10. 🎓 Módulos Adicionales (En desarrollo)
- **AI Tutor** - Tutor con inteligencia artificial
- **Chess** - Módulo de ajedrez
- **Community** - Comunidad de usuarios
- **Content Hub** - Hub de contenido
- **Landing Editor** - Editor de landing pages

---

## 🔴 CODING STANDARDS (MANDATORY)

These rules are **PERMANENT** and must be followed in all future development sessions:

### 1. English-First Code
- **All code** (variables, functions, classes, comments) MUST use **English** naming
- Exceptions:
  - Terms that don't exist in English
  - Domain-specific terms where the non-English term is more convenient (e.g., "cédula" for ID in Panama)
- Example: Use `students`, `handleSubmit`, `formData` NOT `estudiantes`, `manejarEnvio`, `datosFormulario`

### 2. Multilingual Support (i18n)
- All user-facing text must support **three languages** in this priority order:
  1. **English (en)** - Primary/default
  2. **Spanish (es)** - Secondary  
  3. **Chinese (zh)** - Tertiary
- Use i18next translation keys for all UI text
- Store labels in format: `{ label_en: "...", label_es: "...", label_zh: "..." }`

### 3. Multi-Service Architecture
- Backend modules should be designed for potential microservice extraction
- Use clear module boundaries (`/app/backend/modules/{module_name}/`)
- Each module should have: `models/`, `services/`, `routes/`, `repositories/`
- Avoid tight coupling between modules

### 4. Data Source Consistency
- **Single Source of Truth**: Each data entity must have ONE authoritative source
- **Schools**: Managed via `store_schools` collection, NOT via form config options
- **Form Options**: Use form config for flexible lists (relationships, etc.)
- **Constants**: Use code constants for stable values (grades, etc.)

### 5. Database Naming Convention
- Format: `{module}_{entity}` (e.g., `store_schools`, `user_profiles`)
- See **ARCHITECTURE.md** for complete list

### 6. Frontend Structure
```
/modules/
  /admin/          ← All admin/backoffice panels
    /users/        ← User management
  /account/        ← User's personal portal
    /linking/      ← Student linking (Compra Exclusiva)
    /profile/
    /wallet/
    /connections/
  /unatienda/      ← Store module
  /pinpanclub/     ← Ping pong module
  /notifications/  ← Notifications module
```

### 7. NO Dual/Legacy Systems ⚠️
- **NEVER maintain two systems for the same functionality**
- When a new system replaces an old one, **DELETE the old code completely**
- Do NOT add fallbacks to legacy systems - this creates confusion and technical debt
- If migration is needed, do it once and remove the old system
- **Delete deprecated folders/files** immediately - they contaminate future suggestions
- Example: Use ONLY `textbook_access` system, NOT both `textbook_access` AND `vinculaciones`

---

## Tech Stack

### Frontend
- **React 18** with hooks
- **Tailwind CSS** + **shadcn/ui** components
- **i18next** for internationalization
- **React Router** for navigation

### Backend
- **FastAPI** (Python)
- **MongoDB** with Motor (async)
- **JWT** authentication
- **RBAC** permission system

### Infrastructure
- Kubernetes deployment
- Supervisor for process management
- Hot reload enabled

---

## Key Personas

### 1. Super Admin
- Full access to all modules
- Manages roles and permissions
- System configuration

### 2. Store Admin
- Manages Unatienda (products, orders)
- Approves student link requests
- Manages schools

### 3. Parent/Guardian (User)
- Links students to schools
- Access private catalog for their students
- Uses ChipiWallet

### 4. Student (User)
- Views assigned textbooks
- Uses platform features

---

## Current Status

### ✅ Completed
- User authentication (JWT + Google OAuth partial)
- RBAC system
- Unatienda (store) base functionality
- Student linking flow (Textbook Access)
- ChipiWallet
- Admin user management
- Schools management
- Dynamic form configuration
- PinpanClub base structure
- **📦 Textbook Ordering System** (NEW - Jan 24, 2026)
  - Full-stack feature for ordering textbooks
  - User selection → total calculation → Monday.com integration
  - Admin dashboard with statistics
  - Partial submission support (order some now, some later)
- **🔄 Unified Orders Page** (Jan 24, 2026)
  - Merged legacy orders with textbook orders
  - Tabbed interface: "Pedidos de Textos" + "Otros Pedidos"
  - Fixed user confusion from separate order systems
- **🔧 Bug Fix: Expandable Order Details** (Jan 27, 2026)
  - Fixed "+X más" button that wasn't clickable
  - Users can now expand/collapse to see full order items
- **📍 UX Improvement: Moved Textos to Unatienda** (Jan 27, 2026)
  - Removed "Textos" tab from "Mi Cuenta"
  - Added "Mis Pedidos" tab inside Unatienda's "Textos Escolares" section
  - Better UX: users find textbook ordering directly in the store
- **🧹 Code Standards Fix** (Jan 27, 2026)
  - Fixed Spanish terms in code: `?tab=privado` → `?tab=private`
  - Fixed internal state: `activeView='privado'` → `activeView='private'`
  - Fixed backend: `cliente_id` → `user_id` fallback in catalogo_privado.py

### 🔄 In Progress
- **Frontend for Student Profile Locking & School Year Config** - Backend ready, UI pending
- See **ROADMAP.md** for prioritized tasks

### ❌ Known Issues
- Google Sign-Up infinite loop (recurring)
- Admin sidebar modules may disappear after login (intermittent)
- See **ROADMAP.md** for details

### 🗑️ Cleanup Done (Jan 24, 2026)
- Removed temporary debug endpoint `/api/store/textbook-orders/debug/orders-check`
- Removed redundant file `/app/frontend/src/modules/unatienda/tabs/TextbookAccessAdminTab.jsx`

---

*Last Updated: January 27, 2026*
*Version: 3.3 - Code Standards Fix (English-First)*
