# Multi-Vendor Architecture & Yappy Integration

## Overview
This document describes the multi-vendor e-commerce architecture with Yappy Comercial payment integration.

## Store Types

### 1. Platform Store ("Unatienda")
- Exclusive store owned by the platform
- Uses platform's Yappy Comercial credentials
- Managed by super admins
- Module: `/app/frontend/src/modules/platform-store/`

### 2. Vendor Stores
- Each vendor can create their own store
- Each vendor configures their own Yappy Comercial
- Team roles with different privilege levels
- Admin can manage any vendor store

## Database Schema

### Collections

#### vendors
```json
{
  "vendor_id": "string (UUID)",
  "nombre": "string",
  "slug": "string (URL-friendly)",
  "descripcion": "string",
  "logo_url": "string",
  "banner_url": "string",
  "estado": "pendiente | aprobado | suspendido | rechazado",
  "fecha_registro": "datetime",
  "fecha_aprobacion": "datetime",
  "propietario_id": "string (user_id)",
  "configuracion": {
    "campos_requeridos": ["nombre", "email", "telefono"],
    "comision_activa": false,
    "porcentaje_comision": 0,
    "yappy_configurado": false
  },
  "contacto": {
    "email": "string",
    "telefono": "string",
    "direccion": "string"
  },
  "redes_sociales": {
    "facebook": "string",
    "instagram": "string",
    "whatsapp": "string"
  }
}
```

#### vendor_payment_config
```json
{
  "vendor_id": "string",
  "yappy": {
    "merchant_id": "string (encrypted)",
    "secret_key": "string (encrypted)",
    "url_domain": "string",
    "activo": false,
    "ambiente": "pruebas | produccion"
  },
  "otros_metodos": {
    "transferencia_bancaria": {
      "activo": false,
      "datos": {}
    }
  },
  "fecha_actualizacion": "datetime"
}
```

#### vendor_team_members
```json
{
  "team_member_id": "string (UUID)",
  "vendor_id": "string",
  "user_id": "string",
  "rol": "propietario | administrador | vendedor | soporte",
  "permisos": {
    "gestionar_productos": true,
    "gestionar_pedidos": true,
    "gestionar_configuracion": false,
    "gestionar_equipo": false,
    "ver_reportes": true,
    "gestionar_pagos": false
  },
  "estado": "activo | inactivo",
  "fecha_ingreso": "datetime"
}
```

#### vendor_products
```json
{
  "producto_id": "string (UUID)",
  "vendor_id": "string",
  "nombre": "string",
  "descripcion": "string",
  "precio": "number",
  "precio_descuento": "number | null",
  "imagenes": ["string"],
  "categoria": "string",
  "subcategoria": "string",
  "inventario": "number",
  "activo": true,
  "destacado": false,
  "fecha_creacion": "datetime"
}
```

#### platform_config
```json
{
  "config_key": "vendor_settings",
  "value": {
    "registro_libre": true,
    "requiere_aprobacion": true,
    "comision_global_activa": false,
    "comision_global_porcentaje": 5,
    "campos_vendor_requeridos": {
      "nombre": { "requerido": true, "activo": true },
      "email": { "requerido": true, "activo": true },
      "telefono": { "requerido": false, "activo": true },
      "direccion": { "requerido": false, "activo": true },
      "logo": { "requerido": false, "activo": true },
      "descripcion": { "requerido": false, "activo": true }
    }
  }
}
```

## API Endpoints

### Platform Store (Unatienda)
- `GET /api/platform-store` - Get platform store info
- `GET /api/platform-store/products` - Get platform products
- `POST /api/platform-store/orders` - Create order
- `POST /api/platform-store/yappy/validate` - Validate Yappy merchant
- `POST /api/platform-store/yappy/create-order` - Create Yappy order
- `GET /api/platform-store/yappy/ipn` - IPN callback

### Vendor Management (Admin)
- `GET /api/admin/vendors` - List all vendors
- `GET /api/admin/vendors/:id` - Get vendor details
- `PUT /api/admin/vendors/:id` - Update vendor
- `PUT /api/admin/vendors/:id/status` - Change vendor status
- `DELETE /api/admin/vendors/:id` - Delete vendor
- `POST /api/admin/vendors` - Create vendor directly
- `GET /api/admin/vendor-settings` - Get vendor registration settings
- `PUT /api/admin/vendor-settings` - Update vendor registration settings

### Vendor Portal
- `POST /api/vendors/register` - Register as vendor
- `GET /api/vendors/me` - Get my vendor profile
- `PUT /api/vendors/me` - Update my vendor profile
- `GET /api/vendors/me/products` - Get my products
- `POST /api/vendors/me/products` - Add product
- `PUT /api/vendors/me/products/:id` - Update product
- `DELETE /api/vendors/me/products/:id` - Delete product
- `GET /api/vendors/me/orders` - Get my orders
- `GET /api/vendors/me/team` - Get team members
- `POST /api/vendors/me/team` - Add team member
- `PUT /api/vendors/me/team/:id` - Update team member
- `DELETE /api/vendors/me/team/:id` - Remove team member
- `GET /api/vendors/me/payment-config` - Get payment config
- `PUT /api/vendors/me/payment-config/yappy` - Configure Yappy

### Public Vendor Store
- `GET /api/stores/:slug` - Get store by slug
- `GET /api/stores/:slug/products` - Get store products
- `POST /api/stores/:slug/orders` - Create order in store

## Team Roles & Permissions

| Permission | Propietario | Administrador | Vendedor | Soporte |
|------------|-------------|---------------|----------|---------|
| Gestionar productos | ✅ | ✅ | ✅ | ❌ |
| Gestionar pedidos | ✅ | ✅ | ✅ | ✅ |
| Gestionar configuración | ✅ | ✅ | ❌ | ❌ |
| Gestionar equipo | ✅ | ❌ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ✅ |
| Gestionar pagos | ✅ | ✅ | ❌ | ❌ |

## Yappy Integration Flow

### 1. Validate Merchant (Backend)
```
POST https://apipagosbg.bgeneral.cloud/payments/validate/merchant
Headers: Content-Type: application/json
Body: { merchantId, urlDomain }
Response: { status, body: { token, epochTime } }
```

### 2. Create Order (Backend)
```
POST https://apipagosbg.bgeneral.cloud/payments/payment-wc
Headers: Authorization: {token}, Content-Type: application/json
Body: { merchantId, orderId, domain, paymentDate, aliasYappy, ipnUrl, discount, taxes, subtotal, total }
Response: { status, body: { transactionId, token, documentName } }
```

### 3. Frontend Button
```html
<script src="https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js"></script>
<yappy-btn theme="blue" rounded="true"></yappy-btn>
```

### 4. IPN Callback
```
GET /api/yappy/ipn?orderId=xxx&Hash=xxx&status=E|R|C|X&domain=xxx
Status: E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado
```

## File Structure

```
/app/
├── backend/
│   ├── routes/
│   │   ├── platform_store.py
│   │   ├── vendors.py
│   │   └── yappy.py
│   ├── services/
│   │   ├── yappy_service.py
│   │   └── vendor_service.py
│   └── models/
│       └── vendor_models.py
├── frontend/
│   └── src/
│       └── modules/
│           ├── platform-store/
│           │   ├── PlatformStore.jsx
│           │   ├── PlatformProducts.jsx
│           │   └── PlatformCheckout.jsx
│           ├── vendors/
│           │   ├── VendorDashboard.jsx
│           │   ├── VendorProducts.jsx
│           │   ├── VendorOrders.jsx
│           │   ├── VendorTeam.jsx
│           │   └── VendorSettings.jsx
│           └── yappy/
│               ├── YappyButton.jsx
│               └── YappyConfig.jsx
```
