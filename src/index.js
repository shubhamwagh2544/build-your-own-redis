const net = require('net');
const {
    deserializer,
    serializer,
    redisRegexPattern,
    checkKeysExists,
    processBulkString, deleteMultipleKeys
} = require("./util");
const {version} = require('../package.json');

const server = net.createServer();
const port = 8000;
const hostname = '127.0.0.1';
const redisUrl = `https://redis.io/learn/howtos/quick-start/cheat-sheet`;
let totalCommandsProcessed = 0;

const store = {};
console.log(version);

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
                // BASIC
                case 'ping': {
                    if (reply.length === 1) {
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

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
                        if (!store[key]) {
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
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

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
                        totalCommandsProcessed += 1;

                        const keys = reply.slice(1);
                        const count = checkKeysExists(keys, store).count;
                        socket.write(`:${count}\r\n`)
                    } else {
                        message = `exists [key...] should be format`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                // CUSTOM
                case 'store': {
                    // print all keys and values present in store
                    for (const key in store) {
                        console.log(key, ' ', store[key])
                    }
                    socket.write(`+OK\r\n`);
                }
                    break;

                // INFO
                /*case 'info': {
                    if (reply.length > 1) {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                    totalCommandsProcessed += 1;

                    let serverInfo =
                        `
                        # Server
                        redis_version: ${version}
                        os: ${process.platform}-${process.arch}
                        process_id: ${process.pid}
                        uptime_in_seconds: ${process.uptime()}
                        tcp_port: ${port}

                        # Clients
                        connected_clients: ${server.connections}
                        blocked_clients: 0

                        # Memory
                        used_memory: ${process.memoryUsage().heapUsed}
                        used_memory_human: ${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)}M
                        used_memory_peak: ${process.memoryUsage().heapTotal}
                        used_memory_peak_human: ${(process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)}M

                        # Stats
                        total_connections_received: ${server.connections}
                        total_commands_processed: ${totalCommandsProcessed}

                        # Replication
                        role: master
                        connected_slaves: 0

                        # CPU
                        used_cpu_sys: ${process.cpuUsage().system}
                        used_cpu_user: ${process.cpuUsage().user}
                    `;
                    //serverInfo = processBulkString(serverInfo);
                    socket.write(`$${serverInfo.length}\r\n${serverInfo}\r\n`);
                }
                    break;*/

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

server.listen(
    port,
    hostname,
    () => console.log(`custom redis server started on ${hostname}:${port}`)
);
