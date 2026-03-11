import QRCode from "qrcode";
import { AdvancePaymentNotification } from "../types/advancepayment";
import type { AppConfiguration } from "../types/config.types";
import { BasePdfExporter } from "./basePdfExporter";

/**
 * AdvancePaymentPdfExporter - Erstellt PDF-Dokumente für Lohnvorschuss-Anträge
 */
export class AdvancePaymentPdfExporter extends BasePdfExporter {
  /**
   * Generiert ein PDF-Dokument für einen Lohnvorschuss-Antrag
   */
  static async generatePdf(
    notification: AdvancePaymentNotification,
    config: AppConfiguration,
    employeeSignature?: string,
  ): Promise<void> {
    const pdfBytes = await this.generatePdfBytes(
      notification,
      config,
      employeeSignature,
    );

    // PDF speichern
    const fileName = `Lohnvorschuss_${notification.employeeName.replace(
      /\s+/g,
      "_",
    )}_${notification.requestDate}.pdf`;

    this.downloadPDF(pdfBytes, fileName);
  }

  /**
   * Generiert PDF-Bytes ohne Download (für Backend-Versand)
   */
  static async generatePdfBytes(
    notification: AdvancePaymentNotification,
    config: AppConfiguration,
    employeeSignature?: string,
  ): Promise<Uint8Array> {
    const { PDFDocument } = await this.loadPdfLib();
    const pdfDoc = await PDFDocument.create();

    // PDF Metadata
    pdfDoc.setTitle(
      `${config.pdf.pdf_title_prefix} Lohnvorschuss - ${notification.employeeName}`,
    );
    pdfDoc.setAuthor(config.pdf.pdf_author);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    return await this.createAdvancePaymentPdf(
      pdfDoc,
      notification,
      config,
      employeeSignature,
    );
  }

  private static downloadPDF(pdfBytes: Uint8Array, filename: string): void {
    const arrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(arrayBuffer).set(pdfBytes);
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Erstellt das Lohnvorschuss-PDF
   */
  private static async createAdvancePaymentPdf(
    pdfDoc: any,
    notification: AdvancePaymentNotification,
    config: AppConfiguration,
    employeeSignature?: string,
  ): Promise<Uint8Array> {
    const { rgb, StandardFonts } = await this.loadPdfLib();
    const page = pdfDoc.addPage([595, 842]); // A4
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.15, 0.15, 0.15);

    let yPosition = 800;
    const leftMargin = 50;
    const rightMargin = 545;

    yPosition = await this.addLogo(pdfDoc, page, config, yPosition, leftMargin);
    yPosition -= 32;

    // QR Code (KONSISTENTE POSITION WIE BEI ANDEREN FORMULAREN)
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(
        this.generateQRData(notification, config),
        {
          errorCorrectionLevel: "H",
          width: 512,
          margin: 1,
        },
      );
      const qrBytes = Uint8Array.from(atob(qrCodeDataUrl.split(",")[1]), (c) =>
        c.charCodeAt(0),
      );
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, {
        x: rightMargin - 120,
        y: 680,
        width: 100,
        height: 100,
      });
    } catch (error) {
      console.warn("QR-Code konnte nicht generiert werden:", error);
    }

    // Titel
    page.drawText("Antrag auf Lohnvorschuss", {
      x: leftMargin,
      y: yPosition,
      size: 20,
      font: helveticaBold,
      color: black,
    });
    yPosition -= 40;

    // Hiermit beantrage ich
    page.drawText("Hiermit beantrage ich,", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: black,
    });
    yPosition -= 20;

    // Vorname, Name
    page.drawText("Vorname, Name:", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: leftMargin + 85, y: yPosition - 3 },
      end: { x: rightMargin - 50, y: yPosition - 3 },
      thickness: 0.5,
      color: darkGray,
    });
    page.drawText(notification.employeeName || "", {
      x: leftMargin + 90,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: black,
    });
    yPosition -= 25;

    // Betrag
    page.drawText("Lohnvorschuss in Höhe von:", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: leftMargin + 155, y: yPosition - 3 },
      end: { x: leftMargin + 270, y: yPosition - 3 },
      thickness: 0.5,
      color: darkGray,
    });
    page.drawText(`${notification.amount || ""} Euro`, {
      x: leftMargin + 160,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: black,
    });
    yPosition -= 25;

    // Auszahlung
    page.drawText("Auszahlung:", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: black,
    });
    page.drawText("per Überweisung auf die bekannte Bankverbindung", {
      x: leftMargin + 70,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: black,
    });
    yPosition -= 25;

    // Datum - Parse ISO date locally to avoid timezone issues
    const [reqYear, reqMonth, reqDay] = notification.requestDate
      .split("-")
      .map(Number);
    const requestDate = new Date(reqYear, reqMonth - 1, reqDay);
    const formattedDate = requestDate.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    page.drawText("Datum:", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: leftMargin + 50, y: yPosition - 3 },
      end: { x: leftMargin + 150, y: yPosition - 3 },
      thickness: 0.5,
      color: darkGray,
    });
    page.drawText(formattedDate, {
      x: leftMargin + 55,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: black,
    });
    yPosition -= 20;

    // Unterschrift Mitarbeiter (3rem tiefer)
    yPosition -= 48;

    page.drawText("Unterschrift Mitarbeiter/in:", {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: leftMargin + 145, y: yPosition - 3 },
      end: { x: leftMargin + 295, y: yPosition - 3 },
      thickness: 0.5,
      color: darkGray,
    });

    if (employeeSignature) {
      try {
        const signatureImage = await pdfDoc.embedPng(employeeSignature);
        const sigDims = signatureImage.scale(0.15);
        const signatureLineY = yPosition - 3;
        page.drawImage(signatureImage, {
          x: leftMargin + 150,
          y: signatureLineY + 1,
          width: Math.min(sigDims.width, 140),
          height: Math.min(sigDims.height, 30),
        });
      } catch (error) {
        console.warn("Unterschrift konnte nicht eingebettet werden:", error);
      }
    }
    yPosition -= 65;

    // Trennlinie
    page.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness: 1,
      color: darkGray,
    });
    yPosition -= 25;

    // Hinweise für Mitarbeiter/innen
    page.drawText("Hinweise für Mitarbeiter/innen", {
      x: leftMargin + 150,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: black,
    });
    yPosition -= 20;

    // Hinweise (Bullet Points)
    const bulletPoints = [
      "Vorschusszahlungen werden ausschließlich vom 10. bis zum Monatsende gewährt.",
      "Ein Vorschuss wird nur gewährt, wenn alle bis dahin möglichen Stundennachweise vorgelegt wurden.",
      "Überweisungen von genehmigten Lohnvorschüssen erfolgen dienstags und freitags nach Antragstellung.",
    ];

    bulletPoints.forEach((point) => {
      page.drawText("•", {
        x: leftMargin + 10,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      const lines = this.wrapText(point, helvetica, 10, 450);
      let lineY = yPosition;
      lines.forEach((line) => {
        page.drawText(line, {
          x: leftMargin + 20,
          y: lineY,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        lineY -= 13;
      });
      yPosition = lineY - 5;
    });

    // Zusätzliche Anmerkungen
    if (notification.additionalNotes) {
      yPosition -= 15;
      page.drawText("Zusätzliche Anmerkungen:", {
        x: leftMargin,
        y: yPosition,
        size: 11,
        font: helveticaBold,
        color: black,
      });
      yPosition -= 15;

      const noteLines = this.wrapText(
        notification.additionalNotes,
        helvetica,
        10,
        480,
      );
      noteLines.forEach((line) => {
        page.drawText(line, {
          x: leftMargin + 10,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        yPosition -= 13;
      });
    }

    // Footer
    page.drawText(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, {
      x: leftMargin,
      y: 50,
      size: 8,
      font: helvetica,
      color: darkGray,
    });
    page.drawText(config.pdf.pdf_footer_text || "", {
      x: rightMargin - 200,
      y: 50,
      size: 8,
      font: helvetica,
      color: darkGray,
    });

    // Rechtlicher Hinweis - verwende legal_notice_timesheet als Fallback
    const legalNotice =
      config.pdf.legal_notice_advance_payment || config.pdf.legal_notice_timesheet;
    if (legalNotice) {
      page.drawText(legalNotice, {
        x: leftMargin,
        y: 30,
        size: 7,
        font: helvetica,
        color: darkGray,
        maxWidth: rightMargin - leftMargin,
      });
    }

    return await pdfDoc.save();
  }

  // Removed: using wrapText from BasePdfExporter instead

  private static generateQRData(
    notification: AdvancePaymentNotification,
    config: AppConfiguration,
  ): string {
    const payload = {
      type: config.technical.qr_code_type_advance_payment,
      version: "2.0",
      employee: {
        name: notification.employeeName,
      },
      customer: notification.customer || "",
      advancePayment: {
        amount: notification.amount,
        requestDate: notification.requestDate,
        timesheetsSubmitted: notification.timesheetsSubmitted,
      },
      notes: notification.additionalNotes || "",
      termsConfirmed: notification.termsConfirmed || false,
      signatures: {
        employee: !!notification.employeeSignature,
      },
      metadata: {
        created: notification.createdAt,
        sent: notification.sentAt || "",
        app: `${config.pdf.qr_code_app_identifier}-${config.technical.qr_code_type_advance_payment}`,
        version: "2.0",
      },
    };

    return JSON.stringify(payload);
  }
}
