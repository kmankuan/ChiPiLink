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
  Sistema de venta de libros de texto con:
  1. Registro de usuarios (padres/acudientes)
  2. Gestión de estudiantes con verificación de matrícula
  3. Compra de libros solo para estudiantes con matrícula confirmada
  4. Historial de compras persistente por año escolar
  5. Admin puede verificar matrículas (aprobar/rechazar)
  6. Formulario embebible como opción auxiliar

backend:
  - task: "Estudiante Model con Verificación de Matrícula"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Modelo actualizado con: nombre, apellido (separados), grado, es_nuevo, estado_matricula (pendiente/confirmada/rechazada), documento_matricula_url, ano_escolar, libros_comprados[]"

  - task: "API Gestión de Estudiantes"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Endpoints: GET/POST/PUT/DELETE /api/estudiantes, GET /api/estudiantes/{id}/libros-disponibles. Tested via curl and UI."

  - task: "API Verificación de Matrículas (Admin)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Endpoints: GET /api/admin/matriculas, GET /api/admin/matriculas-pendientes, PUT /api/admin/matriculas/{cliente_id}/{estudiante_id}/verificar?accion=aprobar|rechazar. Tested successfully."

  - task: "API Pedidos con Control de Matrícula"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/pedidos verifica matrícula confirmada, previene compra de libros duplicados, actualiza libros_comprados en estudiante."

  - task: "Notificaciones de Matrícula"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Crea notificaciones tipo 'matricula_pendiente' y 'matricula_verificada' para admin."

frontend:
  - task: "Dashboard Usuario - Gestión de Estudiantes"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Dashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Completamente reescrito. Incluye: lista de estudiantes, agregar/editar/eliminar, subida de documento de matrícula, estado de verificación visible, botón 'Comprar Libros' solo para confirmados."

  - task: "Dashboard Usuario - Compra de Libros"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Dashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Diálogo de compra muestra libros del grado con checkboxes, marca libros ya comprados como deshabilitados, calcula total, permite seleccionar método de pago."

  - task: "Admin Dashboard - Verificación de Matrículas"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/AdminDashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Nueva pestaña 'Matrículas' con: lista de matrículas, filtro por estado, vista detallada con imagen de documento, botones aprobar/rechazar."

  - task: "Formulario Embebible (Auxiliar)"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/EmbedOrderForm.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Mantenido como opción auxiliar en /embed/orden. Funciona independiente del sistema de matrículas."

  - task: "Admin - Configuración del Formulario"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/AdminDashboard.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Pestaña 'Formulario' permite configurar título, descripción, métodos de pago, colores. URL e iframe code disponibles para copiar."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "Dashboard Usuario - Gestión de Estudiantes"
    - "Dashboard Usuario - Compra de Libros"
    - "Admin Dashboard - Verificación de Matrículas"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      MAJOR FEATURE IMPLEMENTATION COMPLETE!
      
      Implementé el nuevo flujo solicitado por el usuario:
      
      1. REGISTRO Y GESTIÓN DE ESTUDIANTES:
         - Usuario registra estudiantes con: nombre, apellido, grado, tipo (nuevo/anterior), documento de matrícula
         - Estado inicial: "pendiente"
         - Admin recibe notificación de nueva matrícula
      
      2. VERIFICACIÓN DE MATRÍCULA (ADMIN):
         - Nueva pestaña "Matrículas" en admin dashboard
         - Lista de matrículas con filtro por estado
         - Vista detallada con imagen del documento
         - Botones para aprobar/rechazar
      
      3. COMPRA DE LIBROS (SOLO MATRICULADOS):
         - Botón "Comprar Libros" solo aparece si matrícula está confirmada
         - Muestra libros del grado del estudiante
         - Checkboxes para seleccionar (deshabilitados si ya comprados)
         - Total calculado automáticamente
         - Previene compra duplicada del mismo libro
      
      4. HISTORIAL:
         - Libros comprados se guardan en estudiante.libros_comprados[]
         - Persiste durante el año escolar
         - Visible en historial del estudiante
      
      CREDENCIALES DE PRUEBA:
      - Admin: admin@libreria.com / adminpassword
      - Usuario: juan.perez@test.com / password123
      - Estudiante de prueba: María Pérez García (4to Grado, matrícula confirmada)
      
      FLUJOS A PROBAR:
      1. Login como usuario -> Ver estudiante con matrícula confirmada -> Click "Comprar Libros" -> Seleccionar libros -> Confirmar
      2. Login como admin -> Matrículas -> Ver lista -> Filtrar por estado
      3. Registrar nuevo usuario -> Agregar estudiante -> Verificar que aparece en admin pendiente
