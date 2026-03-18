# Librería Escolar - Textbook Store Application

## Original Problem Statement
Build an app to sell textbooks online which includes:
1. Product Management: Add, edit, manage textbook products by grade and subject with inventory tracking
2. Customer Profiles: Parent accounts with multiple student profiles (names, grades, schools)
3. Order Form: Easy ordering by student grade with auto-fill support
4. Order and Inventory Dashboard: Admin area for orders, products, stock, low inventory alerts
5. Print Order Receipts: Thermal printer formatted receipts (80mm)
6. Monday.com Integration: Auto-send orders to designated board
7. Embed Form: Order form embeddable as iframe/widget
8. Design: Clean, responsive, bilingual (Chinese/Spanish)

## Architecture

### Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Emergent Google OAuth

### Database Collections
- `clientes` - Customer/parent accounts with nested student profiles
- `libros` - Textbook products with inventory
- `pedidos` - Orders with items, status, payment info
- `user_sessions` - OAuth session management

### Key Endpoints
- `/api/auth/*` - Authentication (login, register, Google OAuth)
- `/api/libros` - Public textbook catalog
- `/api/estudiantes` - Student profile management
- `/api/pedidos` - Order creation and history
- `/api/admin/*` - Admin product, inventory, order management
- `/api/grados`, `/api/materias` - Grade and subject metadata

## Tasks Completed
1. ✅ Backend server with all CRUD operations
2. ✅ MongoDB models with Spanish naming convention
3. ✅ JWT + Google OAuth authentication
4. ✅ Multi-language support (zh/es) with auto-detect and toggle
5. ✅ Dark/Light theme with system preference detection
6. ✅ Landing page with bento grid design
7. ✅ Product catalog with grade/subject filters
8. ✅ Parent dashboard with student management
9. ✅ Order form with cart and payment selection
10. ✅ Admin dashboard with tabs (Overview, Products, Orders, Inventory)
11. ✅ Low stock alerts system
12. ✅ Thermal print receipt format
13. ✅ Embeddable order form at /embed/orden
14. ✅ Monday.com integration (needs API key)
15. ✅ Sample data seeding (8 textbooks)

## Pending Tasks / Next Phase
1. Configure Monday.com API credentials
2. Set up Yappy Comercial payment gateway
3. Add email notification system
4. Implement order status email updates
5. Add bulk import for products
6. Multi-vendor support scaffolding

## Environment Variables Required
```
# Backend (.env)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET="your-secret-key"
MONDAY_API_KEY="your-monday-api-key"
MONDAY_BOARD_ID="your-board-id"

# Frontend (.env)
REACT_APP_BACKEND_URL="https://your-backend-url"
```

## Admin Access
- Email: admin@libreria.com
- Password: admin123
