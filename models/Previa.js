const mongoose = require('mongoose');

const previaSchema = new mongoose.Schema({
    materia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Materia',
        required: true,
        index: true
    },
    materiaRequerida: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Materia',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['curso_aprobado', 'examen_aprobado'],
        required: true,
        default: 'curso_aprobado'
    },
    notaMinima: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
        required: true
    },
    semestreMinimo: {
        type: Number,
        min: 1,
        max: 20,
        required: false
    },
    creditosMinimos: {
        type: Number,
        min: 0,
        default: 0
    },
    activa: {
        type: Boolean,
        default: true
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    fechaModificacion: {
        type: Date,
        default: Date.now
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
previaSchema.index({ materia: 1, materiaRequerida: 1 });
previaSchema.index({ materiaRequerida: 1, tipo: 1 });
previaSchema.index({ activa: 1 });
previaSchema.index({ semestreMinimo: 1 });

// Método para verificar si la previa está activa
previaSchema.methods.estaActiva = function() {
    return this.activa;
};

// Método para obtener descripción legible del tipo
previaSchema.methods.getTipoDescripcion = function() {
    const tipos = {
        'curso_aprobado': 'Curso Aprobado',
        'examen_aprobado': 'Examen Aprobado'
    };
    return tipos[this.tipo] || this.tipo;
};

// Método para obtener descripción de la nota mínima
previaSchema.methods.getNotaMinimaDescripcion = function() {
    const notas = {
        1: 'Deficiente',
        2: 'Insuficiente',
        3: 'Suficiente',
        4: 'Muy Bueno',
        5: 'Excelente'
    };
    return `${this.notaMinima} (${notas[this.notaMinima]})`;
};

// Método para verificar si un estudiante cumple con esta previa específica
previaSchema.methods.cumplePrevia = function(historialAcademico, semestreActual) {
    if (!this.activa) {
        return true;
    }

    // Verificar semestre mínimo si está definido
    if (this.semestreMinimo && semestreActual < this.semestreMinimo) {
        return false;
    }

    // Buscar la materia en el historial académico
    const materiaHistorial = historialAcademico.find(
        item => item.materia.toString() === this.materiaRequerida.toString()
    );

    if (!materiaHistorial) {
        return false; // No tiene la materia en su historial
    }

    // Verificar la nota según el tipo de requisito
    if (this.tipo === 'curso_aprobado') {
        return materiaHistorial.nota >= this.notaMinima;
    } else if (this.tipo === 'examen_aprobado') {
        return materiaHistorial.nota >= this.notaMinima;
    }

    return false;
};

// Método para obtener información completa de la previa
previaSchema.methods.getInfoCompleta = function() {
    return {
        materia: this.materia,
        materiaRequerida: this.materiaRequerida,
        tipo: this.tipo,
        tipoDescripcion: this.getTipoDescripcion(),
        notaMinima: this.notaMinima,
        notaMinimaDescripcion: this.getNotaMinimaDescripcion(),
        semestreMinimo: this.semestreMinimo,
        creditosMinimos: this.creditosMinimos,
        activa: this.activa,
        fechaCreacion: this.fechaCreacion,
        fechaModificacion: this.fechaModificacion
    };
};

// Middleware para actualizar fecha de modificación
previaSchema.pre('save', function(next) {
    this.fechaModificacion = new Date();
    next();
});

// Validación personalizada para evitar referencias circulares
previaSchema.pre('save', async function(next) {
    if (this.materia.equals(this.materiaRequerida)) {
        return next(new Error('Una materia no puede ser prerrequisito de sí misma'));
    }
    next();
});

// Método estático para obtener todas las previas de una materia
previaSchema.statics.obtenerPreviaPorMateria = function(materiaId) {
    return this.find({ materia: materiaId, activa: true })
        .populate('materiaRequerida', 'codigo nombre creditos semestre')
        .populate('creadoPor', 'nombre email');
};

// Método estático para obtener todas las materias que requieren una previa específica
previaSchema.statics.obtenerMateriasQueRequieren = function(materiaId) {
    return this.find({ materiaRequerida: materiaId, activa: true })
        .populate('materia', 'codigo nombre creditos semestre')
        .populate('creadoPor', 'nombre email');
};

module.exports = mongoose.model('Previa', previaSchema);


