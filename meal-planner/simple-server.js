const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Server</title>
    </head>
    <body>
        <h1>🍽️ Meal Planner Test</h1>
        <p>Este es un servidor de prueba para verificar que Node.js funciona correctamente.</p>
        <p>Fecha: ${new Date().toISOString()}</p>
        <p>Puerto: 3003</p>
    </body>
    </html>
  `);
});

server.listen(3003, 'localhost', () => {
  console.log('🚀 Test server running at http://localhost:3003');
});