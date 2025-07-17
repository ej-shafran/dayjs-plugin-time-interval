# dayjs-plugin-time-interval

A Dayjs plugin to add support for time intervals, as described in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Time_intervals).

## Installation & Setup

To install, use your favorite package manager:

```bash
npm install dayjs dayjs-plugin-time-interval
```

Then, to setup, call `dayjs.extend` with the plugin:

```js
import dayjs from "dayjs";
import timeInterval from "dayjs-plugin-time-interval";

dayjs.extend(timeInterval);
```

NOTE: this plugin will automatically extend `dayjs` with the [Duration](https://day.js.org/docs/en/plugin/duration) plugin if it hasn't been extended with it already, since it depends on durations to properly denote time intervals.

## Usage

```js
const now = dayjs();

// Construct `TimeInterval`s
const interval = dayjs.timeInterval({
  start: now,
  end: now.add(1, "hour"),
});
// Alternatively, you can construct intervals with any two of `start`, `end`, and `duration`
const interval2 = dayjs.timeInterval({
  start: now,
  duration: dayjs.duration(1, "hour"),
});
const interval3 = dayjs.timeInterval({
  end: now.add(1, "hour"),
  duration: dayjs.duration(1, "hour"),
});

// You can get fields of the interval
interval.duration.as("hour"); // 1
interval.start; // now
interval.end; // now.add(1, "hour");

// Check if an interval includes some time, with some specificity
interval.includes(now.add(2, "hours")); // false
interval.includes(now.add(5, "minutes"), "minutes"); // true

// Get a modified version of the interval (using immutable methods)
interval.withStart(now.add(5, "minutes"));
interval.withEnd(now.add(1, "hour").add(5, "minutes"));
// As a convenience, you can pass a callback which will be called with the interval's start or end
const startsLater = interval.withStart((start) => start.add(5, "minutes"));
const endsLater = interval.withEnd((end) => end.add(5, "minutes"));

// Check if two intervals overlap, with some specificity
interval.overlaps(startsLater, "minutes"); // true
interval.overlaps(endsLater.withStart(interval.end), "minutes"); // false

// Get as an ISO string
interval.toISOString(); // "ISO String/ISO String"
interval.toJSON(); // "ISO String/ISO String"

// Get both start and end formatted
interval.format("HH:mm:ss"); // { start: "HH:mm:ss", end: "HH:mm:ss" }
```
