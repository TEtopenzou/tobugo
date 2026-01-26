import jsPDF from 'jspdf';

interface ItineraryData {
  days: Array<{
    date: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
      type: string;
      cost?: number;
      location?: string;
    }>;
    totalCost: number;
  }>;
  totalCost: number;
  costBreakdown: {
    flights: number;
    accommodation: number;
    activities: number;
    meals: number;
    transport: number;
  };
}

export const generatePDF = async (itinerary: ItineraryData): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 150, 243); // Primary color
  doc.text('Tu Itinerario de Viaje', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Cost Summary
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumen de Costos', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(`Costo Total: $${itinerary.totalCost?.toLocaleString() || '0'}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Días de viaje: ${itinerary.days?.length || 0}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Promedio diario: $${Math.round((itinerary.totalCost || 0) / (itinerary.days?.length || 1)).toLocaleString()}`, 20, yPosition);
  yPosition += 15;

  // Cost Breakdown
  if (itinerary.costBreakdown) {
    doc.text('Desglose de costos:', 20, yPosition);
    yPosition += 8;

    const breakdown = [
      { name: 'Vuelos', amount: itinerary.costBreakdown.flights },
      { name: 'Hospedaje', amount: itinerary.costBreakdown.accommodation },
      { name: 'Actividades', amount: itinerary.costBreakdown.activities },
      { name: 'Comidas', amount: itinerary.costBreakdown.meals },
      { name: 'Transporte', amount: itinerary.costBreakdown.transport || 0 },
    ].filter(item => item.amount > 0);

    breakdown.forEach(item => {
      doc.text(`• ${item.name}: $${item.amount.toLocaleString()}`, 25, yPosition);
      yPosition += 6;
    });
  }

  yPosition += 10;

  // Itinerary Days
  if (itinerary.days && itinerary.days.length > 0) {
    doc.setFontSize(16);
    doc.text('Itinerario Detallado', 20, yPosition);
    yPosition += 15;

    itinerary.days.forEach((day, dayIndex) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Day header
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      const dayDate = new Date(day.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Día ${dayIndex + 1} - ${dayDate}`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total del día: $${day.totalCost?.toLocaleString() || '0'}`, 20, yPosition);
      yPosition += 15;

      // Activities
      if (day.activities && day.activities.length > 0) {
        day.activities.forEach(activity => {
          // Check if we need a new page
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(`${activity.time} - ${activity.title}`, 25, yPosition);
          yPosition += 6;

          if (activity.description) {
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const descLines = doc.splitTextToSize(activity.description, pageWidth - 50);
            doc.text(descLines, 25, yPosition);
            yPosition += descLines.length * 4;
          }

          if (activity.cost) {
            doc.setFontSize(10);
            doc.setTextColor(33, 150, 243);
            doc.text(`Costo: $${activity.cost}`, 25, yPosition);
            yPosition += 6;
          }

          yPosition += 5;
        });
      }

      yPosition += 10;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generado por TobuGo - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `itinerario-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
