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

### Phase 1-5z (Complete)
See CHANGELOG.md for full history of all phases.

### Phase 6a - Critical Order Submission NameError Fix (Complete - Feb 20, 2026)
- **Root Cause**: `textbook_order_service.py` line 720 used undefined variable `year` instead of `current_year` in `create_and_submit_order` method (step 8b: update draft order)
- **Impact**: NameError occurred AFTER wallet was charged and order was created, causing user to see error despite order being successful. On retry, "Insufficient wallet balance" because wallet was already charged.
- **Backend Fix 1**: Changed `year` → `current_year` at line 720
- **Backend Fix 2**: Wrapped steps 8 (stock deduction) and 8b (draft order update) in try/except blocks so post-order-creation errors are non-blocking
- **Backend Fix 3**: Changed wallet insufficient error message to Spanish ("Saldo insuficiente. Disponible: $X, Requerido: $Y")
- **Frontend Fix 1**: Both SchoolTextbooksView.jsx and TextbookOrderView.jsx now refresh wallet balance from API before submitting order (prevents stale data)
- **Frontend Fix 2**: Both views refresh wallet balance on error too (in case wallet was charged before error)
- **Frontend Fix 3**: Added timeout: 30000 to SchoolTextbooksView submit call
- Testing: 100% pass rate (15/15 tests)

## Upcoming Tasks
- **(P1)** Abstract the progress icon system into a global resource
- **(P2)** Implement a "Stop" button for the full Monday.com sync operation

## Future/Backlog Tasks
- **(P3)** On-demand landing page redesign tool
- **(P4)** Extend Monday.com sync to general product inventory
- **(P5)** Push notifications for student access requests

## Configuration
- **CRM Board ID**: 5931665026 (Admin Customers board)
- **Email Column**: `email`
- Monday.com API Token: configured in backend/.env
