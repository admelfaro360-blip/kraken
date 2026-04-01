import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalculationResult, Phase, Material, Budget, WorkOrder } from '../types';
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
    footer: 'Somos confianza, somos kraken'
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
    footer: 'Somos confiança, somos kraken'
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
    footer: 'We are trust, we are kraken'
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
  doc.setFontSize(isMobile ? 8 : 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.budgetNo} ${data.id}`, margin, currentY);
  doc.text(`${t.date} ${data.date}`, pageWidth - margin, currentY, { align: 'right' });
  
  // Título Centrado
  currentY += isMobile ? 8 : 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(isMobile ? 14 : 18);
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
  
  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(t.clientData, margin + 4, currentY);
  
  currentY += 7;
  doc.setFontSize(isMobile ? 9 : 11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.clientName} ${data.client.name}`, margin, currentY);
  currentY += 6;
  doc.text(`${t.clientPhone} ${data.client.phone}`, margin, currentY);
  currentY += 6;
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
    doc.setFontSize(isMobile ? 8 : 9);
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

  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(t.descriptionLabel, margin + 4, currentY);
  
  currentY += 7;
  doc.setFontSize(isMobile ? 9 : 10);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(displayDescription, pageWidth - (margin * 2));
  splitDesc.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, currentY);
    currentY += 6;
  });

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

  doc.setFontSize(isMobile ? 10 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(t.materialsLabel, margin + 4, currentY);
  
  currentY += 7;
  doc.setFontSize(isMobile ? 9 : 10);
  doc.setFont('helvetica', 'normal');
  
  if (displayMaterials && displayMaterials.length > 0) {
    displayMaterials.forEach((mat) => {
      checkPageBreak(6);
      const unit = (mat as any).unit || 'un.';
      const unitPrice = mat.cost * (1 + (data as any).config?.materialMarkup || 0.25);
      const totalMat = unitPrice * mat.quantity;
      
      doc.text(`• ${mat.name}`, margin + 5, currentY);
      doc.text(`${mat.quantity} ${unit}`, pageWidth - margin - 35, currentY, { align: 'right' });
      doc.text(`${totalMat.toFixed(2)} €`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;
    });
  } else {
    checkPageBreak(6);
    doc.text(`• ${t.noMaterials}`, margin + 5, currentY);
    currentY += 6;
  }

  // Línea horizontal negra (Fina)
  checkPageBreak(10);
  currentY += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 6. Total General
  checkPageBreak(35);
  currentY += 15;
  doc.setFontSize(isMobile ? 12 : 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(209, 4, 41); // Kraken Red
  
  const subtotal = data.calculation.subtotal;
  
  doc.text(`${t.totalGeneral} ${subtotal.toFixed(2)} € + ${t.ivaLabel}`, pageWidth - margin, currentY, { align: 'right' });

  // 7. Información de Pago
  checkPageBreak(30);
  currentY += 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text("Forma de Pago: (50% al inicio de obra)", margin, currentY);
  currentY += 5;
  doc.text("iban: DE95100110012356675960 (Eduardo Federico Martínez)", margin, currentY);
  currentY += 5;
  doc.text("mbway: +351 967 873 913", margin, currentY);

  // 8. Pie de Página
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
