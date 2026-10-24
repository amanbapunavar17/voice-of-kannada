import { jsPDF } from "jspdf";
import type { CertificateRecord } from "../types";

export function generateCertificatePdf(cert: CertificateRecord) {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const width = 297;
  const height = 210;

  // Background Warm Cream: #FAF7F0
  doc.setFillColor(250, 247, 240);
  doc.rect(0, 0, width, height, "F");

  // Outer Border: Karnataka Deep Green (#174B3A)
  doc.setDrawColor(23, 75, 58);
  doc.setLineWidth(3);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner Ornate Border: Rich Gold (#D4A64A)
  doc.setDrawColor(212, 166, 74);
  doc.setLineWidth(1);
  doc.rect(14, 14, width - 28, height - 28);

  // Corner Accents (Gold Flourishes)
  const cornerSize = 12;
  const corners = [
    [15, 15],
    [width - 15 - cornerSize, 15],
    [15, height - 15 - cornerSize],
    [width - 15 - cornerSize, height - 15 - cornerSize],
  ];

  corners.forEach(([cx, cy]) => {
    doc.setDrawColor(212, 166, 74);
    doc.setLineWidth(1.5);
    doc.rect(cx, cy, cornerSize, cornerSize);
  });

  // Top Header: Branding
  doc.setTextColor(23, 75, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("MAATU  |  VOICE OF KANNADA", width / 2, 34, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(115, 120, 111);
  doc.setFont("helvetica", "normal");
  doc.text("ACADEMY OF KANNADA LANGUAGE & CULTURAL PROFICIENCY", width / 2, 42, { align: "center" });

  // Thin Gold Line
  doc.setDrawColor(212, 166, 74);
  doc.setLineWidth(0.6);
  doc.line(70, 48, width - 70, 48);

  // Certificate Title
  doc.setTextColor(212, 166, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CERTIFICATE OF ACHIEVEMENT", width / 2, 58, { align: "center" });

  // Body: Presented To
  doc.setFontSize(12);
  doc.setTextColor(115, 120, 111);
  doc.setFont("helvetica", "italic");
  doc.text("This is to certify that", width / 2, 70, { align: "center" });

  // Learner Name
  doc.setFontSize(28);
  doc.setTextColor(23, 75, 58);
  doc.setFont("helvetica", "bold");
  doc.text(cert.learnerName || "Kannada Learner", width / 2, 86, { align: "center" });

  // Underline beneath learner name
  doc.setDrawColor(23, 75, 58);
  doc.setLineWidth(0.5);
  const nameWidth = doc.getTextWidth(cert.learnerName || "Kannada Learner");
  doc.line((width - nameWidth) / 2 - 10, 90, (width + nameWidth) / 2 + 10, 90);

  // Course Details
  doc.setFontSize(12);
  doc.setTextColor(32, 40, 33);
  doc.setFont("helvetica", "normal");
  doc.text("has successfully completed the comprehensive course curriculum and oral assessment for:", width / 2, 102, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(23, 75, 58);
  doc.setFont("helvetica", "bold");
  doc.text(cert.courseTitle, width / 2, 116, { align: "center" });

  // Kannada Course Subtitle
  doc.setFontSize(13);
  doc.setTextColor(212, 166, 74);
  doc.text(cert.courseTitleKannada || "ಕನ್ನಡ ಭಾಷಾ ಪ್ರವೀಣತೆ", width / 2, 125, { align: "center" });

  // Evaluation Metrics
  doc.setFontSize(11);
  doc.setTextColor(115, 120, 111);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Overall Performance Score: ${cert.scorePercent}%  |  Demonstrated Spoken & Vocabulary Fluency`,
    width / 2,
    136,
    { align: "center" }
  );

  // Criteria Met bullets
  if (cert.criteriaMet && cert.criteriaMet.length > 0) {
    let startY = 146;
    doc.setFontSize(10);
    doc.setTextColor(70, 80, 75);
    cert.criteriaMet.slice(0, 3).forEach((item) => {
      doc.text(`• ${item}`, width / 2, startY, { align: "center" });
      startY += 6;
    });
  }

  // Footer / Seal & Signature Area
  const footerY = 175;

  // Left: Date & Certificate ID
  doc.setFontSize(10);
  doc.setTextColor(115, 120, 111);
  doc.text(`Date of Issue: ${cert.issuedDate}`, 30, footerY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 75, 58);
  doc.text(`Certificate ID: ${cert.id}`, 30, footerY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(115, 120, 111);
  doc.text(`Verify: ${cert.verificationUrl}`, 30, footerY + 12);

  // Center: Gold Seal / Emblem
  doc.setFillColor(212, 166, 74);
  doc.circle(width / 2, footerY + 5, 14, "F");
  doc.setFillColor(250, 247, 240);
  doc.circle(width / 2, footerY + 5, 11.5, "F");

  doc.setTextColor(23, 75, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MAATU", width / 2, footerY + 3.5, { align: "center" });
  doc.setFontSize(7);
  doc.text("VERIFIED", width / 2, footerY + 8, { align: "center" });

  // Right: Authorized Signature
  doc.setFontSize(10);
  doc.setTextColor(32, 40, 33);
  doc.setDrawColor(32, 40, 33);
  doc.setLineWidth(0.5);
  doc.line(width - 80, footerY + 4, width - 30, footerY + 4);
  doc.text("Academic Director", width - 55, footerY + 10, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(115, 120, 111);
  doc.text("Maatu — Voice of Kannada", width - 55, footerY + 14, { align: "center" });

  // Save the document
  doc.save(`${cert.id}-Maatu-Certificate.pdf`);
}
