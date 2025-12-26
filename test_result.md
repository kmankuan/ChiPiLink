#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Full-stack textbook store application with:
  1. Embeddable order form (public, no auth required)
  2. Admin notification system
  3. CSV import/export for products
  4. Multi-grade book support
  5. Monday.com integration

backend:
  - task: "Public Order API (Embeddable Form)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented POST /api/public/pedido with new fields: nombre_acudiente, telefono_acudiente, email_acudiente, nombre_estudiante, apellido_estudiante, grado_estudiante, email_estudiante (optional), telefono_estudiante (optional). Creates notifications on new order and low stock."

  - task: "Public Books API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented GET /api/public/libros with multi-grade support. Books can be tagged with multiple grades (grado + grados array) and the endpoint searches both fields."

  - task: "Notifications API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented GET /api/admin/notificaciones, PUT /api/admin/notificaciones/{id}/leer, PUT /api/admin/notificaciones/leer-todas. Notifications are auto-created for new orders and low stock."

  - task: "Admin Login API"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tested via curl - admin login works. Credentials: admin@libreria.com / adminpassword"

frontend:
  - task: "Embeddable Order Form"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/EmbedOrderForm.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Rebuilt entire form with 3 sections: 1) Acudiente (guardian) - nombre, telefono, email. 2) Estudiante - nombre, apellido, grado, email/telefono (optional). 3) Book selection based on student grade. Cart summary sticky on right. Form validation and submission to /api/public/pedido."

  - task: "Admin Notification Bar"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/layout/NotificationBar.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Component exists and shows in admin dashboard. Displays notification counts by type, settings dropdown, and notification list popover."

  - task: "CSV Import"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/AdminDashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Installed papaparse dependency (was missing). UI exists in AdminDashboard. Needs testing to verify full functionality."

  - task: "Admin Login Flow"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Login.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Fixed CORS issue - removed withCredentials from AuthContext. Login now redirects to /admin for admin users."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Public Order API (Embeddable Form)"
    - "Embeddable Order Form"
    - "Notifications API"
    - "Admin Notification Bar"
    - "CSV Import"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Testing Agent - Please test the following features:
      
      1. EMBEDDABLE ORDER FORM (http://localhost:3000/embed/orden):
         - Fill guardian section: nombre completo, telefono, email (all required)
         - Fill student section: nombre, apellido, grado (required), email/telefono (optional)
         - Select a grade to load books
         - Add books to cart
         - Verify total calculation
         - Submit order and verify success message
         
      2. ADMIN NOTIFICATION BAR:
         - Login as admin: admin@libreria.com / adminpassword
         - Go to /admin
         - Verify notification bar shows at top
         - After submitting a public order, refresh admin page
         - Verify new order notification appears
         
      3. CSV IMPORT (Admin Dashboard):
         - Go to Productos tab
         - Click "Importar CSV" button
         - Verify papaparse library loads (no console errors)
         
      4. PUBLIC BOOKS API:
         - Test: GET /api/public/libros
         - Test: GET /api/public/libros?grado=1
         - Should return books filtered by grade
         
      5. NOTIFICATIONS API:
         - Test: GET /api/admin/notificaciones (with auth)
         - Should return notifications array with counts
