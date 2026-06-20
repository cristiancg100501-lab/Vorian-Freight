const list = [
    { dt: 1781600000, dt_txt: "2026-06-17 06:00:00", weather: [{ main: "Clouds" }] },
    { dt: 1781610800, dt_txt: "2026-06-17 09:00:00", weather: [{ main: "Clear" }] },
    { dt: 1781672000, dt_txt: "2026-06-18 02:00:00", weather: [{ main: "Rain" }] },
    { dt: 1781682800, dt_txt: "2026-06-18 05:00:00", weather: [{ main: "Snow" }] }
];

const targetDate = new Date(2026, 5, 18, 2, 0, 0); // Month is 0-indexed, so 5 = June. June 18th, 2:00 AM local.
const targetTimestamp = Math.floor(targetDate.getTime() / 1000);

console.log("Target Date:", targetDate);
console.log("Target Timestamp:", targetTimestamp);

let targetForecast = list.reduce((prev, curr) => {
    return (Math.abs(curr.dt - targetTimestamp) < Math.abs(prev.dt - targetTimestamp) ? curr : prev);
});

console.log("Matched Forecast:", targetForecast);
