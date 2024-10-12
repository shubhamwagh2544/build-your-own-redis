const net = require('net');
const {
    checkIfKeyExist,
    deserializer,
    serializer,
    redisRegexPattern,
    checkKeysExists,
    processBulkString, deleteMultipleKeys
} = require("./util");

const server = net.createServer();
const port = 8000;
const hostname = '127.0.0.1';
const redisUrl = `https://redis.io/learn/howtos/quick-start/cheat-sheet`;

const store = {};

server.on('connection', (socket) => {
    console.log('client connected: ', socket.address());

    socket.on('data', (data) => {
        const reply = serializer(data.toString('utf8'));
        console.log(reply);
        let message = 'ERR: error processing data';

        // switch case for commands
        const command = reply[0].toLowerCase();
        try {
            switch (command) {
                // STRINGS/NUMBERS
                case 'ping': {
                    if (reply.length === 1) {
                        message = 'PONG';
                        socket.write(`+${message}\r\n`);
                        return;
                    } else if (reply.length > 1) {
                        message = `ping <no-opt> should be single message to redis server`
                        socket.write(`-${message}\r\n`);
                    } else {
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'set': {
                    if (reply.length === 3) {
                        const key = reply[1];
                        const value = reply[2];

                        store[key] = value;
                        socket.write(`+OK\r\n`);
                        return;
                    } else if (reply.length < 3 || reply.length > 3) {
                        message = `ERR syntax error`
                        socket.write(`-${message}\r\n`);
                    } else {
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'get': {
                    if (reply.length === 2) {
                        const key = reply[1];

                        let value = store[key];
                        if (!value) {
                            socket.write(`$-1\r\n`);
                            return;
                        }

                        value = value.toString();
                        socket.write(`$${value.length}\r\n${value}\r\n`);
                    } else if (reply.length > 2 || reply.length < 2) {
                        message = `ERR wrong number of arguments for 'get' command`
                        socket.write(`-${message}\r\n`);
                    } else {
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'mget': {
                    if (reply.length > 1) {
                        const keys = reply.splice(1);
                        const result = checkKeysExists(keys, store).result;

                        // create a serialized string
                        const serializedArray = deserializer(result);
                        socket.write(serializedArray)
                    } else {
                        message = `mget [key...] should be format`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'del': {
                    if (reply.length > 1) {
                        const keys = reply.splice(1);
                        const count = deleteMultipleKeys(keys, store).count;
                        socket.write(`:${count}\r\n`)
                    } else {
                        message = `del [key...] should be format`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'incr': {
                    if (reply.length === 2) {
                        const key = reply[1];
                        if (!checkIfKeyExist(key, store)) {
                            socket.write(`$-1\r\n`);
                            return;
                        }

                        let value = store[key];
                        value = parseInt(value, 10);
                        if (isNaN(value)) {
                            message = 'ERR value is not an integer or out of range';
                            socket.write(`-${message}\r\n`);
                            return;
                        }
                        value += 1;
                        store[key] = value;

                        socket.write(`:${value}\r\n`)
                    } else {
                        message = `ERR syntax error`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                // GENERIC
                case 'keys': {
                    if (reply.length === 2) {
                        const pattern = reply[1];
                        const result = redisRegexPattern(pattern, store);
                        const serializedArray = deserializer(result);

                        socket.write(serializedArray);
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'exists': {
                    if (reply.length > 1) {
                        const keys = reply.slice(1);
                        const count = checkKeysExists(keys, store).count;
                        socket.write(`:${count}\r\n`)
                    } else {
                        message = `exists [key...] should be format`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                // custom command
                case 'store': {
                    // print all keys and values present in store
                    for (const key in store) {
                        console.log(key, ' ', store[key])
                    }
                    socket.write(`+OK\r\n`);
                }
                    break;

                default: {
                    message = `Wrong Command: ${command}. Please visit ${redisUrl}`;
                    socket.write(`-${message}\r\n`);
                }
            }

        } catch (error) {
            console.log('Error: ', error);
            message = `
                    ERR unknown command '${command}'.
                    Please visit ${redisUrl}
            `;
            message = processBulkString(message);
            socket.write(message);
        }

    });

    server.on('close', () => {
        console.log('client disconnected: ', socket.ref());
    })
})

server.listen(port, hostname, () => console.log(`custom redis server started on ${hostname}:${port}`));
