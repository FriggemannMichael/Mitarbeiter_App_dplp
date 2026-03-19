import QRCode from "qrcode";
import { PDFDocument, PDFPage, PDFFont, RGB, StandardFonts } from "pdf-lib";
import { AppConfiguration } from "../types/config.types";

/**
 * Base PDF Exporter with shared utilities
 * Consolidates common PDF generation logic to reduce duplication
 */
export abstract class BasePdfExporter {
  private static dataUrlToBytes(dataUrl: string): Uint8Array {
    const [, base64 = ""] = dataUrl.split(",", 2);
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  protected static async loadLogoBytes(logoUrl: string): Promise<{
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

  protected static async embedLogoImage(
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

    // Fallback fuer unbekannte Formate
    try {
      return await pdfDoc.embedPng(logoBytes);
    } catch {
      return await pdfDoc.embedJpg(logoBytes);
    }
  }

  /**
   * Dynamically loads pdf-lib library
   */
  protected static async loadPdfLib() {
    return await import("pdf-lib");
  }

  /**
   * Common PDF setup: fonts, colors, margins
   */
  protected static async setupPdfPage(pdfDoc: PDFDocument) {
    const { rgb } = await this.loadPdfLib();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colors = {
      black: rgb(0, 0, 0),
      darkGray: rgb(0.15, 0.15, 0.15),
      lightGray: rgb(0.95, 0.95, 0.95),
      primary: rgb(0.15, 0.39, 0.92), // #2563eb
    };

    const layout = {
      yPosition: 800,
      leftMargin: 50,
      rightMargin: 545,
      lineHeight: 20,
      sectionSpacing: 30,
    };

    return { helvetica, helveticaBold, colors, layout, rgb };
  }

  /**
   * Adds company logo to PDF
   * Returns new yPosition after logo
   */
  protected static async addLogo(
    pdfDoc: PDFDocument,
    page: PDFPage,
    config: AppConfiguration,
    yPosition: number,
    leftMargin: number,
  ): Promise<number> {
    const logoUrl = config.company.company_logo;
    if (!logoUrl) return yPosition;

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

      return yPosition - dims.height - 25;
    } catch (error) {
      console.warn("Logo konnte nicht geladen werden:", error);
      return yPosition;
    }
  }

  /**
   * Adds QR code to PDF (standard position top-right)
   */
  protected static async addQRCode(
    pdfDoc: PDFDocument,
    page: PDFPage,
    qrData: string,
    rightMargin: number,
    yPosition: number = 680,
  ): Promise<void> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "H",
        width: 512,
        margin: 1,
      });

      const qrBytes = Uint8Array.from(atob(qrCodeDataUrl.split(",")[1]), (c) =>
        c.charCodeAt(0),
      );

      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, {
        x: rightMargin - 120,
        y: yPosition,
        width: 100,
        height: 100,
      });
    } catch (error) {
      console.warn("QR-Code konnte nicht generiert werden:", error);
    }
  }

  /**
   * Draws a section header
   */
  protected static drawSectionHeader(
    page: PDFPage,
    text: string,
    yPosition: number,
    leftMargin: number,
    font: PDFFont,
    color: RGB,
    size: number = 20,
  ): number {
    page.drawText(text, {
      x: leftMargin,
      y: yPosition,
      size,
      font,
      color,
    });
    return yPosition - size - 10;
  }

  /**
   * Draws a labeled field (label + value)
   */
  protected static drawLabeledField(
    page: PDFPage,
    label: string,
    value: string,
    yPosition: number,
    leftMargin: number,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    color: RGB,
    labelSize: number = 12,
    valueSize: number = 12,
  ): number {
    // Label
    page.drawText(label, {
      x: leftMargin,
      y: yPosition,
      size: labelSize,
      font: fontBold,
      color,
    });

    // Value
    page.drawText(value, {
      x: leftMargin + 200,
      y: yPosition,
      size: valueSize,
      font: fontRegular,
      color,
    });

    return yPosition - Math.max(labelSize, valueSize) - 5;
  }

  /**
   * Draws a horizontal line separator
   */
  protected static drawSeparatorLine(
    page: PDFPage,
    yPosition: number,
    leftMargin: number,
    rightMargin: number,
    color: RGB,
    thickness: number = 1,
  ): number {
    page.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness,
      color,
    });
    return yPosition - 20;
  }

  /**
   * Sets PDF metadata
   */
  protected static setPdfMetadata(
    pdfDoc: PDFDocument,
    title: string,
    author: string,
  ): void {
    pdfDoc.setTitle(title);
    pdfDoc.setAuthor(author);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
  }

  /**
   * Adds footer with page number and custom text
   */
  protected static drawFooter(
    page: PDFPage,
    footerText: string,
    pageNumber: number,
    leftMargin: number,
    rightMargin: number,
    font: PDFFont,
    color: RGB,
  ): void {
    const footerY = 30;
    const fontSize = 10;

    // Left side: custom footer text
    page.drawText(footerText, {
      x: leftMargin,
      y: footerY,
      size: fontSize,
      font,
      color,
    });

    // Right side: page number
    const pageText = `Seite ${pageNumber}`;
    const pageTextWidth = font.widthOfTextAtSize(pageText, fontSize);
    page.drawText(pageText, {
      x: rightMargin - pageTextWidth,
      y: footerY,
      size: fontSize,
      font,
      color,
    });
  }

  /**
   * Wraps text to fit within max width
   */
  protected static wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Draws multiline text
   */
  protected static drawMultilineText(
    page: PDFPage,
    text: string,
    yPosition: number,
    leftMargin: number,
    font: PDFFont,
    fontSize: number,
    color: RGB,
    maxWidth: number,
  ): number {
    const lines = this.wrapText(text, font, fontSize, maxWidth);
    let currentY = yPosition;

    for (const line of lines) {
      page.drawText(line, {
        x: leftMargin,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
      currentY -= fontSize + 5;
    }

    return currentY - 10;
  }
}
