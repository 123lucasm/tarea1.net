const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');
const Previa = require('../models/Previa');

class ElegibilidadService {
  // Verificar elegibilidad para una materia específica
  static async verificarElegibilidad(estudianteId, materiaId) {
    try {
      const materia = await Materia.findById(materiaId);
      if (!materia) {
        throw new Error('Materia no encontrada');
      }

      if (!materia.activa) {
        return {
          elegible: false,
          causa: 'Materia inactiva',
          materia: materia.nombre
        };
      }

      if (!materia.hayCupo()) {
        return {
          elegible: false,
          causa: 'Sin cupo disponible',
          materia: materia.nombre
        };
      }

      // Verificar requisitos previos usando la entidad Previa
      const previas = await Previa.find({ 
        materia: materiaId, 
        activa: true 
      });
      
      const requisitosCumplidos = await this.verificarRequisitosPrevios(
        estudianteId,
        previas
      );

      if (!requisitosCumplidos.cumple) {
        return {
          elegible: false,
          causa: 'No cumple requisitos previos',
          materia: materia.nombre,
          requisitosFaltantes: requisitosCumplidos.requisitosFaltantes
        };
      }

      return {
        elegible: true,
        materia: materia.nombre,
        creditos: materia.creditos,
        horarios: materia.horarios
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar requisitos previos usando la entidad Previa
  static async verificarRequisitosPrevios(estudianteId, previas) {
    if (!previas || previas.length === 0) {
      return { cumple: true, requisitosFaltantes: [] };
    }

    const requisitosFaltantes = [];
    let cumple = true;

    for (const previa of previas) {
      const cumpleRequisito = await this.verificarRequisitoIndividual(
        estudianteId,
        previa
      );

      if (!cumpleRequisito.cumple) {
        cumple = false;
        requisitosFaltantes.push({
          materia: previa.materiaRequerida,
          tipo: previa.tipo,
          notaMinima: previa.notaMinima,
          causa: cumpleRequisito.causa
        });
      }
    }

    return {
      cumple,
      requisitosFaltantes
    };
  }

  // Verificar un requisito individual usando la entidad Previa
  static async verificarRequisitoIndividual(estudianteId, previa) {
    try {
      const historial = await HistorialAcademico.findOne({
        estudiante: estudianteId,
        materia: previa.materiaRequerida
      });

      if (!historial) {
        return {
          cumple: false,
          causa: 'Materia no cursada'
        };
      }

      if (requisito.tipo === 'examen_aprobado') {
        return this.verificarExamenAprobado(historial, requisito.notaMinima);
      } else if (requisito.tipo === 'curso_aprobado') {
        return this.verificarCursoAprobado(historial, requisito.notaMinima);
      }

      return {
        cumple: false,
        causa: 'Tipo de requisito no válido'
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar si el examen está aprobado
  static verificarExamenAprobado(historial, notaMinima) {
    if (!historial.notaExamen) {
      return {
        cumple: false,
        causa: 'Examen no rendido'
      };
    }

    if (historial.notaExamen < notaMinima) {
      return {
        cumple: false,
        causa: `Nota del examen (${historial.notaExamen}) menor a ${notaMinima}`
      };
    }

    return {
      cumple: true,
      causa: null
    };
  }

  // Verificar si el curso está aprobado
  static verificarCursoAprobado(historial, notaMinima) {
    if (!historial.notaCurso) {
      return {
        cumple: false,
        causa: 'Curso no cursado'
      };
    }

    if (historial.notaCurso < notaMinima) {
      return {
        cumple: false,
        causa: `Nota del curso (${historial.notaCurso}) menor a ${notaMinima}`
      };
    }

    return {
      cumple: true,
      causa: null
    };
  }

  // Obtener materias elegibles para un estudiante
  static async obtenerMateriasElegibles(estudianteId, semestre = null, anio = null) {
    try {
      let filtro = { activa: true };
      
      if (semestre && anio) {
        filtro.semestre = semestre;
        filtro.anio = anio;
      }

      const materias = await Materia.find(filtro);
      const materiasElegibles = [];
      const materiasNoElegibles = [];

      for (const materia of materias) {
        const elegibilidad = await this.verificarElegibilidad(estudianteId, materia._id);
        
        if (elegibilidad.elegible) {
          materiasElegibles.push({
            ...materia.toObject(),
            elegibilidad
          });
        } else {
          materiasNoElegibles.push({
            ...materia.toObject(),
            elegibilidad
          });
        }
      }

      return {
        materiasElegibles,
        materiasNoElegibles,
        totalElegibles: materiasElegibles.length,
        totalNoElegibles: materiasNoElegibles.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener materias elegibles basadas en materias cursadas específicas
  static async obtenerMateriasElegiblesPorCursadas(materiasCursadas, semestre = null, anio = null) {
    try {
      let filtro = { activa: true };
      
      if (semestre && anio) {
        filtro.semestre = semestre;
        filtro.anio = anio;
      }

      const materias = await Materia.find(filtro);
      const materiasElegibles = [];
      const materiasNoElegibles = [];
      const materiasCursadasList = [];

      for (const materia of materias) {
        // Si ya la cursó, la agregamos a la lista de cursadas
        if (materiasCursadas.includes(materia._id.toString())) {
          materiasCursadasList.push({
            ...materia.toObject(),
            estado: 'cursada'
          });
          continue;
        }

        // Verificar elegibilidad basada en las materias cursadas
        const elegibilidad = await this.verificarElegibilidadPorCursadas(materia._id, materiasCursadas);
        
        if (elegibilidad.elegible) {
          materiasElegibles.push({
            ...materia.toObject(),
            elegibilidad
          });
        } else {
          materiasNoElegibles.push({
            ...materia.toObject(),
            elegibilidad
          });
        }
      }

      return {
        materiasElegibles,
        materiasNoElegibles,
        materiasCursadas: materiasCursadasList,
        totalElegibles: materiasElegibles.length,
        totalNoElegibles: materiasNoElegibles.length,
        totalCursadas: materiasCursadasList.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar elegibilidad basada en materias cursadas específicas
  static async verificarElegibilidadPorCursadas(materiaId, materiasCursadas) {
    try {
      const materia = await Materia.findById(materiaId);
      if (!materia) {
        throw new Error('Materia no encontrada');
      }

      if (!materia.activa) {
        return {
          elegible: false,
          causa: 'Materia inactiva',
          materia: materia.nombre
        };
      }

      if (!materia.hayCupo()) {
        return {
          elegible: false,
          causa: 'Sin cupo disponible',
          materia: materia.nombre
        };
      }

      // Verificar requisitos previos usando las materias cursadas proporcionadas
      const previas = await Previa.find({ 
        materia: materiaId, 
        activa: true 
      });
      
      const requisitosCumplidos = await this.verificarRequisitosPreviosPorCursadas(
        materiasCursadas,
        previas
      );

      if (!requisitosCumplidos.cumple) {
        return { 
          elegible: false, 
          causa: 'No cumple requisitos previos',
          materia: materia.nombre,
          requisitosFaltantes: requisitosCumplidos.requisitosFaltantes
        };
      }

      return {
        elegible: true,
        materia: materia.nombre,
        creditos: materia.creditos,
        horarios: materia.horarios
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar requisitos previos usando materias cursadas específicas
  static async verificarRequisitosPreviosPorCursadas(materiasCursadas, previas) {
    if (!previas || previas.length === 0) {
      return { cumple: true, requisitosFaltantes: [] };
    }

    const requisitosFaltantes = [];
    let cumple = true;

    for (const previa of previas) {
      const materiaRequerida = await Materia.findById(previa.materiaRequerida);
      
      if (previa.tipo === 'curso_aprobado') {
        // Para curso aprobado: DEBE estar cursada y aprobada
        if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
          cumple = false;
          requisitosFaltantes.push({
            materia: materiaRequerida?.nombre || 'Materia no encontrada',
            codigo: materiaRequerida?.codigo || 'N/A',
            tipo: 'curso_aprobado',
            tipoDescripcion: 'Curso Aprobado (obligatorio)',
            notaMinima: previa.notaMinima,
            causa: 'Debe estar cursada y aprobada'
          });
        }
      } else if (previa.tipo === 'examen_aprobado') {
        // Para examen aprobado: puede estar cursada Y aprobada O puede rendir examen
        // Por ahora, si no está cursada, puede rendir examen (siempre elegible)
        console.log(`📝 Materia ${materiaRequerida?.codigo} requiere examen de ${previa.materiaRequerida}, puede rendir examen`);
        // No agregamos a requisitos faltantes porque puede rendir examen
      }
    }

    return {
      cumple,
      requisitosFaltantes
    };
  }

  // Verificar conflictos de horario entre materias
  static async verificarConflictosHorario(estudianteId, materiasSeleccionadas) {
    try {
      const conflictos = [];
      
      for (let i = 0; i < materiasSeleccionadas.length; i++) {
        for (let j = i + 1; j < materiasSeleccionadas.length; j++) {
          const materia1 = await Materia.findById(materiasSeleccionadas[i]);
          const materia2 = await Materia.findById(materiasSeleccionadas[j]);
          
          if (materia1 && materia2 && materia1.tieneConflictoHorario(materia2)) {
            conflictos.push({
              materia1: materia1.nombre,
              materia2: materia2.nombre,
              tipo: 'Conflicto de horario'
            });
          }
        }
      }

      return {
        tieneConflictos: conflictos.length > 0,
        conflictos
      };
    } catch (error) {
      throw error;
    }
  }

  // Calcular carga horaria total
  static async calcularCargaHoraria(materiasIds) {
    try {
      const materias = await Materia.find({ _id: { $in: materiasIds } });
      
      let cargaTotal = 0;
      const horariosPorDia = {
        lunes: [],
        martes: [],
        miércoles: [],
        jueves: [],
        viernes: [],
        sábado: []
      };

      for (const materia of materias) {
        for (const horario of materia.horarios) {
          const inicio = new Date(`2000-01-01 ${horario.horaInicio}`);
          const fin = new Date(`2000-01-01 ${horario.horaFin}`);
          const duracion = (fin - inicio) / (1000 * 60 * 60); // Horas
          
          cargaTotal += duracion;
          
          horariosPorDia[horario.dia].push({
            materia: materia.nombre,
            inicio: horario.horaInicio,
            fin: horario.horaFin,
            tipo: horario.tipo,
            aula: horario.aula
          });
        }
      }

      return {
        cargaTotal: Math.round(cargaTotal * 100) / 100,
        horariosPorDia,
        materias: materias.map(m => ({ id: m._id, nombre: m.nombre, creditos: m.creditos }))
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener recomendaciones de materias
  static async obtenerRecomendaciones(estudianteId, limite = 5) {
    try {
      const historial = await HistorialAcademico.find({ 
        estudiante: estudianteId,
        estado: 'aprobado'
      }).populate('materia');

      const materiasAprobadas = historial.map(h => h.materia._id);
      
      // Buscar materias que tengan como requisito las materias aprobadas
      const materiasRecomendadas = await Materia.find({
        activa: true,
        'requisitosPrevios.materia': { $in: materiasAprobadas }
      }).limit(limite);

      // Filtrar solo las que realmente puede cursar
      const elegibles = [];
      for (const materia of materiasRecomendadas) {
        const elegibilidad = await this.verificarElegibilidad(estudianteId, materia._id);
        if (elegibilidad.elegible) {
          elegibles.push({
            ...materia.toObject(),
            elegibilidad
          });
        }
      }

      return elegibles;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ElegibilidadService;
