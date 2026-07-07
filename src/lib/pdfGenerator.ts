import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalculationResult, Phase, Material, Budget, WorkOrder, MaintenanceRecord, ClientAgreement } from '../types';
import { translateText, translateMaterials } from './gemini';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WeeklyAgendaPDFData {
  startDate: string;
  endDate: string;
  days: {
    date: Date;
    budgets: Budget[];
    orders: WorkOrder[];
  }[];
}

interface PDFData {
  id: string;
  client: {
    name: string;
    phone: string;
    address: string;
    vertical: string;
  };
  date: string;
  description: string;
  calculation: CalculationResult;
  materials: Material[];
  applyIVA?: boolean;
  isMonthly?: boolean;
  enabledServices?: string[];
  selectedDays?: string[];
  language: 'es' | 'pt' | 'en';
  config?: any;
}

const translations = {
  es: {
    title: 'Presupuesto de Mantenimiento',
    budgetNo: 'N°:',
    date: 'Fecha:',
    clientData: 'DATOS DEL CLIENTE',
    clientName: 'Nombre y apellido:',
    clientPhone: 'Celular:',
    clientAddress: 'Dirección:',
    descriptionLabel: 'Descripción:',
    noDescription: 'Sin descripción',
    materialsLabel: 'Materiales',
    noMaterials: 'No se especifican materiales adicionales.',
    totalMaterials: 'Total materiales:',
    totalGeneral: 'PRECIO TOTAL:',
    ivaLabel: 'I.V.A',
    footer: 'Somos confianza, somos kraken',
    termsTitle: 'CONDICIONES DEL SERVICIO',
    termsText: [
      'Los materiales podrán ser suministrados por Kraken Handyman para facilitar la ejecución de los trabajos. No obstante, Kraken Handyman no será responsable por defectos de fabricación, calidad, durabilidad o fallas propias de los materiales utilizados.',
      'Forma de pago: 50% al confirmar el presupuesto y reservar agenda. El 50% restante deberá abonarse al finalizar los trabajos.',
      'Los trabajos o modificaciones no incluidos expresamente en este presupuesto serán considerados adicionales y se presupuestarán por separado.',
      'Este presupuesto tiene una validez de 15 días desde su fecha de emisión.',
      'La aceptación del presente presupuesto implica la conformidad del cliente con estas condiciones.\nEl personal de Kraken tiene Seguro de accidente y responsabilidad civil.'
    ]
  },
  pt: {
    title: 'Orçamento de Manutenção',
    budgetNo: 'N°:',
    date: 'Data:',
    clientData: 'DADOS DO CLIENTE',
    clientName: 'Nome e apelido:',
    clientPhone: 'Telemóvel:',
    clientAddress: 'Morada:',
    descriptionLabel: 'Descrição:',
    noDescription: 'Sem descrição',
    materialsLabel: 'Materiais',
    noMaterials: 'Não são especificados materiais adicionais.',
    totalMaterials: 'Total materiais:',
    totalGeneral: 'PREÇO TOTAL:',
    ivaLabel: 'I.V.A',
    footer: 'Somos confiança, somos kraken',
    termsTitle: 'CONDIÇÕES DO SERVIÇO',
    termsText: [
      'Os materiais podem ser fornecidos pela Kraken Handyman para facilitar a execução dos trabalhos. No entanto, a Kraken Handyman não será responsável por defeitos de fabrico, qualidade, durabilidade ou falhas próprias dos materiais utilizados.',
      'Forma de pagamento: 50% na confirmação do orçamento e reserva de agenda. Os 50% restantes devem ser pagos no final dos trabalhos.',
      'Os trabalhos ou modificações não incluídos expressamente neste orçamento serão considerados adicionais e serão orçamentados em separado.',
      'Este orçamento é válido por 15 dias a contar da data de emissão.',
      'A aceitação deste orçamento implica a conformidade do cliente com estas condições.\nO pessoal da Kraken tem seguro de acidentes e responsabilidade civil.'
    ]
  },
  en: {
    title: 'Maintenance Budget',
    budgetNo: 'No:',
    date: 'Date:',
    clientData: 'CLIENT DETAILS',
    clientName: 'Name and surname:',
    clientPhone: 'Phone:',
    clientAddress: 'Address:',
    descriptionLabel: 'Description:',
    noDescription: 'No description',
    materialsLabel: 'Materials',
    noMaterials: 'No additional materials specified.',
    totalMaterials: 'Total materials:',
    totalGeneral: 'TOTAL PRICE:',
    ivaLabel: 'V.A.T',
    footer: 'We are trust, we are kraken',
    termsTitle: 'TERMS OF SERVICE',
    termsText: [
      'Materials may be supplied by Kraken Handyman to facilitate the execution of the works. However, Kraken Handyman shall not be liable for manufacturing defects, quality, durability, or failures inherent to the materials used.',
      'Payment process: 50% upon confirmation of the budget and booking the schedule. The remaining 50% must be paid upon completion of the works.',
      'Any works or modifications not expressly included in this budget will be considered additional and will be quoted separately.',
      'This budget is valid for 15 days from its date of issue.',
      'The acceptance of this budget implies the customer\'s agreement with these terms.\nKraken personnel have accident and civil liability insurance.'
    ]
  }
};

export const generateWorkOrderPDF = async (data: WorkOrderPDFData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const targetLang = data.language || 'es';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Translate description if not in Spanish
  let displayDescription = data.description || 'Sin descripción';
  if (targetLang !== 'es') {
    try {
      displayDescription = await translateText(displayDescription, targetLang);
    } catch (error) {
      console.error("Translation failed for Work Order PDF:", error);
    }
  }

  // 1. Encabezado (Fondo Negro + Logo Centrado)
  const headerHeight = 35;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  try {
    const logoUrl = "/logo.png";
    const logoWidth = 65;
    const logoHeight = 26;
    doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
  } catch (e) {
    console.warn("Could not add logo to PDF", e);
  }

  doc.setTextColor(18, 18, 18);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE TRABAJO', pageWidth / 2, headerHeight + 15, { align: 'center' });

  // 2. Información del documento
  const infoY = headerHeight + 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° Orden: ${data.id}`, margin, infoY);
  doc.text(`Fecha Inicio: ${data.startDate || 'Sin fecha'} ${data.duration ? `(${data.duration} días)` : ''}`, pageWidth - margin, infoY, { align: 'right' });
  
  doc.setDrawColor(229, 229, 229);
  doc.line(margin, infoY + 3, pageWidth - margin, infoY + 3);

  // 3. Datos del Cliente
  const clientY = infoY + 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', margin, clientY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${data.client.name}`, margin, clientY + 8);
  doc.text(`Celular: ${data.client.phone || 'N/A'}`, margin, clientY + 14);
  doc.text(`Dirección: ${data.client.address || 'N/A'}`, margin, clientY + 20);
  
  const clientLineY = clientY + 25;
  doc.line(margin, clientLineY, pageWidth - margin, clientLineY);

  // 4. Detalle de los Trabajos
  const workY = clientLineY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DEL TRABAJO', margin, workY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let currentY = workY + 8;
  const splitDesc = doc.splitTextToSize(displayDescription, pageWidth - (margin * 2) - 10);
  
  splitDesc.forEach((line: string, index: number) => {
    doc.text(`${index + 1}. ${line}`, margin + 5, currentY);
    currentY += 6;
  });
  
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
  currentY += 12;

  // 5. Cuadrilla y Personal Asignado
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUADRILLA Y PERSONAL ASIGNADO', margin, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.crewId) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Equipo: ${data.crewId}`, margin + 5, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 6;
  }
  
  if (data.phases && data.phases.length > 0) {
    data.phases.forEach((phase) => {
      // Check if we need a new page
      if (currentY > 260) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Fase: ${phase.name}`, margin + 5, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 6;
      
      phase.labor.forEach((labor) => {
        const roleName = labor.role === 'oficial' ? 'Oficial' : 'Ayudante';
        const person = labor.assignedPerson || 'Sin asignar';
        doc.text(`  • ${roleName} (x${labor.count}): ${person}`, margin + 5, currentY);
        currentY += 6;
      });
      currentY += 2;
    });
  } else if (data.assignedTo && data.assignedTo.length > 0) {
    data.assignedTo.forEach((person) => {
      doc.text(`• ${person}`, margin + 5, currentY);
      currentY += 6;
    });
  } else {
    doc.text('• No se ha asignado personal aún.', margin + 5, currentY);
    currentY += 6;
  }
  
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
  currentY += 12;

  // 6. Notas Adicionales
  if (data.notes) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS', margin, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - (margin * 2) - 10);
    splitNotes.forEach((line: string) => {
      doc.text(line, margin + 5, currentY);
      currentY += 6;
    });
  }

  // 7. Pie de Página
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('KRAKEN - Gestión de Mantenimiento', pageWidth / 2, 285, { align: 'center' });

  return doc;
};

export interface WorkOrderPDFData {
  id: string;
  client: {
    name: string;
    phone: string;
    address: string;
  };
  description: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  crewId?: string;
  status: string;
  assignedTo?: string[];
  phases?: Phase[];
  notes?: string;
  language?: 'es' | 'pt' | 'en';
}

export const generateBudgetPDF = async (data: PDFData, formatType: 'pc' | 'mobile' = 'pc') => {
  const isMobile = formatType === 'mobile';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isMobile ? [100, 200] : 'a4'
  });
  
  const targetLang = data.language || 'es';
  const t = translations[targetLang];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isMobile ? 10 : 20;

  // Translate content if not in Spanish
  let displayDescription = data.description || t.noDescription;
  let displayMaterials = data.materials || [];

  if (targetLang !== 'es') {
    try {
      displayDescription = await translateText(displayDescription, targetLang);
      if (displayMaterials.length > 0) {
        displayMaterials = await translateMaterials(displayMaterials, targetLang);
      }
    } catch (error) {
      console.error("Translation failed during PDF generation:", error);
    }
  }

  // Calculemos el valor de los materiales de forma exacta para el subtotal
  let calculatedMaterialsSubtotal = 0;
  if (displayMaterials && displayMaterials.length > 0) {
    displayMaterials.forEach((mat) => {
      const markup = typeof (data as any).config?.materialMarkup === 'number'
        ? (data as any).config.materialMarkup
        : 0.25;
      const unitPrice = mat.cost * (1 + markup);
      calculatedMaterialsSubtotal += unitPrice * mat.quantity;
    });
  }

  // Calculemos el valor de la Mano de Obra (subtotal sin materiales, o suma de minimo sin margen + margen)
  let laborValue = 0;
  if (data.calculation) {
    const minWithMarginSum = (data.calculation.minWithoutMargin || 0) + (data.calculation.marginEur || 0);
    if (minWithMarginSum > 0) {
      laborValue = minWithMarginSum;
    } else {
      const totalSubtotal = data.calculation.subtotal || 0;
      laborValue = Math.max(0, totalSubtotal - calculatedMaterialsSubtotal);
    }
  }

  // 1. Encabezado (Fondo Negro + Logo Centrado)
  const headerHeight = isMobile ? 25 : 35;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  try {
    const logoUrl = "/logo.png";
    const logoWidth = isMobile ? 45 : 65;
    const logoHeight = isMobile ? 18 : 26;
    doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
  } catch (e) {
    console.warn("Could not add logo to PDF", e);
  }

  // 2. Título, N° y Fecha
  let currentY = headerHeight + 10;
  
  // N° y Fecha en una línea superior (más pequeña y gris)
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(isMobile ? 7 : 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.budgetNo} ${data.id}`, margin, currentY);
  doc.text(`${t.date} ${data.date}`, pageWidth - margin, currentY, { align: 'right' });
  
  // Título Centrado
  currentY += isMobile ? 6 : 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(isMobile ? 11 : 18);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title, pageWidth / 2, currentY, { align: 'center' });

  // Línea horizontal negra (Fina)
  currentY += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 3. Datos del Cliente
  currentY += 10;
  doc.setDrawColor(209, 4, 41); // Kraken Red
  doc.setLineWidth(1.5);
  doc.line(margin, currentY - 4, margin, currentY + 1); // Vertical accent
  
  doc.setFontSize(isMobile ? 8 : 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(t.clientData, margin + 4, currentY);
  
  currentY += isMobile ? 5 : 7;
  doc.setFontSize(isMobile ? 7.5 : 11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.clientName} ${data.client.name}`, margin, currentY);
  currentY += isMobile ? 5 : 6;
  doc.text(`${t.clientPhone} ${data.client.phone}`, margin, currentY);
  currentY += isMobile ? 5 : 6;
  doc.text(`${t.clientAddress} ${data.client.address}`, margin, currentY);

  // Línea horizontal negra (Fina)
  currentY += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  const drawFooter = () => {
    const footerY = pageHeight - 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(isMobile ? 6 : 9);
    doc.setFont('helvetica', 'normal');
    
    // Izquierda: Instagram
    doc.text("@kraken_pt", margin, footerY);
    
    // Centro: Frase actual
    doc.text(t.footer, pageWidth / 2, footerY, { align: 'center' });
    
    // Derecha: Celular
    doc.text("967 873 913", pageWidth - margin, footerY, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 30) {
      drawFooter();
      doc.addPage();
      currentY = margin + 10;
      return true;
    }
    return false;
  };

  // 4. Descripción
  checkPageBreak(30);
  currentY += 10;
  doc.setDrawColor(209, 4, 41); // Kraken Red
  doc.setLineWidth(1.5);
  doc.line(margin, currentY - 4, margin, currentY + 1); // Vertical accent

  doc.setFontSize(isMobile ? 8 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(t.descriptionLabel, margin + 4, currentY);
  
  currentY += isMobile ? 5 : 7;
  doc.setFontSize(isMobile ? 7.5 : 10);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(displayDescription, pageWidth - (margin * 2));
  splitDesc.forEach((line: string) => {
    checkPageBreak(isMobile ? 4.5 : 6);
    doc.text(line, margin, currentY);
    currentY += isMobile ? 4.5 : 6;
  });

  // Subtotal Mano de Obra
  checkPageBreak(8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isMobile ? 7.5 : 10);
  doc.setTextColor(0, 0, 0);
  const subtotalLaborLabel = targetLang === 'pt' ? 'Subtotal Mão de Obra' : targetLang === 'en' ? 'Labor Subtotal' : 'Subtotal Mano de Obra';
  doc.text(`${subtotalLaborLabel}: ${laborValue.toFixed(2)} €`, pageWidth - margin, currentY, { align: 'right' });
  currentY += isMobile ? 4.5 : 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Línea horizontal negra (Fina)
  checkPageBreak(10);
  currentY += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 5. Materiales
  checkPageBreak(30);
  currentY += 10;
  doc.setDrawColor(209, 4, 41); // Kraken Red
  doc.setLineWidth(1.5);
  doc.line(margin, currentY - 4, margin, currentY + 1); // Vertical accent

  doc.setFontSize(isMobile ? 8 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(t.materialsLabel, margin + 4, currentY);
  
  currentY += isMobile ? 5 : 7;
  doc.setFontSize(isMobile ? 7.5 : 10);
  doc.setFont('helvetica', 'normal');
  
  if (displayMaterials && displayMaterials.length > 0) {
    displayMaterials.forEach((mat) => {
      checkPageBreak(isMobile ? 6 : 10);
      const unit = (mat as any).unit || 'un.';
      const markup = typeof (data as any).config?.materialMarkup === 'number'
        ? (data as any).config.materialMarkup
        : 0.25;
      const unitPrice = mat.cost * (1 + markup);
      const totalMat = unitPrice * mat.quantity;
      
      const nameX = margin + (isMobile ? 3 : 5);
      const qtyX = isMobile ? (pageWidth - margin - 20) : (pageWidth - margin - 35);
      const priceX = pageWidth - margin;
      const maxNameWidth = isMobile ? (qtyX - nameX - 3) : 120;
      
      const splitName = doc.splitTextToSize(`• ${mat.name}`, maxNameWidth);
      
      splitName.forEach((line: string, index: number) => {
        if (index > 0) {
          checkPageBreak(isMobile ? 4.5 : 6);
        }
        doc.text(line, nameX, currentY);
        
        if (index === 0) {
          doc.text(`${mat.quantity} ${unit}`, qtyX, currentY, { align: 'right' });
          doc.text(`${totalMat.toFixed(2)} €`, priceX, currentY, { align: 'right' });
        }
        
        if (index < splitName.length - 1) {
          currentY += isMobile ? 4.5 : 6;
        }
      });
      currentY += isMobile ? 4.8 : 6;
    });
  } else {
    checkPageBreak(6);
    doc.text(`• ${t.noMaterials}`, margin + 5, currentY);
    currentY += isMobile ? 4.5 : 6;
  }

  // Subtotal Materiales
  checkPageBreak(8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isMobile ? 7.5 : 10);
  doc.setTextColor(0, 0, 0);
  const subtotalMatLabel = targetLang === 'pt' ? 'Subtotal Materiais' : targetLang === 'en' ? 'Materials Subtotal' : 'Subtotal Materiales';
  doc.text(`${subtotalMatLabel}: ${calculatedMaterialsSubtotal.toFixed(2)} €`, pageWidth - margin, currentY, { align: 'right' });
  currentY += isMobile ? 4.5 : 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Línea horizontal negra (Fina)
  checkPageBreak(10);
  currentY += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 6. Total General
  checkPageBreak(isMobile ? 20 : 35);
  currentY += isMobile ? 8 : 15;
  doc.setFontSize(isMobile ? 11.5 : 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(209, 4, 41); // Kraken Red
  
  const subtotal = data.calculation.subtotal;
  const showIVA = data.applyIVA !== false;
  
  doc.text(`${t.totalGeneral} ${subtotal.toFixed(2)} € ${showIVA ? `+ ${t.ivaLabel}` : ''}`, pageWidth - margin, currentY, { align: 'right' });

  // 7. Información de Pago
  checkPageBreak(isMobile ? 20 : 25);
  currentY += isMobile ? 10 : 15;
  doc.setFontSize(isMobile ? 7.5 : 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  const ibanText = "iban: DE95100110012356675960 (Eduardo Federico Martínez)";
  const splitIban = doc.splitTextToSize(ibanText, pageWidth - (margin * 2));
  splitIban.forEach((line: string) => {
    checkPageBreak(5);
    doc.text(line, margin, currentY);
    currentY += isMobile ? 4.5 : 5;
  });
  
  checkPageBreak(5);
  doc.text("mbway: +351 967 873 913", margin, currentY);
  currentY += isMobile ? 4.5 : 5;

  // 8. Condiciones del Servicio (Letra chica / Términos legales)
  currentY += isMobile ? 5 : 8; // Margen superior para separarlo visualmente de los datos bancarios
  checkPageBreak(12);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isMobile ? 7.5 : 9);
  doc.setTextColor(50, 50, 50);
  doc.text(t.termsTitle, margin, currentY);
  currentY += isMobile ? 4 : 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isMobile ? 5 : 6); // Color tenue "letra chica" y tamaño pequeño
  doc.setTextColor(110, 110, 110);

  const spacingY = isMobile ? 2.2 : 3;
  t.termsText.forEach((paragraph: string) => {
    const splitParagraph = doc.splitTextToSize(paragraph, pageWidth - (margin * 2));
    splitParagraph.forEach((line: string) => {
      checkPageBreak(spacingY + 2);
      doc.text(line, margin, currentY);
      currentY += spacingY;
    });
    currentY += 1.5; // Sutil separación entre párrafos
  });

  // 9. Pie de Página
  drawFooter();

  return doc;
};

export const generateWeeklyAgendaPDF = async (data: WeeklyAgendaPDFData, formatType: 'pc' | 'mobile' = 'pc') => {
  const isMobile = formatType === 'mobile';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isMobile ? [100, 200] : 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isMobile ? 10 : 20;

  // 1. Encabezado (Fondo Negro + Logo Centrado)
  const headerHeight = isMobile ? 25 : 35;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  try {
    const logoUrl = "/logo.png";
    const logoWidth = isMobile ? 45 : 65;
    const logoHeight = isMobile ? 18 : 26;
    doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
  } catch (e) {
    console.warn("Could not add logo to PDF", e);
  }

  doc.setTextColor(18, 18, 18);
  doc.setFontSize(isMobile ? 12 : 16);
  doc.setFont('helvetica', 'bold');
  doc.text('AGENDA SEMANAL', pageWidth / 2, headerHeight + (isMobile ? 8 : 15), { align: 'center' });

  // 2. Información del periodo
  const infoY = headerHeight + (isMobile ? 15 : 25);
  doc.setFontSize(isMobile ? 8 : 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Periodo: ${data.startDate} al ${data.endDate}`, margin, infoY);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, infoY, { align: 'right' });
  
  doc.setDrawColor(229, 229, 229);
  doc.line(margin, infoY + 3, pageWidth - margin, infoY + 3);

  let currentY = infoY + (isMobile ? 10 : 15);

  // 3. Detalle por día
  data.days.forEach((dayData) => {
    if (dayData.budgets.length === 0 && dayData.orders.length === 0) return;

    // Check if we need a new page
    if (currentY > (pageHeight - 30)) {
      doc.addPage();
      currentY = margin;
    }

    // Day Header
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, pageWidth - (margin * 2), isMobile ? 6 : 8, 'F');
    doc.setTextColor(18, 18, 18);
    doc.setFontSize(isMobile ? 9 : 11);
    doc.setFont('helvetica', 'bold');
    doc.text(format(dayData.date, 'EEEE dd/MM', { locale: es }).toUpperCase(), margin + 5, currentY + (isMobile ? 4.5 : 5.5));
    currentY += isMobile ? 10 : 12;

    // Work Orders for the day
    if (dayData.orders.length > 0) {
      doc.setFontSize(isMobile ? 8 : 9);
      doc.setTextColor(209, 4, 41); // Kraken Red
      doc.setFont('helvetica', 'bold');
      doc.text('ÓRDENES DE TRABAJO', margin + 5, currentY);
      currentY += isMobile ? 4 : 5;
      
      dayData.orders.forEach((order) => {
        doc.setTextColor(18, 18, 18);
        doc.setFont('helvetica', 'bold');
        doc.text(`• [${order.id}] ${order.clientName}`, margin + 8, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isMobile ? 7 : 8);
        
        const descLines = doc.splitTextToSize(order.description, pageWidth - (margin * 2) - 15);
        doc.text(descLines, margin + 12, currentY + 4);
        
        let offset = (descLines.length * (isMobile ? 3.5 : 4)) + 1;
        
        if (order.crewId) {
          doc.setFont('helvetica', 'bold');
          doc.text(`  Equipo: ${order.crewId}`, margin + 12, currentY + 4 + offset);
          doc.setFont('helvetica', 'normal');
          offset += isMobile ? 4 : 5;
        }

        if (order.assignedTo && order.assignedTo.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`  Asignado: ${order.assignedTo.join(', ')}`, margin + 12, currentY + 4 + offset);
          doc.setFont('helvetica', 'normal');
          offset += isMobile ? 4 : 5;
        }

        if (order.notes) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          const noteLines = doc.splitTextToSize(`Nota: ${order.notes}`, pageWidth - (margin * 2) - 20);
          doc.text(noteLines, margin + 12, currentY + 4 + offset);
          doc.setTextColor(18, 18, 18);
          doc.setFont('helvetica', 'normal');
          offset += (noteLines.length * (isMobile ? 3.5 : 4));
        }

        currentY += 4 + offset + 2;

        // Check if we need a new page
        if (currentY > (pageHeight - 20)) {
          doc.addPage();
          currentY = margin;
        }
      });
    }

    // Budgets for the day
    if (dayData.budgets.length > 0) {
      doc.setFontSize(isMobile ? 8 : 9);
      doc.setTextColor(255, 100, 0); // Kraken Orange
      doc.setFont('helvetica', 'bold');
      doc.text('PRESUPUESTOS PROGRAMADOS', margin + 5, currentY);
      currentY += isMobile ? 4 : 5;
      
      dayData.budgets.forEach((budget) => {
        doc.setTextColor(18, 18, 18);
        doc.setFont('helvetica', 'bold');
        doc.text(`• [${budget.id}] ${budget.clientName}`, margin + 8, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isMobile ? 7 : 8);
        
        const descLines = doc.splitTextToSize(budget.description, pageWidth - (margin * 2) - 15);
        doc.text(descLines, margin + 12, currentY + 4);
        
        let budgetOffset = (descLines.length * (isMobile ? 3.5 : 4)) + 4;

        if (budget.internalNotes) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          const bNoteLines = doc.splitTextToSize(`Nota: ${budget.internalNotes}`, pageWidth - (margin * 2) - 20);
          doc.text(bNoteLines, margin + 12, currentY + 4 + budgetOffset);
          doc.setTextColor(18, 18, 18);
          doc.setFont('helvetica', 'normal');
          budgetOffset += (bNoteLines.length * (isMobile ? 3.5 : 4)) + 2;
        }

        currentY += 4 + budgetOffset;

        // Check if we need a new page
        if (currentY > (pageHeight - 20)) {
          doc.addPage();
          currentY = margin;
        }
      });
    }

    currentY += 2;
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += isMobile ? 6 : 10;
  });

  // 4. Pie de Página
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(isMobile ? 8 : 10);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('Somos confianza, somos kraken', pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc;
};

export const generateMaintenancePDF = async (record: MaintenanceRecord, overrideLang?: 'es' | 'pt' | 'en'): Promise<jsPDF> => {
  const targetLang = overrideLang || record.language || 'es';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width || 210;
  const pageHeight = doc.internal.pageSize.height || 297;
  const margin = 15;

  const mt = {
    es: {
      title: 'FICHA DE MANTENIMIENTO PREVENTIVO',
      sectionTitle: 'DATOS DEL MANTENIMIENTO',
      clientLabel: 'Cliente',
      addressLabel: 'Dirección',
      phoneLabel: 'Teléfono',
      emailLabel: 'Email',
      dateLabel: 'Fecha Revisión',
      nextDateLabel: 'Próxima Revisión',
      statusLabel: 'Estado Ficha',
      employeeLabel: 'Empleado Asignado',
      tableHeaders: ['Categoría', 'Tarea', 'Estado', 'Observaciones de Tarea'],
      obsTitle: 'OBSERVACIONES GENERALES',
      techSignature: 'Firma del Técnico',
      clientSignature: 'Firma del Cliente',
      termsTitle: 'CONDICIONES DEL SERVICIO:',
      termsText: [
        'Los materiales podrán ser suministrados por Kraken Handyman para facilitar la ejecución de los trabajos. No obstante, Kraken Handyman no será responsable por defectos de fabricación, calidad, durabilidad o fallas propias de los materiales utilizados.',
        'Forma de pago: 50% al confirmar el presupuesto y reservar agenda. El 50% restante deberá abonarse al finalizar los trabajos.',
        'Los trabajos o modificaciones no incluidos expresamente en este presupuesto serán considerados adicionales y se presupuestarán por separado.',
        'Este presupuesto tiene una validez de 15 días desde su fecha de emisión.',
        'La aceptación del presente presupuesto implica la conformidad del cliente con estas condiciones.\nEl personal de Kraken tiene Seguro de accidente y responsabilidad civil.'
      ],
      emptyObs: 'Sin observaciones adicionales registradas.'
    },
    pt: {
      title: 'FICHA DE MANUTENÇÃO PREVENTIVA',
      sectionTitle: 'DADOS DA MANUTENÇÃO',
      clientLabel: 'Cliente',
      addressLabel: 'Morada',
      phoneLabel: 'Telemóvel',
      emailLabel: 'E-mail',
      dateLabel: 'Data de Revisão',
      nextDateLabel: 'Próxima Revisão',
      statusLabel: 'Estado Ficha',
      employeeLabel: 'Funcionário Atribuído',
      tableHeaders: ['Categoria', 'Tarefa', 'Estado', 'Observações de Tarefa'],
      obsTitle: 'OBSERVAÇÕES GERAIS',
      techSignature: 'Assinatura do Técnico',
      clientSignature: 'Assinatura do Cliente',
      termsTitle: 'CONDIÇÕES DO SERVIÇO:',
      termsText: [
        'Os materiais podem ser fornecidos pela Kraken Handyman para facilitar a execução dos trabalhos. No entanto, a Kraken Handyman não será responsável por defeitos de fabrico, qualidade, durabilidade ou falhas próprias dos materiais utilizados.',
        'Forma de pagamento: 50% na confirmação do orçamento e reserva de agenda. Os restantes 50% devem ser pagos no final dos trabalhos.',
        'Os trabalhos ou modificações não incluídos expressamente neste orçamento serão considerados adicionais e serão orçamentados em separado.',
        'Este orçamento é válido por 15 dias a contar da data de emissão.',
        'A aceitação deste orçamento implica a conformidade do cliente com estas condições.\nO pessoal da Kraken tem seguro de acidentes e responsabilidade civil.'
      ],
      emptyObs: 'Sem observações adicionais registadas.'
    },
    en: {
      title: 'PREVENTIVE MAINTENANCE SHEET',
      sectionTitle: 'MAINTENANCE DETAILS',
      clientLabel: 'Client',
      addressLabel: 'Address',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
      dateLabel: 'Revision Date',
      nextDateLabel: 'Next Revision',
      statusLabel: 'Sheet Status',
      employeeLabel: 'Assigned Employee',
      tableHeaders: ['Category', 'Task', 'Status', 'Task Observations'],
      obsTitle: 'GENERAL OBSERVATIONS',
      techSignature: 'Technician Signature',
      clientSignature: 'Client Signature',
      termsTitle: 'TERMS OF SERVICE:',
      termsText: [
        'Materials may be supplied by Kraken Handyman to facilitate the execution of the works. However, Kraken Handyman shall not be liable for manufacturing defects, quality, durability, or failures inherent to the materials used.',
        'Payment process: 50% upon confirmation of the budget and booking the schedule. The remaining 50% must be paid upon completion of the works.',
        'Any works or modifications not expressly included in this budget will be considered additional and will be quoted separately.',
        'This budget is valid for 15 days from its date of issue.',
        'The acceptance of this budget implies the customer\'s agreement with these terms.\nKraken personnel have accident and civil liability insurance.'
      ],
      emptyObs: 'No additional observations recorded.'
    }
  }[targetLang];

  // Dynamic translators using Gemini API (if language is not Spanish)
  let displayObservations = record.generalObservations || '';
  let displayChecklist = [...record.checklist];

  if (targetLang !== 'es') {
    try {
      if (displayObservations) {
        displayObservations = await translateText(displayObservations, targetLang);
      }
      displayChecklist = await Promise.all(record.checklist.map(async (item) => {
        let cat = item.category || '';
        let tsk = item.task || '';
        let nts = item.notes || '';
        try {
          if (cat && cat !== 'Personalizado') cat = await translateText(cat, targetLang);
          if (cat === 'Personalizado') cat = targetLang === 'en' ? 'Custom' : targetLang === 'pt' ? 'Personalizado' : 'Personalizado';
          if (tsk) tsk = await translateText(tsk, targetLang);
          if (nts) nts = await translateText(nts, targetLang);
        } catch {
          // ignore error
        }
        return { ...item, category: cat, task: tsk, notes: nts };
      }));
    } catch (e) {
      console.warn("Translation failed for maintenance checklist", e);
    }
  }

  // 1. Encabezado (Fondo Negro + Logo Centrado como el presupuesto)
  const headerHeight = 35;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  try {
    const logoUrl = "/logo.png";
    const logoWidth = 65;
    const logoHeight = 26;
    doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
  } catch (e) {
    console.warn("Could not add logo to PDF", e);
  }

  // Título Centrado
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(mt.title, pageWidth / 2, headerHeight + 12, { align: 'center' });

  // Divider Line
  doc.setDrawColor(209, 4, 41);
  doc.setLineWidth(1);
  doc.line(margin, headerHeight + 17, pageWidth - margin, headerHeight + 17);

  // Client and Metadata Grid
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(mt.sectionTitle, margin, headerHeight + 25);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(18, 18, 18);

  const leftX = margin;
  const rightX = pageWidth / 2 + 10;
  let currentY = headerHeight + 31;

  // Left column: Client details
  doc.text(`${mt.clientLabel}: ${record.clientData?.name || 'N/A'}`, leftX, currentY);
  doc.text(`${mt.addressLabel}: ${record.clientData?.address || 'N/A'}`, leftX, currentY + 6);
  doc.text(`${mt.phoneLabel}: ${record.clientData?.phone || 'N/A'}`, leftX, currentY + 12);
  doc.text(`${mt.emailLabel}: ${record.clientData?.email || 'N/A'}`, leftX, currentY + 18);

  // Right column: Date and tech details
  doc.text(`${mt.dateLabel}: ${record.date || 'N/A'}`, rightX, currentY);
  doc.text(`${mt.nextDateLabel}: ${record.nextRevisionDate || 'N/A'}`, rightX, currentY + 6);
  doc.text(`${mt.statusLabel}: ${record.status || 'N/A'}`, rightX, currentY + 12);
  if (record.assignedEmployee) {
    doc.text(`${mt.employeeLabel}: ${record.assignedEmployee}`, rightX, currentY + 18);
  }

  currentY += 28;

  // 2. Table of Checklist Items
  const tableData = displayChecklist.map((item) => [
    item.category || '',
    item.task || '',
    item.status || '',
    item.notes || ''
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [mt.tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: 'bold',
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    bodyStyles: {
      textColor: [60, 60, 60],
      lineColor: [230, 230, 230],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 70 },
      2: { fontStyle: 'bold', textColor: [255, 100, 0], cellWidth: 25, halign: 'center' },
      3: { cellWidth: 40 }
    },
    theme: 'plain'
  });

  // Calculate position after table
  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // Ensure observations and details fit on page, otherwise add a new page
  if (finalY > (pageHeight - 65)) {
    doc.addPage();
    finalY = margin + 15;
  }

  // General observations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(mt.obsTitle, margin, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const obsText = displayObservations || mt.emptyObs;
  const obsLines = doc.splitTextToSize(obsText, pageWidth - (margin * 2));
  doc.text(obsLines, margin, finalY + 6);

  finalY += 12 + (obsLines.length * 4.5);

  // Signatures block
  if (finalY > (pageHeight - 75)) {
    doc.addPage();
    finalY = margin + 15;
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);

  // Signature line 1
  doc.line(margin + 5, finalY + 12, margin + 65, finalY + 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(mt.techSignature, margin + 20, finalY + 17);

  // Signature line 2
  doc.line(pageWidth - margin - 65, finalY + 12, pageWidth - margin - 5, finalY + 12);
  doc.text(mt.clientSignature, pageWidth - margin - 50, finalY + 17);

  // Legal text / service conditions at the bottom of the last page
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(mt.termsTitle, margin, pageHeight - 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  
  let textY = pageHeight - 39;
  mt.termsText.forEach((paragraph) => {
    const splitParagraph = doc.splitTextToSize(paragraph, pageWidth - (margin * 2));
    splitParagraph.forEach((line: string) => {
      doc.text(line, margin, textY);
      textY += 3.5;
    });
    textY += 1;
  });

  return doc;
};

export const generateAgreementPDF = async (agreement: ClientAgreement, formatType: 'pc' | 'mobile' = 'pc'): Promise<jsPDF> => {
  const isMobile = formatType === 'mobile';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isMobile ? [100, 200] : 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isMobile ? 10 : 20;

  const lang = agreement.language || 'pt';

  const translationsMap: Record<string, any> = {
    pt: {
      title: 'CONVÉNIO DE PRESTAÇÃO DE SERVIÇOS',
      clientSection: 'DADOS DO CLIENTE',
      client: 'Cliente:',
      address: 'Morada:',
      nif: 'NIF:',
      contact: 'Contacto:',
      phone: 'Telefone:',
      email: 'Email:',
      detailsSection: 'DETALHES DO CONVÉNIO',
      startDate: 'Data de Início:',
      endDate: 'Data de Fim:',
      weekdays: 'Dias de Trabalho:',
      weeksToWork: 'Semanas a Trabalhar:',
      clausesSection: 'CLÁUSULAS DO ACORDO',
      footerText: 'Somos confiança, somos Kraken'
    },
    es: {
      title: 'CONVENIO DE PRESTACIÓN DE SERVICIOS',
      clientSection: 'DATOS DEL CLIENTE',
      client: 'Cliente:',
      address: 'Dirección:',
      nif: 'NIF:',
      contact: 'Contacto:',
      phone: 'Teléfono:',
      email: 'Email:',
      detailsSection: 'DETALLES DEL CONVENIO',
      startDate: 'Fecha de Inicio:',
      endDate: 'Fecha de Fin:',
      weekdays: 'Días de Trabajo:',
      weeksToWork: 'Semanas a Trabajar:',
      clausesSection: 'CLÁUSULAS DEL ACUERDO',
      footerText: 'Somos confianza, somos Kraken'
    },
    en: {
      title: 'SERVICE PROVISION AGREEMENT',
      clientSection: 'CLIENT DETAILS',
      client: 'Client:',
      address: 'Address:',
      nif: 'Tax ID (NIF):',
      contact: 'Contact Person:',
      phone: 'Phone:',
      email: 'Email:',
      detailsSection: 'AGREEMENT DETAILS',
      startDate: 'Start Date:',
      endDate: 'End Date:',
      weekdays: 'Work Days:',
      weeksToWork: 'Weeks to Work:',
      clausesSection: 'TERMS & CLAUSES',
      footerText: 'Somos confiança, somos Kraken'
    }
  };

  // Helper to translate weekdays to target language
  const normalizeWeekdaysMap: Record<string, string> = {
    'segunda': 'mon', 'terça': 'tue', 'quarta': 'wed', 'quinta': 'thu', 'sexta': 'fri', 'sábado': 'sat', 'domingo': 'sun',
    'segunda-feira': 'mon', 'terça-feira': 'tue', 'quarta-feira': 'wed', 'quinta-feira': 'thu', 'sexta-feira': 'fri',
    'lunes': 'mon', 'martes': 'tue', 'miércoles': 'wed', 'miercoles': 'wed', 'jueves': 'thu', 'viernes': 'fri', 'sabado': 'sat',
    'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed', 'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun',
    'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu', 'fri': 'fri', 'sat': 'sat', 'sun': 'sun'
  };

  const weekdayTranslationsMap: Record<string, Record<string, string>> = {
    pt: { mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo' },
    es: { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' },
    en: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
  };

  const translateWeekday = (day: string, targetLang: 'pt' | 'es' | 'en'): string => {
    const norm = normalizeWeekdaysMap[day.toLowerCase().trim()];
    if (norm && weekdayTranslationsMap[targetLang]) {
      return weekdayTranslationsMap[targetLang][norm];
    }
    return day;
  };

  const drawFormattedLine = (pdfDoc: jsPDF, lineText: string, x: number, y: number, defaultSize: number) => {
    const parts = lineText.split(/(\*\*[^*]+\*\*)/g);
    let currentX = x;
    
    parts.forEach((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanPart = part.substring(2, part.length - 2);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setFontSize(defaultSize);
        pdfDoc.text(cleanPart, currentX, y);
        currentX += pdfDoc.getTextWidth(cleanPart);
      } else {
        const subParts = part.split(/(\*[^*]+\*)/g);
        subParts.forEach((subPart) => {
          if (subPart.startsWith('*') && subPart.endsWith('*')) {
            const cleanSub = subPart.substring(1, subPart.length - 1);
            pdfDoc.setFont('helvetica', 'italic');
            pdfDoc.setFontSize(defaultSize);
            pdfDoc.text(cleanSub, currentX, y);
            currentX += pdfDoc.getTextWidth(cleanSub);
          } else {
            const underlineParts = subPart.split(/(__[^_]+__)/g);
            underlineParts.forEach((uPart) => {
              if (uPart.startsWith('__') && uPart.endsWith('__')) {
                const cleanU = uPart.substring(2, uPart.length - 2);
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setFontSize(defaultSize);
                pdfDoc.text(cleanU, currentX, y);
                // Draw a line below the text for underline effect
                const textWidth = pdfDoc.getTextWidth(cleanU);
                pdfDoc.setLineWidth(0.2);
                pdfDoc.setDrawColor(40, 40, 40);
                pdfDoc.line(currentX, y + 0.6, currentX + textWidth, y + 0.6);
                currentX += textWidth;
              } else {
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setFontSize(defaultSize);
                pdfDoc.text(uPart, currentX, y);
                currentX += pdfDoc.getTextWidth(uPart);
              }
            });
          }
        });
      }
    });
    pdfDoc.setFont('helvetica', 'normal');
  };

  const t = translationsMap[lang] || translationsMap.pt;

  let currentY = 10;

  const drawHeaderAndFooter = (pageNumber: number) => {
    // Header
    const headerHeight = isMobile ? 25 : 35;
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    try {
      const logoUrl = "/logo.png";
      const logoWidth = isMobile ? 45 : 65;
      const logoHeight = isMobile ? 18 : 26;
      doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, (headerHeight - logoHeight) / 2, logoWidth, logoHeight);
    } catch (e) {
      console.warn("Could not add logo to PDF", e);
    }

    // Red bar below header
    const redBarHeight = isMobile ? 2 : 3;
    doc.setFillColor(209, 4, 41);
    doc.rect(0, headerHeight, pageWidth, redBarHeight, 'F');

    // Footer Red Banner
    const footerHeight = isMobile ? 12 : 16;
    doc.setFillColor(209, 4, 41);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(isMobile ? 10 : 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Somos confiança, somos Kraken', pageWidth / 2, pageHeight - (footerHeight / 2) + (isMobile ? 1.5 : 2), { align: 'center' });
  };

  // Helper to check for page break
  const checkPageBreak = (neededHeight: number) => {
    const bottomLimit = pageHeight - (isMobile ? 16 : 22);
    if (currentY + neededHeight > bottomLimit) {
      doc.addPage();
      drawHeaderAndFooter(doc.getNumberOfPages());
      currentY = (isMobile ? 25 : 35) + (isMobile ? 8 : 12); // Start below header + red bar
      return true;
    }
    return false;
  };

  // Draw first page header and footer
  drawHeaderAndFooter(1);
  currentY = (isMobile ? 25 : 35) + (isMobile ? 10 : 15);

  // Title
  doc.setTextColor(18, 18, 18);
  doc.setFontSize(isMobile ? 12 : 16);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title, pageWidth / 2, currentY, { align: 'center' });
  currentY += isMobile ? 8 : 12;

  // Client Details Section
  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(209, 4, 41); // Red Section Title
  doc.text(t.clientSection, margin, currentY);
  currentY += isMobile ? 5 : 7;

  // Thin separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.25);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += isMobile ? 5 : 7;

  // Client details text
  doc.setFontSize(isMobile ? 8.5 : 10.5);
  doc.setTextColor(40, 40, 40);

  const clientInfo = [
    { label: t.client, value: agreement.clientData.name },
    { label: t.address, value: agreement.clientData.address },
    { label: t.nif, value: agreement.clientData.nif || 'N/A' },
    { label: t.contact, value: agreement.clientData.contact || 'N/A' },
    { label: t.phone, value: agreement.clientData.phone },
    { label: t.email, value: agreement.clientData.email || 'N/A' },
  ];

  clientInfo.forEach((info) => {
    checkPageBreak(isMobile ? 5 : 7);
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    const valueX = margin + (isMobile ? 20 : 30);
    const splitVal = doc.splitTextToSize(info.value, pageWidth - valueX - margin);
    doc.text(splitVal, valueX, currentY);
    
    currentY += (splitVal.length * (isMobile ? 4.5 : 6)) + 1;
  });

  currentY += isMobile ? 3 : 5;

  // Agreement Details Section
  checkPageBreak(isMobile ? 30 : 45);
  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(209, 4, 41);
  doc.text(t.detailsSection, margin, currentY);
  currentY += isMobile ? 5 : 7;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += isMobile ? 5 : 7;

  doc.setFontSize(isMobile ? 8.5 : 10.5);
  doc.setTextColor(40, 40, 40);

  const weekdaysStr = agreement.weekdays && agreement.weekdays.length > 0 
    ? agreement.weekdays.map(d => translateWeekday(d, lang)).join(', ') 
    : 'N/A';

  const detailsInfo = [
    { label: t.startDate, value: agreement.startDate },
    { label: t.endDate, value: agreement.endDate },
    { label: t.weekdays, value: weekdaysStr },
    { label: t.weeksToWork, value: String(agreement.weeksToWork) },
  ];

  detailsInfo.forEach((info) => {
    checkPageBreak(isMobile ? 5 : 7);
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    const valueX = margin + (isMobile ? 35 : 45);
    const splitVal = doc.splitTextToSize(info.value, pageWidth - valueX - margin);
    doc.text(splitVal, valueX, currentY);
    
    currentY += (splitVal.length * (isMobile ? 4.5 : 6)) + 1;
  });

  currentY += isMobile ? 4 : 8;

  // Free text clauses section
  checkPageBreak(isMobile ? 30 : 40);
  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(209, 4, 41);
  doc.text(t.clausesSection, margin, currentY);
  currentY += isMobile ? 5 : 7;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += isMobile ? 6 : 9;

  // Main Agreement text with formatting support
  const contentParagraphs = agreement.content.split('\n');
  contentParagraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      currentY += isMobile ? 3 : 5;
      return;
    }

    // Check for Horizontal Rule
    if (trimmed === '---') {
      checkPageBreak(isMobile ? 4 : 6);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += isMobile ? 5 : 8;
      return;
    }

    // Check for H1 Title
    if (trimmed.startsWith('# ')) {
      const titleText = trimmed.substring(2);
      doc.setFontSize(isMobile ? 11 : 14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(209, 4, 41); // red H1
      
      const splitTitle = doc.splitTextToSize(titleText, pageWidth - (margin * 2));
      splitTitle.forEach((line: string) => {
        checkPageBreak(isMobile ? 6 : 8);
        doc.text(line, margin, currentY);
        currentY += isMobile ? 5 : 7;
      });
      currentY += isMobile ? 2 : 4;
      return;
    }

    // Check for H2 Title
    if (trimmed.startsWith('## ')) {
      const titleText = trimmed.substring(3);
      doc.setFontSize(isMobile ? 9.5 : 12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(18, 18, 18);
      
      const splitTitle = doc.splitTextToSize(titleText, pageWidth - (margin * 2));
      splitTitle.forEach((line: string) => {
        checkPageBreak(isMobile ? 5 : 7);
        doc.text(line, margin, currentY);
        currentY += isMobile ? 4.5 : 6;
      });
      currentY += isMobile ? 1.5 : 3;
      return;
    }

    // Check for Bullet list
    let isBullet = false;
    let bulletText = paragraph;
    if (trimmed.startsWith('• ')) {
      isBullet = true;
      bulletText = trimmed.substring(2);
    } else if (trimmed.startsWith('* ')) {
      isBullet = true;
      bulletText = trimmed.substring(2);
    } else if (trimmed.startsWith('- ')) {
      isBullet = true;
      bulletText = trimmed.substring(2);
    }

    doc.setFontSize(isMobile ? 8.5 : 10);
    doc.setTextColor(10, 10, 10);

    if (isBullet) {
      const indentX = isMobile ? 4 : 6;
      const textWidthLimit = pageWidth - (margin * 2) - indentX;
      const splitLines = doc.splitTextToSize(bulletText, textWidthLimit);
      
      splitLines.forEach((line: string, index: number) => {
        checkPageBreak(isMobile ? 5 : 7);
        if (index === 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('•', margin + (isMobile ? 1 : 2), currentY);
        }
        
        doc.setFont('helvetica', 'normal');
        drawFormattedLine(doc, line, margin + indentX, currentY, isMobile ? 8.5 : 10);
        currentY += isMobile ? 4.5 : 6;
      });
    } else {
      const splitLines = doc.splitTextToSize(paragraph, pageWidth - (margin * 2));
      splitLines.forEach((line: string) => {
        checkPageBreak(isMobile ? 5 : 7);
        doc.setFont('helvetica', 'normal');
        drawFormattedLine(doc, line, margin, currentY, isMobile ? 8.5 : 10);
        currentY += isMobile ? 4.5 : 6;
      });
    }
    currentY += isMobile ? 2.5 : 4;
  });

  return doc;
};

