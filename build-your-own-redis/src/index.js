const net = require('net');
const Parser = require('redis-parser');

const server = net.createServer();
const port = 8000;
const hostname = '127.0.0.1';

const store = {};

server.on('connection', (socket) => {
    console.log('client connected: ', socket.address());

    socket.on('data', (data) => {
        const parser = new Parser({
            returnReply: function (reply) {
                console.log(reply);

                if (reply.length === 1 && reply[0] === 'ping') {
                    socket.write(`+pong\r\n`);
                } else {
                    socket.write(`+OK\r\n`);
                }
            },
            returnError: function (error) {
                console.log(error);
            }
        })
        parser.execute(data);
    });

    server.on('close', () => {
        console.log('client disconnected: ', socket.ref());
    })
})

server.listen(port, hostname, () => console.log(`custom redis server started on ${hostname}:${port}`));
