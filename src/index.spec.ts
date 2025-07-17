import { describe, expect } from "vitest";
import fc from "fast-check";
import { it } from "@fast-check/vitest";

import dayjs from "dayjs";
import type duration from "dayjs/plugin/duration";
import timeInterval from "./index";

dayjs.extend(timeInterval);

// TODO: test that methods receive `unit` parameters correctly

const dayjsArb = (constraints?: fc.DateConstraints) =>
  fc.date(constraints).map((date) => {
    const d = dayjs(date);
    (d as fc.WithToStringMethod & typeof d)[fc.toStringMethod] = () =>
      d.toISOString();
    return d;
  });

const relevantDateConstraints = {
  max: dayjs().add(100000, "years").toDate(),
  min: dayjs().subtract(100000, "years").toDate(),
  noInvalidDate: true,
};

const relevantDayjsArb = () => dayjsArb(relevantDateConstraints);

const durationArb = (numArb: fc.Arbitrary<number>) =>
  numArb.map((config) => {
    const duration = dayjs.duration(config, "ms");
    (duration as fc.WithToStringMethod & typeof duration)[fc.toStringMethod] =
      () => duration.toISOString();
    return duration;
  });

const positiveDurationArb = () => durationArb(fc.integer({ min: 1 }));

const intervalArb = () =>
  fc
    .tuple(relevantDayjsArb(), positiveDurationArb())
    .map(([start, duration]) => {
      const interval = dayjs.timeInterval({ start, duration });
      (interval as fc.WithToStringMethod & typeof interval)[fc.toStringMethod] =
        () => interval.toISOString();
      return interval;
    });

const dayjsPairProp = it.prop([dayjsArb(), dayjsArb()]);
const dayjsAndDurationProp = it.prop([dayjsArb(), durationArb(fc.float())]);
const dayjsAndPositiveDurationProp = it.prop([
  relevantDayjsArb(),
  positiveDurationArb(),
]);
const intervalProp = it.prop([intervalArb()]);
const intervalAndNonZeroDurationProp = it.prop([
  intervalArb(),
  durationArb(fc.integer().filter(Boolean)),
]);
const intervalAndPositiveDurationProp = it.prop([
  intervalArb(),
  positiveDurationArb(),
]);

describe("dayjs.timeInterval", () => {
  intervalProp("should recreate `TimeInterval`s from ISO string", (interval) =>
    dayjs.timeInterval(interval.toISOString()).isSame(interval),
  );

  dayjsPairProp(
    "should create `TimeInterval`s from `start` and `end`",
    (start, end) => dayjs.isTimeInterval(dayjs.timeInterval({ start, end })),
  );

  dayjsAndDurationProp(
    "should create `TimeInterval`s from `start` and `duration`",
    (start, duration) =>
      dayjs.isTimeInterval(dayjs.timeInterval({ start, duration })),
  );

  dayjsAndDurationProp(
    "should create `TimeInterval`s from `end` and `duration`",
    (end, duration) =>
      dayjs.isTimeInterval(dayjs.timeInterval({ end, duration })),
  );
});

describe("TimeInterval.isValid", () => {
  dayjsAndPositiveDurationProp(
    "should return `true` when duration is positive",
    (start, duration) => dayjs.timeInterval({ start, duration }).isValid(),
  );

  dayjsAndPositiveDurationProp(
    "should return `false` when duration is negative",
    (start, duration) =>
      !dayjs
        .timeInterval({
          start,
          duration: dayjs.duration(0).subtract(duration),
        })
        .isValid(),
  );
});

function describeWithFunction(kind: "start" | "end") {
  const otherKind = kind === "start" ? "end" : "start";
  const withFunction = kind === "start" ? "withStart" : "withEnd";

  const modify = (
    interval: timeInterval.TimeInterval,
    duration: duration.Duration,
  ) => interval[withFunction]((startOrEnd) => startOrEnd.add(duration));

  describe(`TimeInterval.${withFunction}`, () => {
    intervalAndNonZeroDurationProp(
      `should return a different value for ${kind}`,
      (interval, duration) =>
        !modify(interval, duration)[kind].isSame(interval[kind]),
    );
    intervalAndNonZeroDurationProp(
      `should return the same value for ${otherKind}`,
      (interval, duration) =>
        modify(interval, duration)[otherKind].isSame(interval[otherKind]),
    );
  });
}

describeWithFunction("start");

describeWithFunction("end");

describe("TimeInterval.isSame", () => {
  intervalProp("should return `true` for itself", (interval) =>
    interval.isSame(interval),
  );

  intervalAndNonZeroDurationProp(
    "should return `false` for a modified start",
    (interval, duration) =>
      !interval.isSame(interval.withStart((start) => start.add(duration))),
  );

  intervalAndNonZeroDurationProp(
    "should return `false` for a modified end",
    (interval, duration) =>
      !interval.isSame(interval.withEnd((end) => end.add(duration))),
  );
});

describe("TimeInterval.includes", () => {
  intervalProp("should include its start", (interval) =>
    interval.includes(interval.start),
  );

  intervalProp(
    "should exclude its end",
    (interval) => !interval.includes(interval.end),
  );

  intervalAndPositiveDurationProp(
    "should exclude things before its start",
    (interval, duration) =>
      !interval.includes(interval.start.subtract(duration)),
  );

  intervalAndPositiveDurationProp(
    "should exclude things after its end",
    (interval, duration) => !interval.includes(interval.end.add(duration)),
  );

  intervalAndPositiveDurationProp(
    "should include things between its start and its end",
    (interval, duration) =>
      interval.withEnd((end) => end.add(duration)).includes(interval.end),
  );
});

describe("TimeInterval.overlaps", () => {
  intervalAndPositiveDurationProp(
    "should overlap with an interval with a later end",
    (interval, duration) =>
      interval.overlaps(interval.withEnd((end) => end.add(duration))),
  );

  intervalAndPositiveDurationProp(
    "should overlap with an interval with an earlier start",
    (interval, duration) =>
      interval.overlaps(
        interval.withStart((start) => start.subtract(duration)),
      ),
  );

  intervalProp(
    "should not overlap with an interval that follows right after",
    (interval) =>
      !interval.overlaps(
        dayjs.timeInterval({
          start: interval.end,
          duration: interval.duration,
        }),
      ),
  );

  intervalProp(
    "should not overlap with an interval that comes right before",
    (interval) =>
      !interval.overlaps(
        dayjs.timeInterval({
          end: interval.start,
          duration: interval.duration,
        }),
      ),
  );
});
