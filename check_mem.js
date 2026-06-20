const http = require('http');

http.get('http://127.0.0.1:9222/json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const pages = JSON.parse(body);
    const targetPage = pages.find(p => p.type === 'page' && p.url.includes('vorianglobal.com'));
    if (!targetPage) {
      console.log('No Vorian page found.');
      return;
    }
    
    const WebSocket = require('ws'); // Might need to install ws if not available
    try {
      const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
      ws.on('open', () => {
        // Evaluate performance metrics
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              const mem = performance.memory;
              const wss = Object.keys(window).filter(k => k.includes('supabase'));
              JSON.stringify({
                usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024) + 'MB',
                totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024) + 'MB',
                wss_keys: wss,
                performance_entries: performance.getEntriesByType('resource').filter(e => e.name.includes('supabase')).length
              })
            `,
            returnByValue: true
          }
        }));
      });
      
      ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === 1) {
          console.log('Result:', response.result.result.value);
          ws.close();
        }
      });
    } catch(e) {
      console.error(e);
    }
  });
});
