import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  es: {
    translation: {
      // Navigation
      nav: {
        home: "Inicio",
        catalog: "Catálogo",
        orders: "Mis Pedidos",
        students: "Estudiantes",
        profile: "Perfil",
        admin: "Administración",
        login: "Iniciar Sesión",
        register: "Registrarse",
        logout: "Cerrar Sesión"
      },
      // Landing Page
      landing: {
        hero: {
          title: "Libros de Texto para el Éxito Académico",
          subtitle: "Encuentre todos los libros que sus hijos necesitan, organizados por grado y materia",
          cta: "Comenzar",
          ctaAdmin: "Acceso Administrador"
        },
        features: {
          easy: "Fácil de Ordenar",
          easyDesc: "Seleccione el grado de su hijo y vea todos los libros necesarios",
          fast: "Envío Rápido",
          fastDesc: "Reciba sus libros en tiempo para el inicio de clases",
          support: "Soporte",
          supportDesc: "Atención personalizada para todas sus consultas"
        },
        whyUs: "¿Por qué elegirnos?",
        benefits: {
          prices: "Precios competitivos",
          original: "Libros originales",
          shipping: "Envío a todo el país",
          support: "Atención personalizada"
        },
        allGrades: "Todos los Grados",
        fromPreschool: "Desde preescolar hasta bachillerato",
        buyEasy: "Comprar nunca fue tan fácil",
        buyEasyDesc: "Simplificamos el proceso de compra de libros escolares para que pueda enfocarse en lo importante: la educación de sus hijos.",
        readyToOrder: "¿Listo para ordenar?",
        readyToOrderDesc: "Cree su cuenta hoy y obtenga acceso a todos los libros de texto organizados por grado. Agregue sus estudiantes y ordene en minutos.",
        viewCatalog: "Ver Catálogo"
      },
      // Auth
      auth: {
        login: "Iniciar Sesión",
        register: "Crear Cuenta",
        email: "Correo Electrónico",
        password: "Contraseña",
        name: "Nombre Completo",
        phone: "Teléfono",
        address: "Dirección",
        forgotPassword: "¿Olvidó su contraseña?",
        noAccount: "¿No tiene cuenta?",
        hasAccount: "¿Ya tiene cuenta?",
        loginWithGoogle: "Continuar con Google",
        orContinueWith: "o continúe con"
      },
      // Dashboard
      dashboard: {
        welcome: "Bienvenido",
        myStudents: "Mis Estudiantes",
        addStudent: "Agregar Estudiante",
        myOrders: "Mis Pedidos",
        orderTextbooks: "Ordenar Libros",
        recentOrders: "Pedidos Recientes",
        noStudents: "No tiene estudiantes registrados",
        noOrders: "No tiene pedidos aún"
      },
      // Students
      student: {
        name: "Nombre del Estudiante",
        grade: "Grado",
        school: "Escuela",
        notes: "Notas",
        addStudent: "Agregar Estudiante",
        editStudent: "Editar Estudiante",
        deleteStudent: "Eliminar Estudiante",
        confirmDelete: "¿Está seguro de eliminar este estudiante?"
      },
      // Catalog
      catalog: {
        title: "Catálogo de Libros",
        filterByGrade: "Filtrar por Grado",
        filterBySubject: "Filtrar por Materia",
        allGrades: "Todos los Grados",
        allSubjects: "Todas las Materias",
        addToCart: "Agregar al Carrito",
        inStock: "En Stock",
        lowStock: "Pocas Unidades",
        outOfStock: "Agotado",
        price: "Precio"
      },
      // Order Form
      order: {
        title: "Formulario de Pedido",
        selectStudent: "Seleccionar Estudiante",
        booksForGrade: "Libros para",
        quantity: "Cantidad",
        subtotal: "Subtotal",
        total: "Total",
        paymentMethod: "Método de Pago",
        bankTransfer: "Transferencia Bancaria",
        yappy: "Yappy",
        notes: "Notas del Pedido",
        placeOrder: "Realizar Pedido",
        orderSuccess: "¡Pedido realizado exitosamente!",
        orderNumber: "Número de Pedido"
      },
      // Payment
      payment: {
        bankInfo: "Información Bancaria",
        bankName: "Banco General",
        accountType: "Cuenta Corriente",
        accountNumber: "Número de Cuenta",
        accountHolder: "Titular de la Cuenta",
        instructions: "Instrucciones de Pago",
        instructionsText: "Realice la transferencia y envíe el comprobante a nuestro correo para confirmar su pago",
        yappyInfo: "Pago con Yappy",
        yappyInstructions: "Será redirigido a Yappy para completar su pago"
      },
      // Admin
      admin: {
        dashboard: "Panel de Administración",
        products: "Productos",
        inventory: "Inventario",
        orders: "Pedidos",
        addProduct: "Agregar Producto",
        editProduct: "Editar Producto",
        deleteProduct: "Eliminar Producto",
        lowStockAlerts: "Alertas de Bajo Stock",
        confirmPayment: "Confirmar Pago",
        updateStatus: "Actualizar Estado",
        printReceipt: "Imprimir Recibo",
        totalProducts: "Total Productos",
        pendingOrders: "Pedidos Pendientes",
        confirmedOrders: "Pedidos Confirmados"
      },
      // Order Status
      status: {
        pending: "Pendiente",
        confirmed: "Confirmado",
        preparing: "Preparando",
        shipped: "Enviado",
        delivered: "Entregado",
        cancelled: "Cancelado",
        // Spanish backend status keys
        pendiente: "Pendiente",
        confirmado: "Confirmado",
        preparando: "Preparando",
        enviado: "Enviado",
        entregado: "Entregado",
        cancelado: "Cancelado"
      },
      // Common
      common: {
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        add: "Agregar",
        search: "Buscar",
        loading: "Cargando...",
        error: "Error",
        success: "Éxito",
        confirm: "Confirmar",
        back: "Volver",
        next: "Siguiente",
        previous: "Anterior",
        close: "Cerrar",
        noResults: "Sin resultados"
      },
      // Grades
      grades: {
        preescolar: "Preescolar",
        "1": "1er Grado",
        "2": "2do Grado",
        "3": "3er Grado",
        "4": "4to Grado",
        "5": "5to Grado",
        "6": "6to Grado",
        "7": "7mo Grado",
        "8": "8vo Grado",
        "9": "9no Grado",
        "10": "10mo Grado",
        "11": "11vo Grado",
        "12": "12vo Grado"
      },
      // Subjects
      subjects: {
        matematicas: "Matemáticas",
        espanol: "Español",
        ciencias: "Ciencias",
        sociales: "Estudios Sociales",
        ingles: "Inglés",
        arte: "Arte",
        musica: "Música",
        educacion_fisica: "Educación Física",
        tecnologia: "Tecnología",
        religion: "Religión"
      }
    }
  },
  zh: {
    translation: {
      // Navigation
      nav: {
        home: "首页",
        catalog: "目录",
        orders: "我的订单",
        students: "学生",
        profile: "个人资料",
        admin: "管理",
        login: "登录",
        register: "注册",
        logout: "退出"
      },
      // Landing Page
      landing: {
        hero: {
          title: "助力学业成功的教科书",
          subtitle: "按年级和科目查找您孩子需要的所有教科书",
          cta: "开始使用",
          ctaAdmin: "管理员登录"
        },
        features: {
          easy: "轻松订购",
          easyDesc: "选择孩子的年级，查看所需的所有教科书",
          fast: "快速配送",
          fastDesc: "确保在开学前收到您的教科书",
          support: "客户支持",
          supportDesc: "为您的所有问题提供个性化服务"
        },
        whyUs: "为什么选择我们？",
        benefits: {
          prices: "价格实惠",
          original: "正版书籍",
          shipping: "全国配送",
          support: "个性化服务"
        },
        allGrades: "所有年级",
        fromPreschool: "从学前班到高中",
        buyEasy: "购买从未如此简单",
        buyEasyDesc: "我们简化了购买学校书籍的流程，让您可以专注于最重要的事情：孩子的教育。",
        readyToOrder: "准备好订购了吗？",
        readyToOrderDesc: "立即创建账户，获取按年级分类的所有教科书。添加您的学生，几分钟内完成订购。",
        viewCatalog: "查看目录"
      },
      // Auth
      auth: {
        login: "登录",
        register: "创建账户",
        email: "电子邮箱",
        password: "密码",
        name: "全名",
        phone: "电话",
        address: "地址",
        forgotPassword: "忘记密码？",
        noAccount: "没有账户？",
        hasAccount: "已有账户？",
        loginWithGoogle: "使用 Google 继续",
        orContinueWith: "或继续使用"
      },
      // Dashboard
      dashboard: {
        welcome: "欢迎",
        myStudents: "我的学生",
        addStudent: "添加学生",
        myOrders: "我的订单",
        orderTextbooks: "订购教科书",
        recentOrders: "最近订单",
        noStudents: "没有注册的学生",
        noOrders: "还没有订单"
      },
      // Students
      student: {
        name: "学生姓名",
        grade: "年级",
        school: "学校",
        notes: "备注",
        addStudent: "添加学生",
        editStudent: "编辑学生",
        deleteStudent: "删除学生",
        confirmDelete: "确定要删除这个学生吗？"
      },
      // Catalog
      catalog: {
        title: "教科书目录",
        filterByGrade: "按年级筛选",
        filterBySubject: "按科目筛选",
        allGrades: "所有年级",
        allSubjects: "所有科目",
        addToCart: "加入购物车",
        inStock: "有库存",
        lowStock: "库存不足",
        outOfStock: "缺货",
        price: "价格"
      },
      // Order Form
      order: {
        title: "订单表格",
        selectStudent: "选择学生",
        booksForGrade: "教科书 - ",
        quantity: "数量",
        subtotal: "小计",
        total: "总计",
        paymentMethod: "支付方式",
        bankTransfer: "银行转账",
        yappy: "Yappy",
        notes: "订单备注",
        placeOrder: "提交订单",
        orderSuccess: "订单提交成功！",
        orderNumber: "订单号"
      },
      // Payment
      payment: {
        bankInfo: "银行信息",
        bankName: "Banco General",
        accountType: "支票账户",
        accountNumber: "账号",
        accountHolder: "账户持有人",
        instructions: "付款说明",
        instructionsText: "请完成转账并将收据发送至我们的邮箱以确认付款",
        yappyInfo: "Yappy 支付",
        yappyInstructions: "您将被重定向到 Yappy 完成付款"
      },
      // Admin
      admin: {
        dashboard: "管理面板",
        products: "产品",
        inventory: "库存",
        orders: "订单",
        addProduct: "添加产品",
        editProduct: "编辑产品",
        deleteProduct: "删除产品",
        lowStockAlerts: "低库存警报",
        confirmPayment: "确认付款",
        updateStatus: "更新状态",
        printReceipt: "打印收据",
        totalProducts: "产品总数",
        pendingOrders: "待处理订单",
        confirmedOrders: "已确认订单"
      },
      // Order Status
      status: {
        pending: "待处理",
        confirmed: "已确认",
        preparing: "准备中",
        shipped: "已发货",
        delivered: "已送达",
        cancelled: "已取消",
        // Spanish backend status keys
        pendiente: "待处理",
        confirmado: "已确认",
        preparando: "准备中",
        enviado: "已发货",
        entregado: "已送达",
        cancelado: "已取消"
      },
      // Common
      common: {
        save: "保存",
        cancel: "取消",
        delete: "删除",
        edit: "编辑",
        add: "添加",
        search: "搜索",
        loading: "加载中...",
        error: "错误",
        success: "成功",
        confirm: "确认",
        back: "返回",
        next: "下一步",
        previous: "上一步",
        close: "关闭",
        noResults: "无结果"
      },
      // Grades
      grades: {
        preescolar: "学前班",
        "1": "一年级",
        "2": "二年级",
        "3": "三年级",
        "4": "四年级",
        "5": "五年级",
        "6": "六年级",
        "7": "七年级",
        "8": "八年级",
        "9": "九年级",
        "10": "十年级",
        "11": "十一年级",
        "12": "十二年级"
      },
      // Subjects
      subjects: {
        matematicas: "数学",
        espanol: "西班牙语",
        ciencias: "科学",
        sociales: "社会研究",
        ingles: "英语",
        arte: "艺术",
        musica: "音乐",
        educacion_fisica: "体育",
        tecnologia: "技术",
        religion: "宗教"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;
