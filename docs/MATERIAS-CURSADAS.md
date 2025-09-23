# Sistema de Materias Cursadas - MATRICULATEC

## 📋 Descripción

Esta funcionalidad permite a los estudiantes seleccionar las materias que ya han cursado y aprobado, para que el sistema pueda calcular automáticamente qué materias pueden cursar en el próximo semestre.

## 🎯 Características Principales

### ✅ Para Estudiantes
- **Selección Visual**: Interfaz intuitiva para marcar materias cursadas
- **Indicadores de Color**: 
  - 🟢 Verde: Materias que puedes cursar
  - 🔴 Rojo: Materias que no puedes cursar aún
  - 🔵 Azul: Materias ya cursadas
- **Cálculo Automático**: El sistema verifica requisitos previos automáticamente
- **Estadísticas en Tiempo Real**: Contador de materias cursadas, elegibles y no elegibles

### 🔧 Funcionalidades Técnicas
- **Verificación de Previas**: Analiza requisitos previos basados en materias cursadas
- **Gestión de Historial**: Actualiza automáticamente el historial académico
- **API RESTful**: Endpoints para integración con frontend
- **Validación de Datos**: Verificación de cupos, materias activas, etc.

## 🚀 Cómo Usar

### 1. Acceder a la Funcionalidad
```
URL: /materias-cursadas
```

### 2. Seleccionar Materias Cursadas
- Marca las materias que ya has cursado y aprobado
- El sistema muestra estadísticas en tiempo real
- Puedes desmarcar materias si te equivocaste

### 3. Calcular Elegibilidad
- Haz clic en "Calcular Elegibilidad"
- El sistema analiza todas las materias disponibles
- Muestra resultados organizados por categorías

### 4. Ver Resultados
- **Materias Elegibles**: Las que puedes cursar (verde)
- **Materias No Elegibles**: Las que requieren previas (rojo)
- **Materias Cursadas**: Las que ya completaste (azul)

## 🛠️ API Endpoints

### GET /materias-cursadas
Muestra la página principal de selección de materias.

### GET /api/materias
Obtiene todas las materias disponibles para selección.

### POST /api/materias-cursadas
Guarda las materias cursadas seleccionadas por el estudiante.

```json
{
  "materiasCursadas": ["materiaId1", "materiaId2"],
  "notas": {
    "materiaId1": 4,
    "materiaId2": 5
  }
}
```

### GET /api/materias-cursadas
Obtiene las materias cursadas del estudiante actual.

### POST /elegibilidad/verificar
Verifica la elegibilidad de una materia específica.

```json
{
  "materiaId": "materiaId",
  "materiasCursadas": ["materiaId1", "materiaId2"]
}
```

### GET /elegibilidad/materias
Obtiene todas las materias con su estado de elegibilidad.

## 🎨 Interfaz de Usuario

### Diseño Visual
- **Cards Interactivas**: Cada materia en una tarjeta con información completa
- **Checkboxes Personalizados**: Diseño moderno para selección
- **Indicadores de Estado**: Colores distintivos para cada tipo de materia
- **Responsive**: Funciona en dispositivos móviles y desktop

### Elementos de Interfaz
- **Estadísticas**: Contador de materias por categoría
- **Botones de Acción**: Calcular elegibilidad, limpiar selección
- **Loading States**: Indicadores de carga durante cálculos
- **Alertas**: Mensajes informativos y de error

## 🔍 Lógica de Elegibilidad

### Criterios de Verificación
1. **Materia Activa**: Solo materias marcadas como activas
2. **Cupo Disponible**: Verifica que haya cupo en la materia
3. **Requisitos Previos**: Analiza si cumple con las previas requeridas
4. **Notas Mínimas**: Verifica que las notas cumplan con los requisitos

### Tipos de Previas Soportadas
- **Curso Aprobado**: Requiere haber cursado y aprobado la materia
- **Examen Aprobado**: Requiere haber aprobado el examen
- **Nota Mínima**: Verifica que la nota sea igual o superior al mínimo

## 📊 Base de Datos

### Modelos Utilizados
- **Usuario**: Información del estudiante
- **Materia**: Catálogo de materias disponibles
- **HistorialAcademico**: Registro de materias cursadas
- **Previa**: Requisitos previos entre materias
- **Semestre**: Organización por semestres

### Relaciones
- Usuario → HistorialAcademico (1:N)
- Materia → HistorialAcademico (1:N)
- Materia → Previa (1:N)
- Semestre → Materia (1:N)

## 🧪 Pruebas

### Script de Prueba
```bash
npm run test-materias
```

### Casos de Prueba
1. **Selección Básica**: Marcar materias del semestre 1
2. **Cálculo de Elegibilidad**: Verificar materias del semestre 2
3. **Validación de Previas**: Comprobar requisitos previos
4. **Manejo de Errores**: Probar casos de error

## 🔧 Configuración

### Variables de Entorno
```env
MONGO_URI=mongodb://localhost:27017/sistema_elegibilidad
JWT_SECRET=tu_jwt_secret
```

### Dependencias
- Express.js para el servidor
- MongoDB con Mongoose para la base de datos
- EJS para las plantillas
- Tailwind CSS para el diseño

## 🚀 Instalación y Uso

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Base de Datos
```bash
npm run seed
```

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Acceder a la Aplicación
```
http://localhost:3000/materias-cursadas
```

## 📝 Notas de Desarrollo

### Archivos Principales
- `views/materias-cursadas.ejs`: Interfaz de usuario
- `routes/materias-cursadas.js`: Rutas y lógica de API
- `services/elegibilidadService.js`: Servicio de elegibilidad
- `scripts/test-materias-cursadas.js`: Script de pruebas

### Mejoras Futuras
- [ ] Guardar selección automáticamente
- [ ] Exportar reporte de elegibilidad
- [ ] Notificaciones de nuevas materias elegibles
- [ ] Integración con calendario académico
- [ ] Sugerencias de carga académica óptima

## 🤝 Contribución

Para contribuir a esta funcionalidad:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Implementa los cambios
4. Ejecuta las pruebas
5. Envía un Pull Request

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:
- Crea un issue en GitHub
- Contacta al equipo de desarrollo
- Revisa la documentación técnica

---

**Desarrollado para UTEC - Universidad Tecnológica del Uruguay**


