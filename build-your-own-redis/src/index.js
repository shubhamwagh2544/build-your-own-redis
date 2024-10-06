const net = require('net');
const Parser = require('redis-parser');
const {checkIfKeyExist, createSerializedArrayResult} = require("./util");

const server = net.createServer();
const port = 8000;
const hostname = '127.0.0.1';
const redisUrl = `https://redis.io/learn/howtos/quick-start/cheat-sheet`;

const store = {};

server.on('connection', (socket) => {
    console.log('client connected: ', socket.address());

    socket.on('data', (data) => {
        const parser = new Parser({
            returnReply: function (reply) {
                console.log(reply);
                let message = 'ERR: error processing data';

                // switch case for commands
                const command = reply[0];
                switch (command) {

                    // STRINGS/NUMBERS
                    case 'ping': {
                        if (reply.length === 1) {
                            message = 'pong';
                            socket.write(`+${message}\r\n`);
                            return;
                        }
                        else if (reply.length > 1) {
                            message = `ping <no-opt> should be single message to redis server`
                            socket.write(`-${message}\r\n`);
                        }
                        else {
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
                        }
                        else if (reply.length < 3 || reply.length > 3) {
                            message = `ERR syntax error`
                            socket.write(`-${message}\r\n`);
                        }
                        else {
                            socket.write(`-${message}\r\n`);
                        }
                    }
                    break;

                    case 'get': {
                        if (reply.length === 2) {
                            const key = reply[1];

                            const value = store[key];
                            if (!value) {
                                socket.write(`$-1\r\n`);
                                return;
                            }

                            socket.write(`$${value.length}\r\n${value}\r\n`);
                        }
                        else if (reply.length > 2 || reply.length < 2) {
                            message = `ERR wrong number of arguments for 'get' command`
                            socket.write(`-${message}\r\n`);
                        }
                        else {
                            socket.write(`-${message}\r\n`);
                        }
                    }
                    break;

                    case 'mget': {
                        if (reply.length) {
                            const keys = reply.splice(1);
                            const result = [];

                            for (const key of keys) {
                                if (store[key]) {
                                    result.push(`${store[key]}`)
                                }
                                else {
                                    result.push(`nil`)
                                }
                            }

                            // create a serialized string
                            const serializedArray = createSerializedArrayResult(result);
                            socket.write(serializedArray)
                        }
                        else {
                            message = `mget [key...] should be format`
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
                        message = `<command> format wrong. please visit ${redisUrl}`;
                        socket.write(`-${message}\r\n`);
                    }
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
