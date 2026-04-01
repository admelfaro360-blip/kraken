import { BusinessConfig, Phase, Material, CalculationResult } from '../types';

export const calculateBudget = (
  phases: Phase[],
  materials: Material[],
  config: BusinessConfig,
  clientZone: number,
  marginPct: number
): CalculationResult => {
  // 1. Estructura Diaria
  const totalFixedCosts = config.fixedCosts.reduce((acc, cost) => acc + cost.amount, 0);
  const dailyStructureCost = totalFixedCosts / config.daysPerMonth;

  // 2. Cálculos por Fase
  let moTotal = 0;
  let structureTotal = 0;
  let transportTotal = 0;

  phases.forEach((phase) => {
    // Mano de Obra: sum of (count * cost) for each labor assignment × medias jornadas × días
    const phaseMO = phase.labor.reduce((acc, labor) => {
      const cost = labor.role === 'oficial' ? config.halfDayCostOficial : config.halfDayCostAyudante;
      return acc + (labor.count * cost);
    }, 0) * phase.halfDays * phase.days;
    
    moTotal += phaseMO;

    // Estructura: días × costo fijo diario
    const phaseStructure = phase.days * dailyStructureCost;
    structureTotal += phaseStructure;

    // Traslado: base por zona (por día) + extras traslado (por fase)
    const zone = config.transportZones.find(z => z.id === clientZone);
    const baseTransport = zone ? zone.amount : 0;
    const phaseTransport = (baseTransport * phase.days) + (phase.extraTransport || 0);
    transportTotal += phaseTransport;
  });

  // 3. Costo servicio antes de garantía (MO + Estructura + Traslado)
  const costBeforeGuarantee = moTotal + structureTotal + transportTotal;

  // 4. Garantía (Aplicada sobre el costo del servicio)
  // Nota: Se asume que config.guaranteePct es un decimal (ej: 0.08 para 8%)
  const guarantee = costBeforeGuarantee * config.guaranteePct;

  // 5. Mínimo sin margen (Costo real + Garantía)
  const minWithoutMargin = costBeforeGuarantee + guarantee;

  // 6. Margen de ganancia (Aplicado sobre el servicio)
  // Nota: marginPct viene como entero (ej: 30) desde el estado del componente
  const margenDecimal = marginPct / 100;
  // Fórmula del Margen de Utilidad real: Costo / (1 - Margen)
  const precioObjetivo = marginPct < 100 ? minWithoutMargin / (1 - margenDecimal) : minWithoutMargin;
  const marginEur = precioObjetivo - minWithoutMargin;

  // 7. Materiales facturados: costo materiales × (1 + markup materiales)
  // Nota: config.materialMarkup es un decimal (ej: 0.25 para 25%)
  const materialsFactured = materials.reduce((acc, mat) => {
    return acc + (mat.cost * mat.quantity * (1 + config.materialMarkup));
  }, 0);

  // 8. Precio sin IVA (Subtotal)
  const subtotal = minWithoutMargin + marginEur + materialsFactured;

  // 9. IVA
  const iva = subtotal * config.iva;

  // 10. Total Final
  const total = subtotal + iva;

  return {
    moTotal,
    structureTotal,
    transportTotal,
    guarantee,
    minWithoutMargin,
    marginEur,
    marginPct,
    materialsFactured,
    subtotal,
    iva,
    total,
  };
};
