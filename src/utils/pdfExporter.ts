// Statischer Import für pdf-lib für bessere Stabilität
import { WeekData } from "./storage";
import QRCode from "qrcode";
import type { AppConfiguration } from "../types/config.types";
import { TimeCalculationService } from "../core/time";
import { WorkTimeValidator } from "../core/validation/WorkTimeValidator";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export class PdfExporter {
  private static dataUrlToBytes(dataUrl: string): Uint8Array {
    const [, base64 = ""] = dataUrl.split(",", 2);
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  private static async loadLogoBytes(logoUrl: string): Promise<{
    logoBytes: Uint8Array | ArrayBuffer;
    contentType: string;
  }> {
    if (logoUrl.startsWith("data:")) {
      const contentType = logoUrl.slice(5, logoUrl.indexOf(";")) || "image/png";
      const logoBytes = this.dataUrlToBytes(logoUrl);
      return { logoBytes, contentType };
    }

    const absoluteLogoUrl =
      logoUrl.startsWith("http://") ||
      logoUrl.startsWith("https://") ||
      logoUrl.startsWith("blob:")
        ? logoUrl
        : new URL(logoUrl, window.location.href).toString();

    const logoResponse = await fetch(absoluteLogoUrl);
    const logoBytes = await logoResponse.arrayBuffer();
    const contentType = logoResponse.headers.get("content-type") || "";
    return { logoBytes, contentType };
  }

  private static getAbsenceLabel(absence?: string | null): string {
    const labels: Record<string, string> = {
      sick: "Krank",
      vacation: "Urlaub",
      flextime: "Gleitzeit",
      holiday: "Feiertag",
      unpaid: "Unbezahlt",
    };

    if (!absence) {
      return "";
    }

    return labels[absence] || absence;
  }

  private static async convertSvgToPngBytes(
    svgBytes: Uint8Array | ArrayBuffer,
  ): Promise<Uint8Array> {
    const normalizedBytes =
      svgBytes instanceof Uint8Array ? new Uint8Array(svgBytes) : new Uint8Array(svgBytes);
    const blob = new Blob([normalizedBytes], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("SVG konnte nicht geladen werden"));
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || 1024;
      canvas.height = image.naturalHeight || 1024;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas-Kontext nicht verfuegbar");
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("PNG-Konvertierung fehlgeschlagen"));
        }, "image/png");
      });

      return new Uint8Array(await pngBlob.arrayBuffer());
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private static async embedLogoImage(
    pdfDoc: PDFDocument,
    logoBytes: Uint8Array | ArrayBuffer,
    logoUrl: string,
    contentType: string,
  ) {
    const lowerLogoUrl = logoUrl.toLowerCase();
    const isSvg =
      lowerLogoUrl.endsWith(".svg") ||
      lowerLogoUrl.startsWith("data:image/svg+xml") ||
      contentType.includes("image/svg+xml");

    if (isSvg) {
      const pngBytes = await this.convertSvgToPngBytes(logoBytes);
      return await pdfDoc.embedPng(pngBytes);
    }

    if (lowerLogoUrl.endsWith(".png") || contentType.includes("image/png")) {
      return await pdfDoc.embedPng(logoBytes);
    }

    if (
      lowerLogoUrl.match(/\.(jpg|jpeg)$/) ||
      contentType.includes("image/jpeg")
    ) {
      return await pdfDoc.embedJpg(logoBytes);
    }

    try {
      return await pdfDoc.embedPng(logoBytes);
    } catch {
      return await pdfDoc.embedJpg(logoBytes);
    }
  }

  private static generateQRData(
    weekData: WeekData,
    config: AppConfiguration,
  ): string {
    // Komprimierte Darstellung: Nur gefüllte Tage mit Daten
    // Reduziert QR-Code-Größe um ~60% ohne Datenverlust
    const compactDays = weekData.days
      .filter((day) => day.from || day.to) // Nur Tage mit Arbeitszeit
      .map((day) => {
        const breaks = [];
        if (day.pause1From && day.pause1To)
          breaks.push([day.pause1From, day.pause1To]);
        if (day.pause2From && day.pause2To)
          breaks.push([day.pause2From, day.pause2To]);

        return {
          d: day.date,
          f: day.from || "",
          t: day.to || "",
          h: day.hours || "00:00",
          b: breaks.length > 0 ? breaks : undefined,
        };
      });

    return JSON.stringify({
      t: config.technical.qr_code_type_timesheet,
      v: "2.0",
      e: weekData.employeeName,
      s: weekData.supervisorName || "",
      p: {
        w: weekData.week,
        y: weekData.year,
      },
      c: weekData.customer,
      days: compactDays,
      sig: {
        e: !!weekData.employeeSignature,
        s: !!weekData.supervisorSignature,
      },
      m: {
        cr: new Date().toISOString().slice(0, 10),
        app: config.pdf.qr_code_app_identifier,
      },
    });
  }

  static async generatePDF(
    weekData: WeekData,
    config: AppConfiguration,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    pdfDoc.setTitle(
      `${config.pdf.pdf_title_prefix} KW${weekData.week}/${weekData.year} - ${weekData.employeeName || "Mitarbeiter"}`,
    );
    pdfDoc.setAuthor(config.pdf.pdf_author);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const page = pdfDoc.addPage([595, 842]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.15, 0.15, 0.15);
    const lightGray = rgb(0.92, 0.92, 0.92);

    let yPosition = 800;
    const leftMargin = 50;
    const rightMargin = 545;

    // Logo (aus Config)
    const logoUrl = config.company.company_logo;
    if (logoUrl) {
      try {
        const { logoBytes, contentType } = await this.loadLogoBytes(logoUrl);
        const logoImage = await this.embedLogoImage(
          pdfDoc,
          logoBytes,
          logoUrl,
          contentType,
        );
        const dims = logoImage.scale(0.5);
        page.drawImage(logoImage, {
          x: leftMargin,
          y: yPosition - dims.height,
          width: dims.width,
          height: dims.height,
        });
        yPosition -= dims.height + 25;
      } catch (err) {
        console.warn("Logo konnte nicht geladen werden:", err);
      }
    }

    // QR Code (feste Position wie bei anderen Formularen)
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(
        this.generateQRData(weekData, config),
        { errorCorrectionLevel: "H", width: 512, margin: 1 },
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
    } catch (err) {
      console.warn("QR-Code konnte nicht erstellt werden:", err);
    }

    page.drawText(config.pdf.timesheet_header || "STUNDENNACHWEIS", {
      x: leftMargin,
      y: yPosition,
      size: 20,
      font: helveticaBold,
    });

    yPosition -= 40;
    page.drawText(
      `Mitarbeiter: ${weekData.employeeName || "Nicht angegeben"}`,
      {
        x: leftMargin,
        y: yPosition,
        size: 12,
        font: helvetica,
      },
    );
    yPosition -= 20;
    page.drawText(`Kunde/Projekt: ${weekData.customer || "Nicht angegeben"}`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helvetica,
    });
    yPosition -= 20;
    page.drawText(`Kalenderwoche: ${weekData.week}/${weekData.year}`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helvetica,
    });

    yPosition -= 40;
    const headerY = yPosition;
    const rowHeight = 25;
    const colWidths = [100, 60, 60, 70, 70, 80];
    const headers = [
      "Tag/Datum",
      "Von",
      "Bis",
      "Pause 1",
      "Pause 2",
      "Stunden",
    ];

    page.drawRectangle({
      x: leftMargin,
      y: headerY - 5,
      width: rightMargin - leftMargin,
      height: rowHeight,
      color: lightGray,
    });
    let cx = leftMargin + 5;
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: cx,
        y: headerY + 5,
        size: 10,
        font: helveticaBold,
        color: black,
      });
      cx += colWidths[i];
    });
    yPosition = headerY - rowHeight;

    // Bei Nachtschichten: Woche startet am Sonntag
    const dayNames =
      weekData.shiftModel === "night"
        ? [
            "Sonntag", // 0
            "Montag", // 1
            "Dienstag", // 2
            "Mittwoch", // 3
            "Donnerstag", // 4
            "Freitag", // 5
            "Samstag", // 6
          ]
        : [
            "Montag", // 0
            "Dienstag", // 1
            "Mittwoch", // 2
            "Donnerstag", // 3
            "Freitag", // 4
            "Samstag", // 5
            "Sonntag", // 6
          ];

    const workTimeResults = weekData.days.map((day) => {
      if (day.absence && day.absence !== "holiday") {
        return { hours: "00:00", decimal: "0.00", minutes: 0 };
      }

      if (!day.from || !day.to) {
        return { hours: "00:00", decimal: "0.00", minutes: 0 };
      }

      return TimeCalculationService.calculateWorkTime({
        workTime: { from: day.from, to: day.to },
        breaks: [
          { from: day.pause1From, to: day.pause1To },
          { from: day.pause2From, to: day.pause2To },
        ].filter((brk) => brk.from && brk.to),
        isNightShift: day.isNightShift,
      });
    });

    const totalResult =
      TimeCalculationService.calculateTotalWorkTime(workTimeResults);

    weekData.days.forEach((d, i) => {
      if (i % 2 === 1)
        page.drawRectangle({
          x: leftMargin,
          y: yPosition - 5,
          width: rightMargin - leftMargin,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98),
        });
      const dateObj = new Date(d.date);
      const dateF = dateObj.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const hasAbsence = !!d.absence && d.absence !== "holiday";
      const absenceLabel = this.getAbsenceLabel(d.absence);
      const pause1 =
        !hasAbsence && d.pause1From && d.pause1To
          ? `${d.pause1From}-${d.pause1To}`
          : "-";
      const pause2 =
        !hasAbsence && d.pause2From && d.pause2To
          ? `${d.pause2From}-${d.pause2To}`
          : "-";
      const hoursBase = hasAbsence
        ? "0,00"
        : workTimeResults[i].decimal.replace(".", ",");
      const hours = hasAbsence
        ? `${hoursBase} (${absenceLabel})`
        : hoursBase;
      const row = [
        dayNames[i],
        hasAbsence ? "-" : d.from || "-",
        hasAbsence ? "-" : d.to || "-",
        pause1,
        pause2,
        hours,
      ];

      cx = leftMargin + 5;
      row.forEach((c, ci) => {
        if (ci === 0) {
          page.drawText(c, {
            x: cx,
            y: yPosition + 8,
            size: 9,
            font: helveticaBold,
            color: black,
          });
          page.drawText(dateF, {
            x: cx,
            y: yPosition - 2,
            size: 8,
            font: helvetica,
            color: darkGray,
          });
        } else {
          page.drawText(c, {
            x: cx,
            y: yPosition + 3,
            size: 9,
            font: helvetica,
            color: black,
          });
        }
        cx += colWidths[ci];
      });

      yPosition -= rowHeight;
    });

    page.drawLine({
      start: { x: leftMargin, y: yPosition + 10 },
      end: { x: rightMargin, y: yPosition + 10 },
      thickness: 1,
      color: darkGray,
    });
    yPosition -= 20;
    page.drawText(`GESAMTSTUNDEN: ${totalResult.decimal} Std.`, {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: black,
    });

    yPosition -= 45;

    if (weekData.employeeSignature || weekData.supervisorSignature) {
      page.drawText("UNTERSCHRIFTEN:", {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: black,
      });
      yPosition -= 30;

      if (weekData.employeeSignature) {
        try {
          const img = await pdfDoc.embedPng(weekData.employeeSignature);
          page.drawImage(img, {
            x: leftMargin,
            y: yPosition - 60,
            width: 200,
            height: 60,
          });
          page.drawText("Mitarbeiter", {
            x: leftMargin,
            y: yPosition - 80,
            size: 10,
            font: helvetica,
            color: black,
          });
        } catch {}
      }

      if (weekData.supervisorSignature) {
        try {
          const sx = leftMargin + 250;
          const sy = yPosition - 60;
          const img = await pdfDoc.embedPng(weekData.supervisorSignature);
          page.drawImage(img, { x: sx, y: sy, width: 200, height: 60 });
          page.drawText(
            weekData.supervisorName
              ? `${config.pdf.signature_label || "Vorgesetzter"}: ${weekData.supervisorName}`
              : config.pdf.signature_label || "Vorgesetzter",
            { x: sx, y: sy - 15, size: 10, font: helvetica, color: black },
          );
        } catch {}
      }

      yPosition -= 100;
    }

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

    // Rechtlicher Hinweis wenn konfiguriert
    if (config.pdf.legal_notice_timesheet) {
      page.drawText(config.pdf.legal_notice_timesheet, {
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

  static downloadPDF(pdfBytes: Uint8Array, filename: string): void {
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

  static async exportWeekAsPDF(
    weekData: WeekData,
    config: AppConfiguration,
  ): Promise<void> {
    // VALIDIERUNG VOR EXPORT
    const validator = new WorkTimeValidator(config.work);
    const validationResult = validator.validateWeek(weekData);

    if (!validationResult.isValid) {
      const errors = validationResult.errors.map((e) => e.message).join("\n");
      throw new Error(`Validierung fehlgeschlagen:\n${errors}`);
    }

    if (validationResult.hasWarnings()) {
      console.warn("PDF-Export mit Warnungen:", validationResult.warnings);
    }

    const bytes = await this.generatePDF(weekData, config);

    // Generiere Dateinamen aus Pattern
    const cleanName = (weekData.employeeName || "Mitarbeiter").replace(
      /[^a-zA-Z0-9]/g,
      "_",
    );
    const filename =
      config.work.filename_pattern
        .replace("{employeeName}", cleanName)
        .replace("{weekYear}", weekData.year.toString())
        .replace("{weekNumber}", weekData.week.toString().padStart(2, "0")) +
      ".pdf";

    this.downloadPDF(bytes, filename);
  }
}
