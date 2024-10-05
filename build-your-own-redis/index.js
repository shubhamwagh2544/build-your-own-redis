const net = require('net');

const server = net.createServer((connection) => {
    connection.on('data', (data) => {
        console.log('data received:', data.toString());
        connection.write('+OK\r\n');
    });
})

server.listen(8000,
    () => console.log('custom redis server started on 8000')
);
