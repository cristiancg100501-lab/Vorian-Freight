const fs = require('fs');
const raw = fs.readFileSync('/Users/cristian/Downloads/Trace-20260620T004823.json', 'utf8');
const trace = JSON.parse(raw);
const events = Array.isArray(trace) ? trace : (trace.traceEvents || []);

const renderTimes = {};
let totalMs = 0;

events.forEach(e => {
  if (e.dur) {
    const ms = e.dur / 1000;
    totalMs += ms;
    
    // Group all events by name
    renderTimes[e.name] = (renderTimes[e.name] || 0) + ms;
  }
});

console.log("\nTop 20 Events overall (ms):");
Object.entries(renderTimes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([k, v]) => console.log(`${k}: ${v.toFixed(2)} ms`));

