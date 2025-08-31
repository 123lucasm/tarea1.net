# 🎓 Sistema de Elegibilidad de Materias

Sistema web completo para la gestión de elegibilidad de materias universitarias, permitiendo a los estudiantes conocer qué asignaturas pueden cursar según su historial académico.

## ✨ Características Principales

- **🔐 Autenticación JWT** con roles de estudiante y administrador
- **📚 Gestión de Materias** con requisitos previos y horarios
- **✅ Verificación de Elegibilidad** automática basada en historial académico
- **📊 Historial Académico** completo con estados y notas
- **⏰ Gestión de Horarios** con detección de conflictos
- **🔔 Notificaciones en Tiempo Real** via WebSockets
- **📱 Interfaz Responsiva** con Bootstrap 5
- **🛡️ Seguridad** con validaciones y rate limiting

## 🏗️ Arquitectura del Sistema

```
sistema-elegibilidad-materias/
├── models/                 # Modelos de MongoDB/Mongoose
│   ├── Usuario.js         # Usuarios y autenticación
│   ├── Materia.js         # Materias del sistema
│   ├── Previa.js          # Prerrequisitos de materias
│   └── HistorialAcademico.js # Historial del estudiante
├── services/              # Lógica de negocio
│   ├── authService.js     # Servicios de autenticación
│   ├── elegibilidadService.js # Verificación de elegibilidad
│   └── previaService.js   # Gestión de prerrequisitos
├── middleware/            # Middlewares de Express
│   └── auth.js           # Autenticación y autorización
├── routes/                # Rutas de la API
│   ├── auth.js           # Autenticación
│   ├── materias.js       # Gestión de materias
│   ├── estudiantes.js    # Dashboard de estudiantes
│   ├── admin.js          # Panel de administración
│   ├── elegibilidad.js   # Verificación de elegibilidad
│   └── previas.js        # Gestión de prerrequisitos
├── views/                 # Vistas EJS
│   ├── layouts/          # Layouts principales
│   ├── partials/         # Componentes reutilizables
│   └── *.ejs            # Páginas específicas
├── public/                # Archivos estáticos
│   ├── css/              # Estilos CSS
│   └── js/               # JavaScript del cliente
├── scripts/               # Scripts de utilidad
│   └── seed.js           # Poblado de base de datos
└── server.js              # Servidor principal
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 16+ 
- MongoDB 4.4+
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd sistema-elegibilidad-materias
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y configurar las variables:

```bash
cp env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Base de datos
MONGO_URI=mongodb://localhost:27017/sistema_elegibilidad

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro_aqui

# Servidor
PORT=3000
NODE_ENV=development
```

### 4. Poblar la base de datos

```bash
npm run seed
```

### 5. Iniciar la aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🔑 Credenciales de Prueba

Después de ejecutar el seed, tendrás acceso a:

### 👨‍💼 Administrador
- **Email:** admin@universidad.edu
- **Contraseña:** admin123

### 👨‍🎓 Estudiante 1
- **Email:** estudiante1@universidad.edu
- **Contraseña:** estudiante123

### 👩‍🎓 Estudiante 2
- **Email:** estudiante2@universidad.edu
- **Contraseña:** estudiante123

## 📚 Modelos de Datos

### Usuario
- Información personal (nombre, apellido, email)
- Rol (estudiante/administrador)
- Legajo único
- Contraseña hasheada
- Tokens de autenticación

### Materia
- Código y nombre
- Créditos y semestre
- Horarios (día, hora, tipo, aula)
- Cupo disponible
- Profesor asignado
- **Nota**: Los requisitos previos se manejan a través de la entidad Previa

### Previa (Nuevo)
- **Materia**: Materia que requiere el prerrequisito
- **MateriaRequerida**: Materia que debe ser aprobada
- **Tipo**: `curso_aprobado` o `examen_aprobado`
- **NotaMínima**: Calificación mínima requerida (1-5)
- **Estado**: Activa/inactiva para soft delete
- **Auditoría**: Fechas de creación/modificación y usuario creador
- **Validaciones**: Previene referencias circulares y duplicados

### Historial Académico
- Estado de la materia (pendiente, en curso, cursado, aprobado)
- Notas de curso y examen
- Nota final calculada
- Fechas de inscripción y aprobación
- Créditos obtenidos

### Escala de Notas
El sistema utiliza una escala de notas del 1 al 5:
- **1 - Deficiente**: No cumple con los requisitos mínimos
- **2 - Insuficiente**: Cumple parcialmente los requisitos
- **3 - Suficiente**: Cumple los requisitos mínimos (nota de aprobación)
- **4 - Muy Bueno**: Cumple ampliamente los requisitos
- **5 - Excelente**: Cumple todos los requisitos de manera sobresaliente

**Nota mínima para aprobar:** 3 (Suficiente)

## 🔐 API Endpoints

### Autenticación
- `POST /auth/registro` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Renovar access token
- `POST /auth/logout` - Cerrar sesión
- `POST /auth/cambiar-password` - Cambiar contraseña
- `GET /auth/perfil` - Obtener perfil del usuario
- `GET /auth/verificar` - Verificar token válido

### Materias
- `GET /materias` - Listar materias
- `GET /materias/:id` - Obtener materia específica
- `POST /materias` - Crear nueva materia (admin)
- `PUT /materias/:id` - Actualizar materia (admin)
- `DELETE /materias/:id` - Eliminar materia (admin)

### Estudiantes
- `GET /estudiantes/dashboard` - Dashboard del estudiante
- `GET /estudiantes/historial` - Historial académico
- `POST /estudiantes/historial` - Agregar materia al historial
- `PUT /estudiantes/historial/:id` - Actualizar estado de materia

### Elegibilidad
- `GET /elegibilidad/materias` - Materias elegibles
- `POST /elegibilidad/verificar` - Verificar elegibilidad específica
- `GET /elegibilidad/conflictos` - Verificar conflictos de horario
- `GET /elegibilidad/carga-horaria` - Calcular carga horaria

### Administración
- `GET /admin/dashboard` - Panel de administración
- `GET /admin/usuarios` - Gestionar usuarios
- `GET /admin/estadisticas` - Estadísticas del sistema

## 🎨 Interfaz de Usuario

### Dashboard del Estudiante
- Resumen de créditos obtenidos
- Materias en curso
- Materias elegibles para el próximo semestre
- Historial académico completo

### Panel de Administración
- Gestión de materias (CRUD)
- Gestión de usuarios
- Configuración de requisitos previos
- Estadísticas del sistema

### Verificador de Elegibilidad
- Lista de materias elegibles
- Causas de no elegibilidad
- Recomendaciones de materias
- Verificación de conflictos de horario

## 🔒 Seguridad

- **Contraseñas hasheadas** con bcrypt
- **JWT con expiración** y refresh tokens
- **Validación de inputs** con express-validator
- **Rate limiting** para prevenir abuso
- **Helmet** para headers de seguridad
- **CORS** configurado apropiadamente
- **Rutas protegidas** por rol y autenticación

## 📱 WebSockets

El sistema utiliza Socket.io para:

- Notificaciones en tiempo real
- Actualizaciones de materias
- Estado de conexión de usuarios
- Eventos del sistema

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch
```

## 📦 Scripts Disponibles

- `npm start` - Iniciar en producción
- `npm run dev` - Iniciar en desarrollo con nodemon
- `npm run seed` - Poblar base de datos
- `npm test` - Ejecutar tests

## 🚀 Deploy

### Render
1. Conectar repositorio de GitHub
2. Configurar variables de entorno
3. Build command: `npm install`
4. Start command: `npm start`

### Heroku
```bash
heroku create
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=tu_mongo_uri
git push heroku main
```

### Vercel
1. Conectar repositorio
2. Configurar variables de entorno
3. Deploy automático

## 🐛 Troubleshooting

### Error de conexión a MongoDB
- Verificar que MongoDB esté ejecutándose
- Verificar URI en archivo .env
- Verificar credenciales de acceso

### Error de JWT
- Verificar JWT_SECRET en .env
- Limpiar localStorage del navegador
- Verificar expiración de tokens

### Error de permisos
- Verificar rol del usuario
- Verificar middleware de autorización
- Verificar ownership de recursos

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Tu Nombre** - *Desarrollo inicial* - [TuUsuario](https://github.com/TuUsuario)

## 🙏 Agradecimientos

- Bootstrap por el framework CSS
- Font Awesome por los iconos
- Socket.io por la funcionalidad de WebSockets
- MongoDB por la base de datos
- Express por el framework web

## 📞 Soporte

Si tienes preguntas o problemas:

- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación de la API

---

**¡Gracias por usar el Sistema de Elegibilidad de Materias! 🎓**
