const net = require('net');
const server = net.createServer();
const port = 8000;
const hostname = '127.0.0.1';

const store = {};

const requestResponseHandler = (data) => {
    const result = [];
    if (typeof data !== 'string') {
        return 'Error: invalid request';
    }
    if (data.startsWith('*')) {
        // data is an array
        data = data.slice(1).split('\r\n').filter((item) => item !== '').slice(1);
        // check array content valid
        if (data.length % 2 !== 0) {
            return 'Error: invalid request';
        }
        for (let i = 0; i < data.length; i += 2) {
            const length = parseInt(data[i].slice(1));
            if (data[i+1].length !== length) {
                console.log('Error: error at parsing data');
            }
            result.push(data[i+1]);
        }
    }
    return result;
}

server.on('connection', (socket) => {
    console.log('client connected: ', socket.address());

    socket.on('data', (data) => {
        // Redis Request Response Protocol
        const Data = requestResponseHandler(data.toString('utf8'));
        console.log(Data);

        const command = Data[0].toLowerCase();
        switch (command) {
            case 'ping': {
                socket.write('+PONG\r\n');
            }
            break;

            default: {
                socket.write('+OK\r\n');
            }
        }

    });

    server.on('close', () => {
        console.log('client disconnected: ', socket.address());
    })
})

server.listen(port, hostname, () => console.log(`custom redis server started on ${hostname}:${port}`));
