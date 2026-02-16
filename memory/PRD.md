# ChiPi Link - PRD

## Original Problem Statement
Build and enhance a community/school management platform (ChiPi Link) with features including:
- Textbook ordering and inventory management synced with Monday.com
- Student registration and enrollment management
- Admin panel for managing products, orders, students, and configurations
- Community features (feed, clubs, events)
- Payment/wallet system
- Multi-language support (ES/EN/ZH)

## Core Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Monday.com API v2, Google Photos, Gmail, Telegram Bot, OpenAI, Anthropic, Lottie

## What's Been Implemented

### Phase 1 - Core Platform (Complete)
- Authentication (OAuth + admin login)
- Student management with enrollment workflows
- Textbook catalog and ordering system
- Monday.com inventory sync
- Admin panel with dashboard

### Phase 2 - Enhanced Admin (Complete)
- Progress-based status icon system with 4 themes
- Unatienda UI reorganization (grouped tabs: CATALOG, ORDERS, SCHOOL, SETTINGS)
- Feature-rich Students table (sorting, pagination, compact layout, inline pre-sale toggle)
- Monday.com pre-sale order import with suggestion-based linking

### Phase 3 - CRM Chat System (Complete - Feb 2026)
- **Multi-topic CRM Chat** backed by Monday.com Admin Customers board
  - Each student linked to a CRM item via email (auto-linking)
  - Topics = Monday.com Updates, Messages = Replies
  - Support for creating new topics, replying to existing ones
  - Quick subject selection for common topics
- **Admin Messages Hub** - centralized inbox in Unatienda module
  - Shows all customer conversations with unread indicators
  - Search by student name or email
  - CRM board configuration panel (Board ID, email column)
- **Chat integration points**:
  - Textbook Orders admin tab (chat icon per order)
  - Students admin tab (chat icon per student)
  - Messages admin tab (centralized inbox)
  - Client Orders page (Support button)
- **Push Notifications** via Monday.com webhooks
  - Webhook endpoint receives update events from CRM board
  - Creates in-app notifications for linked client users
  - Unread badge counts on Support buttons and admin inbox
  - One-click webhook registration from admin config panel
  - Mark-as-read functionality for both clients and admin

## Key Data Models
- `crm_student_links` - Maps student_id to monday_item_id for CRM linking
- `crm_chat_messages` - Local message records (topics, replies, read status)
- `stock_orders` - Orders with statuses including `awaiting_link`, `awaiting_suggestion`
- `store_students` - Students with `presale_enabled` field

## Key API Endpoints

### CRM Chat (New)
- `GET /api/store/crm-chat/{student_id}/topics` - Client: get topics
- `POST /api/store/crm-chat/{student_id}/topics` - Client: create topic
- `POST /api/store/crm-chat/{student_id}/topics/{update_id}/reply` - Client: reply
- `GET /api/store/crm-chat/admin/inbox` - Admin: all conversations
- `GET /api/store/crm-chat/admin/{student_id}/topics` - Admin: student topics
- `POST /api/store/crm-chat/admin/{student_id}/topics` - Admin: create topic
- `POST /api/store/crm-chat/admin/{student_id}/topics/{update_id}/reply` - Admin: reply
- `GET/PUT /api/store/crm-chat/admin/config` - CRM board configuration
- `GET /api/store/crm-chat/admin/config/board-columns` - Get board columns

### Pre-Sale Import
- `GET /api/admin/monday-import/preview-import`
- `POST /api/admin/monday-import/trigger-import`
- `GET /api/admin/presale-orders`
- `POST /api/admin/presale-orders/{id}/confirm-suggestion`
- `POST /api/admin/presale-orders/{id}/reject-suggestion`
- `POST /api/admin/presale-orders/{id}/unlink`

## Prioritized Backlog

### P1 - Global Progress Icon System
Abstract the progress icon system from landing page-specific components into a truly global resource.

### P2 - Stop Button for Monday.com Sync
Add a cancellable background task with a "Stop" button for the full Monday.com sync operation.

### P3 - On-demand Landing Page Redesign Tool
Build an admin panel tool for on-demand landing page redesign.

### P4 - General Inventory Monday.com Sync
Extend synchronization to general product inventory.

## Configuration
- **CRM Board ID**: 5931665026 (Admin Customers board)
- **Email Column**: `email`
- Monday.com API Token: configured in backend/.env
