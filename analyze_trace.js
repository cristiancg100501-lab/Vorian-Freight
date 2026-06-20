const fs = require('fs');

console.log("Reading trace file...");
const raw = fs.readFileSync('/Users/cristian/Downloads/Trace-20260620T004823.json', 'utf8');

console.log("Parsing JSON...");
let trace;
try {
  trace = JSON.parse(raw);
} catch (e) {
  console.log("JSON Parse Error:", e.message);
  process.exit(1);
}

const events = Array.isArray(trace) ? trace : (trace.traceEvents || []);

console.log(`Found ${events.length} events.`);

const functionTimes = {};
const categoryTimes = {};
const nameTimes = {};

let totalTime = 0;

events.forEach(e => {
  // Only look at Complete events (X) which have a duration (dur)
  // or B/E (Begin/End) pairs, but X are standard for JS profiles
  if (e.dur) {
      const ms = e.dur / 1000;
      totalTime += ms;
      
      nameTimes[e.name] = (nameTimes[e.name] || 0) + ms;
      
      if (e.cat) {
          categoryTimes[e.cat] = (categoryTimes[e.cat] || 0) + ms;
      }
      
      if (e.name === 'FunctionCall' || e.name === 'EvaluateScript' || e.name === 'RunMicrotasks' || e.name === 'MinorGC' || e.name === 'MajorGC') {
          let context = 'unknown';
          if (e.args && e.args.data) {
              if (e.args.data.functionName) context = e.args.data.functionName;
              else if (e.args.data.url) {
                  const parts = e.args.data.url.split('/');
                  context = parts[parts.length - 1];
              }
          }
          const key = `${e.name} (${context})`;
          functionTimes[key] = (functionTimes[key] || 0) + ms;
      }
      
      // Also catch React Fiber work
      if (e.args && e.args.data && e.args.data.functionName) {
           const fnName = e.args.data.functionName;
           if (fnName.includes('React') || fnName.includes('render') || fnName.includes('useEffect')) {
               functionTimes[fnName] = (functionTimes[fnName] || 0) + ms;
           }
      }
  }
});

console.log("\nTop 10 Event Names by Total Duration (ms):");
Object.entries(nameTimes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([k, v]) => console.log(`${k}: ${v.toFixed(2)} ms`));

console.log("\nTop 10 JS Functions / Contexts by Total Duration (ms):");
Object.entries(functionTimes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([k, v]) => console.log(`${k}: ${v.toFixed(2)} ms`));

