import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PdfExporter } from "../utils/pdfExporter";
import { WeekData } from "../utils/storage";
import type { AppConfiguration } from "../types/config.types";
import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

// Mocking external dependencies
vi.mock("pdf-lib", async () => {
  const actualPdfLib = await vi.importActual("pdf-lib");
  const mockPdfDoc = {
    addPage: vi.fn().mockReturnValue({
      drawText: vi.fn(),
      drawImage: vi.fn(),
      drawRectangle: vi.fn(),
      drawLine: vi.fn(),
      scale: vi.fn().mockReturnValue({ width: 100, height: 50 }),
    }),
    embedFont: vi.fn().mockResolvedValue({}),
    embedPng: vi.fn().mockResolvedValue({
      scale: vi.fn().mockReturnValue({ width: 100, height: 50 }),
    }),
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setCreationDate: vi.fn(),
    setModificationDate: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  return {
    ...actualPdfLib,
    PDFDocument: {
      create: vi.fn().mockResolvedValue(mockPdfDoc),
    },
  };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi
      .fn()
      .mockResolvedValue("data:image/png;base64,qr-code-string"),
  },
}));

// Mocking browser-specific features
const mockUrl = {
  createObjectURL: vi.fn().mockReturnValue("mock-url"),
  revokeObjectURL: vi.fn(),
};
const mockLink = {
  href: "",
  download: "",
  click: vi.fn(),
};
const mockDocument = {
  createElement: vi.fn().mockReturnValue(mockLink),
};

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
) as any;

// JSDOM does not have atob, so we mock it.
global.atob = vi.fn().mockReturnValue("decoded-string");

Object.defineProperty(global, "document", { value: mockDocument });
Object.defineProperty(global, "URL", { value: mockUrl });

const mockConfig: AppConfiguration = {
  company: {
    company_name: "TestFirma",
    company_logo: "/logo.png",
  },
  work: {
    allow_past_timesheet_editing: true,
    allow_future_timesheet_editing: true,
    max_past_days: 7,
    max_future_days: 7,
    work_time_options: [],
    default_work_time: "",
    default_break_time: 0,
    allow_break_time_editing: true,
    filename_pattern: "{employeeName}_{weekYear}_{weekNumber}",
  },
  pdf: {
    pdf_title_prefix: "Stundenzettel",
    pdf_author: "Mitarbeiter-App",
    timesheet_header: "Stundennachweis",
    signature_label: "Stempel/Unterschrift",
    pdf_footer_text: "Firma Test GmbH",
    qr_code_app_identifier: "MA_APP",
    legal_notice_timesheet: "Rechtlicher Hinweis",
  },
  technical: {
    qr_code_type_timesheet: "TIMESHEET_V1",
    feature_flags: {},
  },
};

const mockWeekData: WeekData = {
  year: 2025,
  week: 47,
  employeeName: "Max Mustermann",
  customer: "Testkunde",
  shiftModel: "day",
  days: [
    {
      date: "2025-11-17",
      from: "08:00",
      to: "16:00",
      pause1From: "12:00",
      pause1To: "12:30",
      isNightShift: false,
      hours: "07:30",
    },
    { date: "2025-11-18", from: "08:00", to: "17:00", hours: "09:00" },
    { date: "2025-11-19" },
    { date: "2025-11-20" },
    { date: "2025-11-21" },
    { date: "2025-11-22" },
    { date: "2025-11-23" },
  ],
  employeeSignature: "data:image/png;base64,employeesig",
  supervisorSignature: "data:image/png;base64,supervisorsig",
  supervisorName: "Dr. Supervisor",
};

describe("PdfExporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock date to have consistent output
    vi.spyOn(global, "Date").mockImplementation(
      () => new Date("2025-11-20T10:00:00.000Z")
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateQRData (private)", () => {
    it("should generate a valid QR code data string", () => {
      const qrDataString = (PdfExporter as any).generateQRData(
        mockWeekData,
        mockConfig
      );
      const qrData = JSON.parse(qrDataString);

      expect(qrData.type).toBe("TIMESHEET_V1");
      expect(qrData.employee.name).toBe("Max Mustermann");
      expect(qrData.supervisor.name).toBe("Dr. Supervisor");
      expect(qrData.period.week).toBe(47);
      expect(qrData.days.length).toBe(7);
      expect(qrData.days[0].workTime.from).toBe("08:00");
      expect(qrData.days[0].breaks.length).toBe(1);
      expect(qrData.days[2].workTime.from).toBe(""); // Empty day
      expect(qrData.signatures.employee).toBe(true);
      expect(qrData.signatures.supervisor).toBe(true);
    });
  });

  describe("generatePDF", () => {
    it("should call PDFDocument.create and set metadata", async () => {
      await PdfExporter.generatePDF(mockWeekData, mockConfig);
      const pdfDocMock = await PDFDocument.create();

      expect(PDFDocument.create).toHaveBeenCalled();
      expect(pdfDocMock.setTitle).toHaveBeenCalledWith(
        "Stundenzettel KW47/2025 - Max Mustermann"
      );
      expect(pdfDocMock.setAuthor).toHaveBeenCalledWith("Mitarbeiter-App");
    });

    it("should attempt to fetch and embed a logo", async () => {
      await PdfExporter.generatePDF(mockWeekData, mockConfig);
      const pdfDocMock = await PDFDocument.create();

      expect(global.fetch).toHaveBeenCalledWith("http://localhost:3000/logo.png");
      expect(pdfDocMock.embedPng).toHaveBeenCalled();
    });

    it("should generate and embed a QR code", async () => {
      await PdfExporter.generatePDF(mockWeekData, mockConfig);
      const pdfDocMock = await PDFDocument.create();

      expect(QRCode.toDataURL).toHaveBeenCalled();
      expect(pdfDocMock.embedPng).toHaveBeenCalled();
    });

    it("should draw all text elements like headers and data rows", async () => {
      await PdfExporter.generatePDF(mockWeekData, mockConfig);
      const page = (await PDFDocument.create()).addPage();

      // Check some key text elements
      expect(page.drawText).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Stundennachweis" })
      );
      expect(page.drawText).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Mitarbeiter: Max Mustermann" })
      );
      expect(page.drawText).toHaveBeenCalledWith(
        expect.objectContaining({ text: "GESAMTSTUNDEN: 16.50 Std." })
      );
      // Check if it draws day names
      expect(page.drawText).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Montag" })
      );
    });

    it("should embed signatures if they exist", async () => {
      await PdfExporter.generatePDF(mockWeekData, mockConfig);
      const pdfDocMock = await PDFDocument.create();
      // Called for logo, qr, and two signatures
      expect(pdfDocMock.embedPng).toHaveBeenCalledTimes(4);
    });
  });

  describe("downloadPDF", () => {
    it("should create a blob and trigger a download", () => {
      const pdfBytes = new Uint8Array([1, 2, 3, 4]);
      const filename = "test.pdf";

      PdfExporter.downloadPDF(pdfBytes, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
      expect(mockDocument.createElement).toHaveBeenCalledWith("a");
      expect(mockLink.href).toBe("mock-url");
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
    });
  });

  describe("exportWeekAsPDF", () => {
    it("should throw an error if validation fails", async () => {
      const invalidWeekData = { ...mockWeekData, employeeName: "" }; // Invalid data
      await expect(
        PdfExporter.exportWeekAsPDF(invalidWeekData, mockConfig)
      ).rejects.toThrow("Validierung fehlgeschlagen");
    });

    it("should call generatePDF and downloadPDF on successful validation", async () => {
      const generatePdfSpy = vi.spyOn(PdfExporter, "generatePDF");
      const downloadPdfSpy = vi.spyOn(PdfExporter, "downloadPDF");

      await PdfExporter.exportWeekAsPDF(mockWeekData, mockConfig);

      expect(generatePdfSpy).toHaveBeenCalledWith(mockWeekData, mockConfig);
      expect(downloadPdfSpy).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        "Max_Mustermann_2025_47.pdf"
      );
    });
  });
});
