import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

type Pretty<T> = T extends T ? { [K in keyof T]: T[K] } : never;

const plugin: dayjs.PluginFunc = (_options, _dayjsClass, dayjsFactory) => {
  if (!dayjsFactory.duration) {
    dayjsFactory.extend(duration);
  }

  dayjsFactory.timeInterval = function (config) {
    return new TimeInterval(
      "start" in config
        ? dayjs(config.start)
        : dayjs(config.end).add(
            dayjs.isDuration(config.duration)
              ? config.duration
              : dayjs.duration(config.duration),
          ),
      "end" in config
        ? dayjs(config.end)
        : dayjs(config.start).add(
            dayjs.isDuration(config.duration)
              ? config.duration
              : dayjs.duration(config.duration),
          ),
    );
  };

  dayjsFactory.isTimeInterval = function (t) {
    return t instanceof TimeInterval;
  };
};

declare namespace plugin {
  export interface TimeInterval {
    readonly start: dayjs.Dayjs;
    readonly end: dayjs.Dayjs;
    readonly duration: duration.Duration;

    clone(): TimeInterval;

    isValid(unit?: dayjs.OpUnitType): boolean;
    isSame(other: TimeInterval, unit?: dayjs.OpUnitType): boolean;
    overlaps(other: TimeInterval, unit?: dayjs.OpUnitType): boolean;
    includes(d: dayjs.ConfigType, unit?: dayjs.OpUnitType): boolean;
    withStart(
      start: dayjs.ConfigType | ((start: dayjs.Dayjs) => dayjs.ConfigType),
    ): TimeInterval;
    withEnd(
      end: dayjs.ConfigType | ((end: dayjs.Dayjs) => dayjs.ConfigType),
    ): TimeInterval;

    toJSON(): string;
    toISOString(): string;
    format(formatStr?: string): { start: string; end: string };
  }

  type FullConfigType = {
    start: dayjs.ConfigType;
    end: dayjs.ConfigType;
    duration: duration.Duration | duration.DurationUnitsObjectType;
  };
  export type ConfigType = {
    [K in keyof FullConfigType]: Pretty<Omit<FullConfigType, K>>;
  }[keyof FullConfigType];
}

export default plugin;

declare module "dayjs" {
  export function timeInterval(config: plugin.ConfigType): plugin.TimeInterval;
  export function isTimeInterval(t: unknown): t is plugin.TimeInterval;
}

class TimeInterval implements plugin.TimeInterval {
  constructor(
    readonly start: dayjs.Dayjs,
    readonly end: dayjs.Dayjs,
  ) {}

  get duration(): duration.Duration {
    return dayjs.duration(this.end.diff(this.start));
  }

  clone(): plugin.TimeInterval {
    return new TimeInterval(this.start, this.end);
  }

  isValid(unit?: dayjs.OpUnitType): boolean {
    return this.start.isBefore(this.end, unit);
  }
  isSame(other: plugin.TimeInterval, unit?: dayjs.OpUnitType): boolean {
    return (
      this.start.isSame(other.start, unit) && this.end.isSame(other.end, unit)
    );
  }
  overlaps(other: plugin.TimeInterval, unit?: dayjs.OpUnitType): boolean {
    return (
      this.start.isBefore(other.end, unit) &&
      other.start.isBefore(this.end, unit)
    );
  }
  includes(d: dayjs.ConfigType, unit?: dayjs.OpUnitType): boolean {
    return (
      this.end.isAfter(d, unit) &&
      (this.start.isBefore(d, unit) || this.start.isSame(d, unit))
    );
  }

  withStart(
    start: dayjs.ConfigType | ((start: dayjs.Dayjs) => dayjs.ConfigType),
  ): plugin.TimeInterval {
    const newStart = typeof start === "function" ? start(this.start) : start;

    return new TimeInterval(dayjs(newStart), this.end);
  }
  withEnd(
    end: dayjs.ConfigType | ((end: dayjs.Dayjs) => dayjs.ConfigType),
  ): plugin.TimeInterval {
    const newEnd = typeof end === "function" ? end(this.end) : end;

    return new TimeInterval(this.start, dayjs(newEnd));
  }

  toJSON(): string {
    return this.toISOString();
  }
  toISOString(): string {
    return `${this.start.toISOString()}/${this.end.toISOString()}`;
  }

  format(formatStr?: string) {
    return {
      start: this.start.format(formatStr),
      end: this.end.format(formatStr),
    };
  }
}
