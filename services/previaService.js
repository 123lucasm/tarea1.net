const Previa = require('../models/Previa');
const Materia = require('../models/Materia');

class PreviaService {
    // Crear una nueva previa
    async crearPrevia(datosPrevia) {
        try {
            // Verificar que ambas materias existan
            const materia = await Materia.findById(datosPrevia.materia);
            const materiaRequerida = await Materia.findById(datosPrevia.materiaRequerida);
            
            if (!materia || !materiaRequerida) {
                throw new Error('Una o ambas materias no existen');
            }
            
            // Verificar que no exista ya esta previa
            const previaExistente = await Previa.findOne({
                materia: datosPrevia.materia,
                materiaRequerida: datosPrevia.materiaRequerida,
                tipo: datosPrevia.tipo
            });
            
            if (previaExistente) {
                throw new Error('Esta previa ya existe');
            }
            
            const previa = new Previa(datosPrevia);
            await previa.save();
            
            return previa;
        } catch (error) {
            throw error;
        }
    }
    
    // Obtener todas las previas de una materia
    async obtenerPreviasMateria(materiaId) {
        try {
            const previas = await Previa.find({ 
                materia: materiaId, 
                activa: true 
            }).populate('materiaRequerida', 'codigo nombre creditos');
            
            return previas;
        } catch (error) {
            throw error;
        }
    }
    
    // Obtener todas las materias que requieren una materia específica
    async obtenerMateriasQueRequieren(materiaRequeridaId) {
        try {
            const previas = await Previa.find({ 
                materiaRequerida: materiaRequeridaId, 
                activa: true 
            }).populate('materia', 'codigo nombre creditos semestre');
            
            return previas;
        } catch (error) {
            throw error;
        }
    }
    
    // Actualizar una previa
    async actualizarPrevia(previaId, datosActualizados) {
        try {
            const previa = await Previa.findByIdAndUpdate(
                previaId,
                { ...datosActualizados, fechaModificacion: new Date() },
                { new: true, runValidators: true }
            );
            
            if (!previa) {
                throw new Error('Previa no encontrada');
            }
            
            return previa;
        } catch (error) {
            throw error;
        }
    }
    
    // Desactivar una previa (soft delete)
    async desactivarPrevia(previaId) {
        try {
            const previa = await Previa.findByIdAndUpdate(
                previaId,
                { activa: false, fechaModificacion: new Date() },
                { new: true }
            );
            
            if (!previa) {
                throw new Error('Previa no encontrada');
            }
            
            return previa;
        } catch (error) {
            throw error;
        }
    }
    
    // Eliminar una previa permanentemente
    async eliminarPrevia(previaId) {
        try {
            const previa = await Previa.findByIdAndDelete(previaId);
            
            if (!previa) {
                throw new Error('Previa no encontrada');
            }
            
            return previa;
        } catch (error) {
            throw error;
        }
    }
    
    // Obtener todas las previas activas
    async obtenerTodasPrevias() {
        try {
            const previas = await Previa.find({ activa: true })
                .populate('materia', 'codigo nombre semestre')
                .populate('materiaRequerida', 'codigo nombre semestre')
                .populate('creadoPor', 'nombre apellido email');
            
            return previas;
        } catch (error) {
            throw error;
        }
    }
    
    // Verificar si una materia cumple con sus previas
    async verificarCumplimientoPrevias(materiaId, historialAcademico) {
        try {
            const previas = await this.obtenerPreviasMateria(materiaId);
            
            if (previas.length === 0) {
                return { cumple: true, previas: [] };
            }
            
            const resultadosPrevias = [];
            let todasCumplidas = true;
            
            for (const previa of previas) {
                const historialMateria = historialAcademico.find(
                    h => h.materia.toString() === previa.materiaRequerida.toString()
                );
                
                let cumple = false;
                let motivo = '';
                
                if (historialMateria) {
                    if (previa.tipo === 'curso_aprobado') {
                        cumple = historialMateria.notaCurso >= previa.notaMinima;
                        motivo = cumple ? 
                            `Curso aprobado con nota ${historialMateria.notaCurso}` :
                            `Nota del curso (${historialMateria.notaCurso}) menor a ${previa.notaMinima}`;
                    } else if (previa.tipo === 'examen_aprobado') {
                        cumple = historialMateria.notaExamen >= previa.notaMinima;
                        motivo = cumple ? 
                            `Examen aprobado con nota ${historialMateria.notaExamen}` :
                            `Nota del examen (${historialMateria.notaExamen}) menor a ${previa.notaMinima}`;
                    }
                } else {
                    motivo = 'Materia no cursada';
                }
                
                if (!cumple) {
                    todasCumplidas = false;
                }
                
                resultadosPrevias.push({
                    previa,
                    cumple,
                    motivo,
                    historial: historialMateria
                });
            }
            
            return {
                cumple: todasCumplidas,
                previas: resultadosPrevias
            };
        } catch (error) {
            throw error;
        }
    }
    
    // Obtener el árbol de dependencias de una materia
    async obtenerArbolDependencias(materiaId, profundidad = 3) {
        try {
            const arbol = {
                materia: await Materia.findById(materiaId),
                previas: [],
                nivel: 0
            };
            
            if (profundidad > 0) {
                const previas = await this.obtenerPreviasMateria(materiaId);
                
                for (const previa of previas) {
                    const subArbol = await this.obtenerArbolDependencias(
                        previa.materiaRequerida, 
                        profundidad - 1
                    );
                    arbol.previas.push(subArbol);
                }
            }
            
            return arbol;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = PreviaService;




