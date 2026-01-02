import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Treatment, PatientProfile } from '../types';

export const generateTreatmentPDF = (treatment: Treatment, patient: PatientProfile) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // --- Colors ---
    const brandColor: [number, number, number] = [37, 99, 235]; // Blue-600 #2563EB
    const darkText: [number, number, number] = [30, 41, 59];    // Slate-800
    const lightText: [number, number, number] = [100, 116, 139]; // Slate-500
    const borderColor: [number, number, number] = [226, 232, 240]; // Slate-200

    // --- Header Section ---
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo / Title area
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDCHAIN', margin, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SECURE ELECTRONIC MEDICAL RECORD', margin, 32);

    // Document Info (Right aligned in Header)
    doc.setFontSize(10);
    doc.text(`DATE: ${new Date(treatment.timestamp).toLocaleDateString()}`, pageWidth - margin, 20, { align: 'right' });
    doc.text(`RECORD ID: #${treatment.id.slice(-6).toUpperCase()}`, pageWidth - margin, 26, { align: 'right' });

    // Tag
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 25, 35, 25, 6, 2, 2, 'F');
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('VERIFIED', pageWidth - margin - 12.5, 39, { align: 'center' });

    // --- Context Info Section (Doctor & Patient) ---
    const infoStartY = 70;

    // Left Column: Patient Info
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);

    // Label for Patient
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text('PATIENT INFORMATION', margin, infoStartY);

    // Patient Name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(patient.name.toUpperCase(), margin, infoStartY + 8);

    // Patient Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text(`CNIC: ${patient.cnic || 'N/A'}`, margin, infoStartY + 14);
    doc.text(`Email: ${patient.email}`, margin, infoStartY + 19);

    // Right Column: Doctor Info
    const col2X = pageWidth / 2 + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text('ATTENDING PHYSICIAN', col2X, infoStartY);

    // Doctor Name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(treatment.doctorName.toUpperCase(), col2X, infoStartY + 8);

    // Doctor Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text('MedChain Certified Specialist', col2X, infoStartY + 14);
    doc.text(`Authorization ID: ${treatment.doctorId.slice(-8).toUpperCase()}`, col2X, infoStartY + 19);

    // Divider Line
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, infoStartY + 28, pageWidth - margin, infoStartY + 28);


    // --- Clinical Data Table ---
    // Using autoTable for professional layout

    const tableData = [
        ['DIAGNOSIS', treatment.diagnosis],
        ['MEDICATION & DOSAGE', treatment.medication],
        ['CLINICAL NOTES', treatment.notes || 'No notes provided.']
    ];

    autoTable(doc, {
        startY: infoStartY + 35,
        margin: { left: margin, right: margin },
        head: [], // No header, just key-value pairs
        body: tableData,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 8,
            overflow: 'linebreak'
        },
        columnStyles: {
            0: {
                fontStyle: 'bold',
                textColor: lightText,
                cellWidth: 60,
                valign: 'top'
            },
            1: {
                textColor: darkText,
                valign: 'top',
                fontStyle: 'normal'
            }
        },
        didDrawCell: (data) => {
            // Add a bottom border to each row manually for a cleaner look
            if (data.section === 'body' && data.column.index === 1) {
                const { x, y, width, height } = data.cell;
                // doc.setDrawColor(240, 240, 240);
                // doc.line(x - 60, y + height, x + width, y + height);
            }
        }
    });

    // --- Attachments Section ---
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    if (treatment.files && treatment.files.length > 0) {
        // Section Header
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 12, 2, 2, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(lightText[0], lightText[1], lightText[2]);
        doc.text('ATTACHED DIAGNOSTIC ASSETS', margin + 5, finalY + 8);

        finalY += 20;

        treatment.files.forEach((file) => {
            // Bullet point style
            doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
            doc.circle(margin + 4, finalY - 1, 1.5, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(darkText[0], darkText[1], darkText[2]);
            doc.text(file.fileName, margin + 10, finalY);

            doc.setFontSize(8);
            doc.setTextColor(lightText[0], lightText[1], lightText[2]);
            doc.text(`[${file.fileType}]`, margin + 10 + doc.getTextWidth(file.fileName) + 5, finalY);

            finalY += 8;
        });
    }

    // --- Footer ---
    // Stick to bottom
    const footerY = pageHeight - 20;

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text('Generated by MedChain EMR System', margin, footerY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL - MEDICAL RECORD', pageWidth - margin, footerY + 5, { align: 'right' });

    // Save
    doc.save(`MedChain_Record_${treatment.id.slice(-6)}.pdf`);
};
