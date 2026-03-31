const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  // Pass configuration for React single-page app routing
  return handler(request, response, {
    public: 'dist',
    rewrites: [
      { source: '**', destination: '/index.html' }
    ]
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});
