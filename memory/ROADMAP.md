# ChipiLink - Product Roadmap

## Current Status: MVP Complete ✅

---

## ✅ Recently Completed

### ✅ Sistema de Pedidos de Textos (Enero 24, 2026)
- Lista de libros por grado con selección checkbox
- Cálculo de total en tiempo real
- Envío a Monday.com
- Sistema de recompra con aprobación admin
- Dashboard admin con estadísticas
- **21 tests pasados**

---

## P0 - Critical / In Progress

### 🔴 Google Sign-Up Fix
- **Issue**: Infinite loop during Google OAuth
- **Status**: Not Started
- **Priority**: HIGH (blocks user registration)

---

## P1 - High Priority

### 🟠 OneSignal Push Notifications
- **Description**: Send notifications when student link status changes or textbook order status updates
- **Status**: Planned
- **Dependencies**: OneSignal account setup

### ~~🟠 "Already Ordered" Indicator~~ ✅ DONE
- ~~Mark books as already ordered to avoid duplicates~~
- Implemented in Textbook Orders system (status: "ordered")

---

## P2 - Medium Priority

### 🟡 Stripe Payment Integration
- **Description**: Accept payments for memberships
- **Status**: Planned
- **Dependencies**: Stripe account, API keys

### 🟡 Google Sheets Integration
- **Description**: Import book data from Google Sheets
- **Status**: Planned

---

## P3 - Low Priority / Future

### 🔵 ChipiPoints System
- Payment method using accumulated points

### 🔵 Teams/Clans System
- Collective rewards for groups

### 🔵 Email Notifications
- Send emails for critical events (role changes, etc.)

### 🔵 Re-purchase Request System
- Handle textbook re-purchase requests

### 🔵 Landing Page Templates
- Pre-designed block templates

---

## Backlog (Not Prioritized)

- Multi-tenant support
- Advanced reporting dashboard
- Mobile app (React Native)
- API rate limiting
- Audit logging system

---

*Last Updated: January 23, 2026*
