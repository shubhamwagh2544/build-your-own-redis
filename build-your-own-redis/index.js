const net = require('net');

const server = net.createServer((connection) => {

})

server.listen(8000,
    () => console.log('custom redis server started on 8000')
);
