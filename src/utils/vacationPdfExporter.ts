/**
 * PDF Exporter for Vacation Requests
 */

import { VacationRequest } from "../types/vacation";
import type { AppConfiguration } from "../types/config.types";
import { BasePdfExporter } from "./basePdfExporter";

export class VacationPdfExporter extends BasePdfExporter {
  private static generateQRData(
    request: VacationRequest,
    config: AppConfiguration,
  ): string {
    // Berechne Arbeitstage für QR-Code
    let workingDays = 0;
    if (request.type === "special" && request.singleDate) {
      workingDays = 1;
    } else if (request.startDate && request.endDate) {
      workingDays = this.calculateWorkingDays(
        request.startDate,
        request.endDate,
      );
    }

    // QR-Code Daten für Bitfarm DMS
    return JSON.stringify({
      type: config.technical.qr_code_type_vacation,
      version: "2.0",
      employee: {
        name: request.employeeName,
      },
      customer: request.customer,
      vacationType: request.type,
      vacationTypeLabel: this.getVacationTypeLabel(request.type),
      period: {
        startDate: request.startDate || "",
        endDate: request.endDate || "",
        singleDate: request.singleDate || "",
        workingDays: workingDays,
        excludesWeekends: true,
        excludesHolidays: true,
      },
      reason: request.reason || "",
      notes: request.notes || "",
      termsRead: request.hasReadTerms,
      signatures: {
        employee: !!request.employeeSignature,
        customer: !!request.customerSignature,
      },
      status: request.status,
      metadata: {
        created: request.createdAt,
        submitted: request.submittedAt || "",
        app: `${config.pdf.qr_code_app_identifier}-${config.technical.qr_code_type_vacation}`,
        version: "2.0",
        calculationMethod: "german_holidays",
      },
    });
  }

  private static getVacationTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      paid: "Bezahlter Urlaub",
      unpaid: "Unbezahlter Urlaub",
      special: "Sonderurlaub",
      compensatory: "Zeitausgleich",
    };
    return labels[type] || type;
  }

  static async generatePDF(
    request: VacationRequest,
    config: AppConfiguration,
  ): Promise<Uint8Array> {
    const { PDFDocument } = await this.loadPdfLib();
    const pdfDoc = await PDFDocument.create();

    // PDF Metadata
    this.setPdfMetadata(
      pdfDoc,
      `${config.pdf.pdf_title_prefix} Urlaubsantrag - ${request.employeeName}`,
      config.pdf.pdf_author,
    );

    const page = pdfDoc.addPage([595, 842]); // A4
    const { helvetica, helveticaBold, colors, layout, rgb } =
      await this.setupPdfPage(pdfDoc);

    let yPosition = layout.yPosition;
    const leftMargin = layout.leftMargin;
    const rightMargin = layout.rightMargin;
    const darkGray = colors.darkGray;

    // Logo using base class method
    yPosition = await this.addLogo(pdfDoc, page, config, yPosition, leftMargin);

    // QR Code using base class method
    await this.addQRCode(
      pdfDoc,
      page,
      this.generateQRData(request, config),
      rightMargin,
    );

    // Titel using base class method
    yPosition = this.drawSectionHeader(
      page,
      config.pdf.vacation_header,
      yPosition,
      leftMargin,
      helveticaBold,
      colors.black,
      20,
    );

    yPosition -= 20;

    // Mitarbeiter-Informationen
    page.drawText(`Mitarbeiter: ${request.employeeName || ""}`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helvetica,
      color: colors.black,
    });
    yPosition -= 20;

    page.drawText(`Kunde/Betrieb: ${request.customer || ""}`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helvetica,
      color: colors.black,
    });
    yPosition -= 20;

    page.drawText(`Datum: ${new Date().toLocaleDateString("de-DE")}`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helvetica,
      color: colors.black,
    });
    yPosition -= 35;

    // Tabelle: Art des Urlaubs
    const tableTop = yPosition;
    const tableLeft = leftMargin;
    const colWidths = [140, 120, 120, 115];
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const rowHeight = 22;
    const headerRowHeight = 20;
    const checkboxSize = 10;

    // Tabellenkopf
    page.drawText("Art des Urlaubs:", {
      x: tableLeft,
      y: tableTop,
      size: 12,
      font: helveticaBold,
      color: colors.black,
    });
    yPosition = tableTop - 25;

    // Tabellenüberschriften-Zeile - obere Linie
    const headerTop = yPosition;
    page.drawLine({
      start: { x: tableLeft, y: headerTop },
      end: { x: tableLeft + tableWidth, y: headerTop },
      thickness: 1,
      color: colors.black,
    });

    // Tabellenüberschriften (innerhalb der Tabelle)
    const colHeaders = ["", "Von", "Bis", "Gesamt"];
    const headerTextY = yPosition - 13;

    let currentX = tableLeft;
    colHeaders.forEach((header, index) => {
      if (header) {
        const colWidth = colWidths[index];
        const textWidth = helveticaBold.widthOfTextAtSize(header, 10);
        const centeredX = currentX + (colWidth - textWidth) / 2;

        page.drawText(header, {
          x: centeredX,
          y: headerTextY,
          size: 10,
          font: helveticaBold,
          color: colors.black,
        });
      }
      currentX += colWidths[index];
    });

    // Horizontale Linie unter Überschriften
    yPosition -= headerRowHeight;
    page.drawLine({
      start: { x: tableLeft, y: yPosition },
      end: { x: tableLeft + tableWidth, y: yPosition },
      thickness: 1,
      color: colors.black,
    });

    // Urlaubsarten mit Checkboxen
    const vacationTypes = [
      { key: "paid", label: "Bezahlter Urlaub" },
      { key: "unpaid", label: "Unbezahlter Urlaub" },
      { key: "special", label: "Sonderurlaub" },
      { key: "compensatory", label: "Zeitausgleich" },
    ];

    // Berechne Arbeitstage
    let workingDays = 0;
    let startDateStr = "";
    let endDateStr = "";

    if (request.type === "special" && request.singleDate) {
      startDateStr = this.formatDate(request.singleDate);
      endDateStr = this.formatDate(request.singleDate);
      workingDays = 1; // Einzeltag
    } else if (request.startDate && request.endDate) {
      startDateStr = this.formatDate(request.startDate);
      endDateStr = this.formatDate(request.endDate);
      workingDays = this.calculateWorkingDays(
        request.startDate,
        request.endDate,
      );
    }

    vacationTypes.forEach((type) => {
      const isSelected = request.type === type.key;
      const textY = yPosition - 14;
      currentX = tableLeft;

      // Erste Spalte: Checkbox + Label
      const checkboxX = currentX + 8;
      const checkboxY = yPosition - 16;

      page.drawRectangle({
        x: checkboxX,
        y: checkboxY,
        width: checkboxSize,
        height: checkboxSize,
        borderColor: colors.black,
        borderWidth: 1,
      });

      if (isSelected) {
        page.drawText("X", {
          x: checkboxX + 2,
          y: checkboxY + 1.5,
          size: 9,
          font: helveticaBold,
          color: colors.black,
        });
      }

      page.drawText(type.label, {
        x: checkboxX + 15,
        y: textY,
        size: 9,
        font: helvetica,
        color: colors.black,
      });

      currentX += colWidths[0];

      // Zweite Spalte: Von (zentriert)
      if (isSelected && startDateStr) {
        const textWidth = helvetica.widthOfTextAtSize(startDateStr, 9);
        const centeredX = currentX + (colWidths[1] - textWidth) / 2;
        page.drawText(startDateStr, {
          x: centeredX,
          y: textY,
          size: 9,
          font: helvetica,
          color: colors.black,
        });
      }
      currentX += colWidths[1];

      // Dritte Spalte: Bis (zentriert)
      if (isSelected && endDateStr) {
        const textWidth = helvetica.widthOfTextAtSize(endDateStr, 9);
        const centeredX = currentX + (colWidths[2] - textWidth) / 2;
        page.drawText(endDateStr, {
          x: centeredX,
          y: textY,
          size: 9,
          font: helvetica,
          color: colors.black,
        });
      }
      currentX += colWidths[2];

      // Vierte Spalte: Gesamt (zentriert)
      if (isSelected && workingDays > 0) {
        const gesamtText = `${workingDays} Tag${workingDays > 1 ? "e" : ""}`;
        const textWidth = helvetica.widthOfTextAtSize(gesamtText, 9);
        const centeredX = currentX + (colWidths[3] - textWidth) / 2;
        page.drawText(gesamtText, {
          x: centeredX,
          y: textY,
          size: 9,
          font: helvetica,
          color: colors.black,
        });
      }

      yPosition -= rowHeight;

      // Horizontale Linie nach jeder Zeile
      page.drawLine({
        start: { x: tableLeft, y: yPosition },
        end: { x: tableLeft + tableWidth, y: yPosition },
        thickness: 0.5,
        color: colors.black,
      });
    });

    // Vertikale Linien für alle Spalten
    const tableBottom = yPosition;
    currentX = tableLeft;
    colWidths.forEach((width) => {
      page.drawLine({
        start: { x: currentX, y: headerTop },
        end: { x: currentX, y: tableBottom },
        thickness: 1,
        color: colors.black,
      });
      currentX += width;
    });

    // Letzte vertikale Linie rechts (Tabellenabschluss)
    page.drawLine({
      start: { x: tableLeft + tableWidth, y: headerTop },
      end: { x: tableLeft + tableWidth, y: tableBottom },
      thickness: 1,
      color: colors.black,
    });

    yPosition -= 10;

    // Begründung
    if (request.reason) {
      page.drawText("Begründung:", {
        x: leftMargin,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: colors.black,
      });
      yPosition -= 18;

      const reasonLines = this.wrapTextSimple(request.reason, 75);
      reasonLines.forEach((line) => {
        page.drawText(line, {
          x: leftMargin + 20,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        yPosition -= 15;
      });
      yPosition -= 10;
    }

    // Anmerkung
    if (request.notes) {
      page.drawText("Anmerkung:", {
        x: leftMargin,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: colors.black,
      });
      yPosition -= 18;

      const notesLines = this.wrapTextSimple(request.notes, 75);
      notesLines.forEach((line) => {
        page.drawText(line, {
          x: leftMargin + 20,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        yPosition -= 15;
      });
      yPosition -= 10;
    }

    // Zusaetzlicher Abstand zwischen Tabellen-/Freitextbereich und Hinweisen (~2rem)
    yPosition -= 32;

    // Wichtige Hinweise
    page.drawText("Wichtige Hinweise:", {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: colors.black,
    });
    yPosition -= 18;

    const legalTerms = [
      "• Bezahlter oder unbezahlter Urlaub muss mindestens 2 Wochen vor Antritt beantragt werden.",
      "• Es bedarf einer schriftlichen Genehmigung durch die Firma und des Entleihbetriebs.",
      "• Eigenmächtiger Urlaubsantritt führt zur fristlosen Kündigung.",
      "• Während unbezahltem Urlaub ruhen Arbeitspflicht und Lohnfortzahlungspflicht.",
      "• Unbezahlter Urlaub über drei Wochen beendet das Versicherungsverhältnis!",
      "• Ärztlich bescheinigte Arbeitsunfähigkeit verlängert den Urlaub nicht.",
    ];

    legalTerms.forEach((term) => {
      const termLines = this.wrapTextSimple(term, 80);
      termLines.forEach((line) => {
        page.drawText(line, {
          x: leftMargin + 10,
          y: yPosition,
          size: 9,
          font: helvetica,
          color: darkGray,
        });
        yPosition -= 13;
      });
    });

    yPosition -= 10;

    // Bestätigung
    if (request.hasReadTerms) {
      page.drawText("[X] Antragsteller hat Hinweise gelesen und verstanden.", {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: helveticaBold,
        color: colors.black,
      });
      yPosition -= 25;
    }

    // Unterschriften-Bereich
    yPosition -= 10;
    const signatureY = yPosition;

    // Mitarbeiter-Unterschrift
    page.drawText("Unterschrift Mitarbeiter:", {
      x: leftMargin,
      y: signatureY,
      size: 10,
      font: helveticaBold,
      color: colors.black,
    });

    if (request.employeeSignature) {
      try {
        const signatureImage = await pdfDoc.embedPng(request.employeeSignature);
        const sigDims = signatureImage.scale(0.2);
        page.drawImage(signatureImage, {
          x: leftMargin,
          y: signatureY - 45,
          width: Math.min(sigDims.width, 120),
          height: Math.min(sigDims.height, 30),
        });
      } catch (error) {
        console.warn("Employee signature could not be embedded:", error);
      }
    }

    page.drawLine({
      start: { x: leftMargin, y: signatureY - 50 },
      end: { x: leftMargin + 150, y: signatureY - 50 },
      thickness: 0.5,
      color: colors.black,
    });

    // DISP/GL-Leitung
    page.drawText("DISP/GL-Leitung:", {
      x: leftMargin + 200,
      y: signatureY,
      size: 10,
      font: helveticaBold,
      color: colors.black,
    });

    page.drawLine({
      start: { x: leftMargin + 200, y: signatureY - 50 },
      end: { x: leftMargin + 350, y: signatureY - 50 },
      thickness: 0.5,
      color: colors.black,
    });

    // Kunde/Entleiher
    yPosition = signatureY - 70;

    page.drawText("Kunde/Entleiher:", {
      x: leftMargin + 200,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: colors.black,
    });

    if (request.customerSignature) {
      try {
        const customerSignatureImage = await pdfDoc.embedPng(
          request.customerSignature,
        );
        const custSigDims = customerSignatureImage.scale(0.2);
        page.drawImage(customerSignatureImage, {
          x: leftMargin + 200,
          y: yPosition - 45,
          width: Math.min(custSigDims.width, 120),
          height: Math.min(custSigDims.height, 30),
        });
      } catch (error) {
        console.warn("Customer signature could not be embedded:", error);
      }
    }

    page.drawLine({
      start: { x: leftMargin + 200, y: yPosition - 50 },
      end: { x: leftMargin + 350, y: yPosition - 50 },
      thickness: 0.5,
      color: colors.black,
    });

    // Footer
    const footerY = 50;
    page.drawText(config.pdf.pdf_footer_text || "", {
      x: leftMargin,
      y: footerY,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Erstellt am: ${new Date().toLocaleString("de-DE")}`, {
      x: rightMargin - 150,
      y: footerY,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Rechtlicher Hinweis wenn konfiguriert
    if (config.pdf.legal_notice_vacation) {
      page.drawText(config.pdf.legal_notice_vacation, {
        x: leftMargin,
        y: 30,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
        maxWidth: rightMargin - leftMargin,
      });
    }

    // QR-Code steht für sich - keine zusätzlichen Informationen daneben nötig

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  private static formatDate(dateString: string): string {
    // Parse ISO date locally to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /**
   * Simple text wrapping by character count
   * (Overrides base class method for vacation-specific behavior)
   */
  private static wrapTextSimple(text: string, maxLength: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    });

    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }

  private static getGermanHolidays(year: number): Date[] {
    // Deutsche bundesweite Feiertage
    const holidays: Date[] = [
      new Date(year, 0, 1), // Neujahr
      new Date(year, 4, 1), // Tag der Arbeit
      new Date(year, 9, 3), // Tag der Deutschen Einheit
      new Date(year, 11, 25), // 1. Weihnachtsfeiertag
      new Date(year, 11, 26), // 2. Weihnachtsfeiertag
    ];

    // Ostersonntag berechnen (Gauss-Algorithmus)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const easter = new Date(year, month, day);

    // Karfreitag (2 Tage vor Ostern)
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    holidays.push(goodFriday);

    // Ostermontag (1 Tag nach Ostern)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays.push(easterMonday);

    // Christi Himmelfahrt (39 Tage nach Ostern)
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    holidays.push(ascension);

    // Pfingstmontag (50 Tage nach Ostern)
    const whitMonday = new Date(easter);
    whitMonday.setDate(easter.getDate() + 50);
    holidays.push(whitMonday);

    return holidays;
  }

  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0; // Nur Sonntag (0 = Sonntag)
  }

  private static isHoliday(date: Date, holidays: Date[]): boolean {
    return holidays.some(
      (holiday) =>
        holiday.getDate() === date.getDate() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getFullYear() === date.getFullYear(),
    );
  }

  private static calculateWorkingDays(
    startDate: string,
    endDate: string,
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let workingDays = 0;
    const currentDate = new Date(start);

    // Feiertage für die betroffenen Jahre sammeln
    const years = new Set<number>();
    const tempDate = new Date(start);
    while (tempDate <= end) {
      years.add(tempDate.getFullYear());
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const holidays: Date[] = [];
    years.forEach((year) => {
      holidays.push(...this.getGermanHolidays(year));
    });

    // Tage zählen (ohne Sonntage und Feiertage)
    while (currentDate <= end) {
      if (
        !this.isWeekend(currentDate) &&
        !this.isHoliday(currentDate, holidays)
      ) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }
}
