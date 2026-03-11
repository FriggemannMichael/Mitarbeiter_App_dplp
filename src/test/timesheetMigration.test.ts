/**
 * Tests für Timesheet Migration Utilities
 */

import { describe, it, expect } from "vitest";
import {
  migrateWeekDataToStatus,
  migrateDayData,
  migrateWeekDataComplete,
  needsMigration,
  transitionToEmployeeSigned,
  transitionToForemanSigned,
  transitionDayToForemanSigned,
  unlockWeek,
  isDayEditable,
  isWeekEditable,
} from "../utils/timesheetMigration";
import { WeekData, DayData } from "../types/weekdata.types";

describe("timesheetMigration", () => {
  describe("migrateWeekDataToStatus", () => {
    it("sollte OPEN Status für ungesperrte Woche ohne Unterschriften setzen", () => {
      const oldWeek: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max Mustermann",
        customer: "Firma ABC",
        days: [],
        locked: false,
      };

      const result = migrateWeekDataToStatus(oldWeek);
      expect(result.status).toBe("OPEN");
      expect(result.locked).toBe(false); // Backward-Compat
    });

    it("sollte EMPLOYEE_SIGNED Status für Woche mit Mitarbeiter-Unterschrift setzen", () => {
      const oldWeek: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max Mustermann",
        customer: "Firma ABC",
        days: [],
        locked: false,
        employeeSignature: "base64signature",
      };

      const result = migrateWeekDataToStatus(oldWeek);
      expect(result.status).toBe("EMPLOYEE_SIGNED");
    });

    it("sollte FOREMAN_SIGNED_FULL Status für gesperrte Woche mit Vorarbeiter-Unterschrift setzen", () => {
      const oldWeek: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max Mustermann",
        customer: "Firma ABC",
        days: [],
        locked: true,
        employeeSignature: "base64signature",
        supervisorSignature: "base64signature2",
      };

      const result = migrateWeekDataToStatus(oldWeek);
      expect(result.status).toBe("FOREMAN_SIGNED_FULL");
      expect(result.locked).toBe(true);
    });

    it("sollte bestehenden Status nicht überschreiben", () => {
      const weekWithStatus: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max Mustermann",
        customer: "Firma ABC",
        days: [],
        locked: false,
        status: "EMPLOYEE_SIGNED",
      };

      const result = migrateWeekDataToStatus(weekWithStatus);
      expect(result.status).toBe("EMPLOYEE_SIGNED");
    });
  });

  describe("migrateDayData", () => {
    it("sollte OPEN Status für Tag mit Daten setzen", () => {
      const day: DayData = {
        date: "2025-11-03",
        from: "08:00",
        to: "17:00",
        pause1From: "12:00",
        pause1To: "12:30",
        pause2From: "",
        pause2To: "",
        hours: "08:30",
        decimal: "8.50",
      };

      const result = migrateDayData(day);
      expect(result.status).toBe("OPEN");
      expect(result.locked).toBeUndefined(); // Kein weekData gegeben
      expect(result.overridden).toBe(false);
    });

    it("sollte locked von WeekData übernehmen", () => {
      const day: DayData = {
        date: "2025-11-03",
        from: "08:00",
        to: "17:00",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "08:00",
        decimal: "8.00",
      };

      const week: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max",
        customer: "ABC",
        days: [],
        locked: true,
      };

      const result = migrateDayData(day, week);
      expect(result.locked).toBe(true);
    });
  });

  describe("needsMigration", () => {
    it("sollte true zurückgeben wenn status fehlt", () => {
      const week: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max",
        customer: "ABC",
        days: [],
        locked: false,
      };

      expect(needsMigration(week)).toBe(true);
    });

    it("sollte false zurückgeben wenn status vorhanden und Tage migriert", () => {
      const week: WeekData = {
        week: 45,
        year: 2025,
        startDate: "2025-11-03",
        sheetId: 1,
        employeeName: "Max",
        customer: "ABC",
        days: [
          {
            date: "2025-11-03",
            from: "08:00",
            to: "17:00",
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "08:00",
            decimal: "8.00",
            status: "OPEN",
            locked: false,
          },
        ],
        locked: false,
        status: "OPEN",
      };

      expect(needsMigration(week)).toBe(false);
    });
  });

  describe("Status Transitions", () => {
    describe("transitionToEmployeeSigned", () => {
      it("sollte Woche zu EMPLOYEE_SIGNED überführen", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [],
          locked: false,
          status: "OPEN",
        };

        const result = transitionToEmployeeSigned(week, "signature123");
        expect(result.status).toBe("EMPLOYEE_SIGNED");
        expect(result.employeeSignature).toBe("signature123");
        expect(result.version).toBe(1);
      });

      it("sollte Fehler werfen wenn bereits unterschrieben", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [],
          locked: false,
          status: "FOREMAN_SIGNED_FULL",
        };

        expect(() => transitionToEmployeeSigned(week, "sig")).toThrow();
      });
    });

    describe("transitionToForemanSigned", () => {
      it("sollte Woche zu FOREMAN_SIGNED_FULL überführen", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [
            {
              date: "2025-11-03",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "OPEN",
            },
          ],
          locked: false,
          status: "EMPLOYEE_SIGNED",
        };

        const result = transitionToForemanSigned(
          week,
          "foremanSig",
          "Herr Müller"
        );
        expect(result.status).toBe("FOREMAN_SIGNED_FULL");
        expect(result.locked).toBe(true);
        expect(result.supervisorSignature).toBe("foremanSig");
        expect(result.supervisorName).toBe("Herr Müller");
        expect(result.days[0].locked).toBe(true);
        expect(result.days[0].status).toBe("FOREMAN_SIGNED");
      });

      it("sollte Fehler werfen wenn Mitarbeiter noch nicht unterschrieben hat", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [],
          locked: false,
          status: "OPEN",
        };

        expect(() =>
          transitionToForemanSigned(week, "sig", "Müller")
        ).toThrow();
      });
    });

    describe("transitionDayToForemanSigned", () => {
      it("sollte einzelnen Tag bestätigen und Status auf PARTIAL setzen", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [
            {
              date: "2025-11-03",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "OPEN",
            },
            {
              date: "2025-11-04",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "OPEN",
            },
          ],
          locked: false,
          status: "EMPLOYEE_SIGNED",
        };

        const result = transitionDayToForemanSigned(
          week,
          "2025-11-03",
          "foremanSig",
          "Müller"
        );
        expect(result.status).toBe("FOREMAN_SIGNED_PARTIAL");
        expect(result.locked).toBe(false); // Nicht alle Tage bestätigt
        expect(result.days[0].status).toBe("FOREMAN_SIGNED");
        expect(result.days[0].locked).toBe(true);
        expect(result.days[1].status).toBe("OPEN");
      });

      it("sollte auf FULL wechseln wenn letzter Tag bestätigt wird", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [
            {
              date: "2025-11-03",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "FOREMAN_SIGNED",
              locked: true,
            },
            {
              date: "2025-11-04",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "OPEN",
            },
          ],
          locked: false,
          status: "EMPLOYEE_SIGNED",
        };

        const result = transitionDayToForemanSigned(
          week,
          "2025-11-04",
          "foremanSig",
          "Müller"
        );
        expect(result.status).toBe("FOREMAN_SIGNED_FULL");
        expect(result.locked).toBe(true);
      });
    });

    describe("unlockWeek", () => {
      it("sollte Woche und alle Tage entsperren", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [
            {
              date: "2025-11-03",
              from: "08:00",
              to: "17:00",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "08:00",
              decimal: "8.00",
              status: "FOREMAN_SIGNED",
              locked: true,
            },
          ],
          locked: true,
          status: "FOREMAN_SIGNED_FULL",
          employeeSignature: "sig1",
          supervisorSignature: "sig2",
        };

        const result = unlockWeek(week);
        expect(result.status).toBe("OPEN");
        expect(result.locked).toBe(false);
        expect(result.employeeSignature).toBeUndefined();
        expect(result.supervisorSignature).toBeUndefined();
        expect(result.days[0].status).toBe("OPEN");
        expect(result.days[0].locked).toBe(false);
      });
    });
  });

  describe("Editability Checks", () => {
    describe("isDayEditable", () => {
      it("sollte false zurückgeben wenn Tag gesperrt ist", () => {
        const day: DayData = {
          date: "2025-11-03",
          from: "08:00",
          to: "17:00",
          pause1From: "",
          pause1To: "",
          pause2From: "",
          pause2To: "",
          hours: "08:00",
          decimal: "8.00",
          locked: true,
          status: "OPEN",
        };

        expect(isDayEditable(day)).toBe(false);
      });

      it("sollte false zurückgeben wenn Tag FOREMAN_SIGNED ist", () => {
        const day: DayData = {
          date: "2025-11-03",
          from: "08:00",
          to: "17:00",
          pause1From: "",
          pause1To: "",
          pause2From: "",
          pause2To: "",
          hours: "08:00",
          decimal: "8.00",
          locked: false,
          status: "FOREMAN_SIGNED",
        };

        expect(isDayEditable(day)).toBe(false);
      });

      it("sollte false zurückgeben wenn Woche FOREMAN_SIGNED_FULL ist", () => {
        const day: DayData = {
          date: "2025-11-03",
          from: "08:00",
          to: "17:00",
          pause1From: "",
          pause1To: "",
          pause2From: "",
          pause2To: "",
          hours: "08:00",
          decimal: "8.00",
          locked: false,
          status: "OPEN",
        };

        expect(isDayEditable(day, "FOREMAN_SIGNED_FULL")).toBe(false);
      });

      it("sollte true zurückgeben für offenen Tag", () => {
        const day: DayData = {
          date: "2025-11-03",
          from: "08:00",
          to: "17:00",
          pause1From: "",
          pause1To: "",
          pause2From: "",
          pause2To: "",
          hours: "08:00",
          decimal: "8.00",
          locked: false,
          status: "OPEN",
        };

        expect(isDayEditable(day, "OPEN")).toBe(true);
      });
    });

    describe("isWeekEditable", () => {
      it("sollte false zurückgeben wenn Woche gesperrt ist", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [],
          locked: true,
          status: "FOREMAN_SIGNED_FULL",
        };

        expect(isWeekEditable(week)).toBe(false);
      });

      it("sollte true zurückgeben für offene Woche", () => {
        const week: WeekData = {
          week: 45,
          year: 2025,
          startDate: "2025-11-03",
          sheetId: 1,
          employeeName: "Max",
          customer: "ABC",
          days: [],
          locked: false,
          status: "OPEN",
        };

        expect(isWeekEditable(week)).toBe(true);
      });
    });
  });
});
