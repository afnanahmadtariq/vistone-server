import { calendarSlipDays, addCalendarDays, startOfLocalDay } from "./milestone-schedule-cascade";

describe("milestone-schedule-cascade", () => {
  describe("startOfLocalDay", () => {
    it("strips time in local tz", () => {
      const d = new Date(2025, 4, 8, 15, 30, 0);
      const s = startOfLocalDay(d);
      expect(s.getHours()).toBe(0);
      expect(s.getMinutes()).toBe(0);
      expect(s.getDate()).toBe(8);
      expect(s.getMonth()).toBe(4);
    });
  });

  describe("calendarSlipDays", () => {
    it("returns 0 without planned end", () => {
      expect(calendarSlipDays(null, new Date())).toBe(0);
    });

    it("returns positive when actual is after planned day", () => {
      const planned = new Date(2025, 4, 1);
      const actual = new Date(2025, 4, 8);
      expect(calendarSlipDays(planned, actual)).toBe(7);
    });

    it("returns negative when actual is before planned day", () => {
      const planned = new Date(2025, 4, 10);
      const actual = new Date(2025, 4, 3);
      expect(calendarSlipDays(planned, actual)).toBe(-7);
    });

    it("returns 0 on same calendar day", () => {
      const planned = new Date(2025, 4, 5, 23, 0, 0);
      const actual = new Date(2025, 4, 5, 8, 0, 0);
      expect(calendarSlipDays(planned, actual)).toBe(0);
    });
  });

  describe("addCalendarDays", () => {
    it("adds days across month boundary", () => {
      const d = new Date(2025, 4, 28);
      const out = addCalendarDays(d, 5);
      expect(out.getMonth()).toBe(5);
      expect(out.getDate()).toBe(2);
    });
  });
});
