# ChipiLink - Architecture & Naming Standards

## Overview
This document defines the standard architecture and naming conventions for the ChipiLink project.
All future development MUST follow these standards.

---

## 1. DATABASE COLLECTIONS

### Naming Convention
- **Format:** `{module}_{entity}` (English, snake_case)
- **Examples:** `auth_users`, `store_products`, `pinpanclub_players`

### Core Collections (Auth Module)

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `auth_users` | All authenticated users | `user_id`, `email`, `name`, `password_hash` |
| `auth_sessions` | Active sessions | `session_id`, `user_id`, `token` |

### User Module Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `user_profiles` | Extended profile data | `user_id`, `bio`, `avatar_url` |
| `user_roles` | Role assignments | `user_id`, `role_id` |
| `user_connections` | User relationships | `user_id`, `connected_user_id`, `type` |
| `user_capacities` | User capabilities | `user_id`, `capacity_id` |

### Store Module Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `store_products` | Products catalog | `product_id`, `name`, `price` |
| `store_orders` | Orders | `order_id`, `user_id`, `status` |
| `store_schools` | Schools for textbook access | `school_id`, `name`, `catalog_id` |
| `store_students` | Linked students | `student_id`, `user_id`, `school_id` |
| `store_form_configs` | Dynamic form configurations | `form_type`, `fields` |

### Wallet Module Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `wallet_wallets` | User wallets | `wallet_id`, `user_id`, `balance` |
| `wallet_transactions` | Transaction history | `transaction_id`, `wallet_id`, `amount` |

### DEPRECATED Collections (To Remove)

| Collection | Migrate To | Status |
|------------|------------|--------|
| `usuarios` | `auth_users` | ❌ DELETE |
| `clientes` | `auth_users` | ❌ DELETE |
| `vinculaciones` | `store_students` | ❌ DELETE |
| `estudiantes_sincronizados` | `store_students` | ⚠️ REVIEW |
| `users_profiles` | `user_profiles` | ⚠️ RENAME |
| `schools` | `store_schools` | ⚠️ RENAME |
| `textbook_access_students` | `store_students` | ⚠️ RENAME |
| `form_field_configs` | `store_form_configs` | ⚠️ RENAME |

---

## 2. FRONTEND STRUCTURE

### Module Organization

```
/app/frontend/src/modules/
│
├── /admin/                      # Administrative panels (backoffice)
│   ├── AdminLayout.jsx          # Shared admin layout
│   ├── /users/                  # User management
│   │   ├── UsersModule.jsx      # Main module entry
│   │   ├── /components/
│   │   │   ├── StudentRequestsTab.jsx
│   │   │   ├── AllStudentsTab.jsx
│   │   │   ├── SchoolsManagementTab.jsx
│   │   │   ├── FormFieldsConfigTab.jsx
│   │   │   └── ConnectionsManagementTab.jsx
│   │   └── /hooks/
│   │
│   ├── /store/                  # Store management
│   │   ├── StoreModule.jsx
│   │   └── /components/
│   │
│   └── /settings/               # System settings
│
├── /account/                    # User's personal portal
│   ├── AccountLayout.jsx
│   ├── /profile/                # User profile
│   │   └── ProfilePage.jsx
│   │
│   ├── /linking/                # Student linking (Compra Exclusiva)
│   │   ├── LinkingPage.jsx
│   │   └── /components/
│   │       └── LinkStudentDialog.jsx
│   │
│   ├── /wallet/                 # ChipiWallet
│   │   └── WalletPage.jsx
│   │
│   └── /connections/            # User connections
│       └── ConnectionsPage.jsx
│
├── /store/                      # Public store
│   ├── StorePage.jsx
│   ├── ProductPage.jsx
│   └── CartPage.jsx
│
├── /auth/                       # Authentication
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── ForgotPasswordPage.jsx
│
└── /shared/                     # Shared components across modules
    ├── /components/
    └── /hooks/
```

### DEPRECATED Folders (To Migrate)

| Current | Migrate To | Action |
|---------|------------|--------|
| `/modules/customers/` | `/modules/admin/users/` | MOVE + RENAME |
| `/modules/users/` | `/modules/account/` | MOVE + RENAME |
| `/modules/unatienda/` | `/modules/admin/store/` | REVIEW + MERGE |

---

## 3. BACKEND STRUCTURE

### Module Organization

```
/app/backend/modules/
│
├── /auth/                       # Authentication & authorization
│   ├── models.py
│   ├── service.py
│   ├── routes.py
│   └── /repositories/
│
├── /users/                      # User management
│   ├── models/
│   │   ├── user.py
│   │   ├── profile.py
│   │   └── connection.py
│   ├── services/
│   │   ├── user_service.py
│   │   ├── profile_service.py
│   │   └── connection_service.py
│   ├── routes/
│   │   ├── user_routes.py
│   │   └── connection_routes.py
│   └── repositories/
│
├── /store/                      # Store & textbook access
│   ├── models/
│   │   ├── product.py
│   │   ├── order.py
│   │   ├── school.py
│   │   ├── student.py
│   │   └── form_config.py
│   ├── services/
│   ├── routes/
│   └── repositories/
│
├── /wallet/                     # Wallet & transactions
│   ├── models/
│   ├── services/
│   ├── routes/
│   └── repositories/
│
└── /roles/                      # RBAC system
    ├── models.py
    ├── service.py
    └── routes.py
```

---

## 4. API ENDPOINTS

### Naming Convention
- **Format:** `/api/{module}/{resource}/{action}`
- **Use:** kebab-case for URLs, English only

### Auth Module
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### Users Module (Admin)
```
GET    /api/admin/users                    # List all users
GET    /api/admin/users/{user_id}          # Get user details
PUT    /api/admin/users/{user_id}          # Update user
DELETE /api/admin/users/{user_id}          # Deactivate user
GET    /api/admin/users/{user_id}/students # Get user's students
```

### Store Module
```
# Public
GET    /api/store/products
GET    /api/store/schools

# User (requires auth)
GET    /api/store/my-students
POST   /api/store/students
PUT    /api/store/students/{student_id}
DELETE /api/store/students/{student_id}

# Admin
GET    /api/store/admin/all-students
GET    /api/store/admin/pending-requests
POST   /api/store/admin/approve/{student_id}
POST   /api/store/admin/schools
PUT    /api/store/admin/schools/{school_id}
```

### Account Module (User's own data)
```
GET    /api/account/profile
PUT    /api/account/profile
GET    /api/account/connections
POST   /api/account/connections
GET    /api/account/wallet
```

---

## 5. FIELD NAMING STANDARDS

### User Fields
| English (Standard) | Spanish (Deprecated) |
|--------------------|---------------------|
| `user_id` | `cliente_id` ❌ |
| `name` | `nombre` ❌ |
| `email` | `correo` ❌ |
| `phone` | `telefono` ❌ |
| `password_hash` | `contrasena` ❌ |
| `is_active` | `activo` ❌ |
| `created_at` | `fecha_creacion` ❌ |

### Student Fields
| English (Standard) | Spanish (Deprecated) |
|--------------------|---------------------|
| `student_id` | `estudiante_id` ❌ |
| `full_name` | `nombre_completo` ❌ |
| `grade` | `grado` ❌ |
| `school_id` | `colegio_id` ❌ |
| `relation_type` | `tipo_relacion` ❌ |
| `status` | `estado` ❌ |

---

## 6. MIGRATION CHECKLIST

### Phase 1: Documentation ✅
- [x] Create ARCHITECTURE.md
- [x] Define naming standards
- [x] Map current → target structure

### Phase 2: Database Cleanup
- [ ] Rename `users_profiles` → `user_profiles`
- [ ] Rename `schools` → `store_schools`
- [ ] Rename `textbook_access_students` → `store_students`
- [ ] Rename `form_field_configs` → `store_form_configs`
- [ ] Delete empty/unused collections
- [ ] Update all backend references

### Phase 3: Frontend Restructure
- [ ] Create `/modules/admin/` folder
- [ ] Move `customers/` → `admin/users/`
- [ ] Create `/modules/account/` folder
- [ ] Move `users/` → `account/`
- [ ] Update all imports
- [ ] Update routes

### Phase 4: Backend Cleanup
- [ ] Remove deprecated field references (`cliente_id`, etc.)
- [ ] Standardize API endpoints
- [ ] Update service layer

### Phase 5: Testing & Verification
- [ ] Test all admin functions
- [ ] Test all user functions
- [ ] Test API endpoints
- [ ] Verify database integrity

---

## 7. RULES FOR FUTURE DEVELOPMENT

1. **English-First**: All code (variables, functions, collections) in English
2. **Module Prefix**: Database collections must have module prefix
3. **Consistent Naming**: Follow the patterns defined above
4. **No Duplicates**: One collection per entity type
5. **Document Changes**: Update this file when adding new modules/collections

---

*Last Updated: January 23, 2026*
*Version: 1.0*
