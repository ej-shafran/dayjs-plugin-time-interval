import { describe, expect, it } from "vitest";

import dayjs from "dayjs";
import timeInterval from "./index";

dayjs.extend(timeInterval);

describe("dayjs.timeInterval", () => {
  it("should create TimeInterval objects", () => {
    const timeInterval = dayjs.timeInterval({ start: dayjs(), end: dayjs() });
    expect(dayjs.isTimeInterval(timeInterval)).toBe(true);
  });
});

// TODO: add tests here
