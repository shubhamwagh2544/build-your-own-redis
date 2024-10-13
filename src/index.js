let {
    deserializer,
    serializer,
    redisRegexPattern,
    checkKeysExists,
    processBulkString, deleteMultipleKeys, redisInfo, serverInfo, clientsInfo, memoryInfo, statsInfo, replicationInfo,
    cpuInfo, keyspaceInfo, port, hostname, redisUrl, totalCommandsProcessed, store, server, checkIfKeyIsList
} = require("./util");
const {isNil} = require("lodash");


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

                        if (checkIfKeyIsList(key, store)) {
                            message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                            socket.write(`-${message}\r\n`);
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

                        if (checkIfKeyIsList(key, store)) {
                            message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                            socket.write(`-${message}\r\n`);
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

                // LISTS
                case 'lpush': {
                    if (reply.length >= 3) {
                        const key = reply[1];

                        // check if key exists
                        if (store[key]) {
                            if (!checkIfKeyIsList(key, store)) {
                                message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                                socket.write(`-${message}\r\n`);
                                return;
                            }
                        } else {
                            store[key] = [];
                        }

                        totalCommandsProcessed += 1;

                        const values = reply.slice(2);
                        store[key].unshift(...values);

                        socket.write(`:${store[key].length}\r\n`);
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'rpush': {
                    if (reply.length >= 3) {
                        const key = reply[1];

                        // check if key exists
                        if (store[key]) {
                            if (!checkIfKeyIsList(key, store)) {
                                message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                                socket.write(`-${message}\r\n`);
                                return;
                            }
                        } else {
                            store[key] = [];
                        }

                        totalCommandsProcessed += 1;

                        const values = reply.slice(2);
                        store[key].push(...values);

                        socket.write(`:${store[key].length}\r\n`);
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'lrange': {

                }
                    break;

                case 'llen': {
                    if (reply.length === 2) {
                        const key = reply[1];

                        if (!store[key]) {
                            socket.write(`:0\r\n`);
                            return;
                        } else {
                            if (!checkIfKeyIsList(key, store)) {
                                message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                                socket.write(`-${message}\r\n`);
                                return;
                            }

                            totalCommandsProcessed += 1;

                            const length = store[key].length;
                            socket.write(`:${length}\r\n`);
                        }
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'lpop': {
                    if (reply.length === 2 || reply.length === 3) {
                        const key = reply[1];
                        let count = isNil(reply[2]) ? 1 : reply[2];

                        if (!store[key]) {
                            socket.write(`$-1\r\n`);
                            return;
                        } else {
                            if (!checkIfKeyIsList(key, store)) {
                                message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                                socket.write(`-${message}\r\n`);
                                return;
                            }

                            totalCommandsProcessed += 1;

                            // delete multiple elements
                            if (count > store[key].length) {
                                count = store[key].length;
                            }
                            let values = store[key].splice(0, count);
                            values = deserializer(values);
                            socket.write(values);
                        }
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
                }
                    break;

                case 'rpop': {
                    if (reply.length === 2 || reply.length === 3) {
                        const key = reply[1];
                        let count = isNil(reply[2]) ? 1 : reply[2];

                        if (!store[key]) {
                            socket.write(`$-1\r\n`);
                            return;
                        } else {
                            if (!checkIfKeyIsList(key, store)) {
                                message = 'WRONGTYPE Operation against a key holding the wrong kind of value';
                                socket.write(`-${message}\r\n`);
                                return;
                            }

                            totalCommandsProcessed += 1;

                            // delete multiple elements
                            if (count > store[key].length) {
                                count = store[key].length;
                            }
                            let values = store[key].splice(-count, count);
                            values = deserializer(values);
                            socket.write(values);
                        }
                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
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

                case 'expire': {

                }
                    break;

                case 'ttl': {

                }
                    break;

                case 'persist': {

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
                case 'info': {
                    if (reply.length === 1) {
                        totalCommandsProcessed += 1;
                        const result = processBulkString(redisInfo);
                        socket.write(result);
                    } else if (reply.length === 2) {
                        const section = reply[1];

                        switch (section) {
                            case 'server': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(serverInfo);
                                socket.write(result);
                            }
                                break;
                            case 'clients': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(clientsInfo);
                                socket.write(result);
                            }
                                break;
                            case 'memory': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(memoryInfo);
                                socket.write(result);
                            }
                                break;
                            case 'stats': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(statsInfo);
                                socket.write(result);
                            }
                                break;
                            case 'replication': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(replicationInfo);
                                socket.write(result);
                            }
                                break;
                            case 'cpu': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(cpuInfo);
                                socket.write(result);
                            }
                                break;
                            case 'keyspace': {
                                totalCommandsProcessed += 1;
                                const result = processBulkString(keyspaceInfo);
                                socket.write(result);
                            }
                                break;
                            default: {
                                message = `ERR syntax error`
                                socket.write(`-${message}\r\n`);
                            }
                        }

                    } else {
                        message = `ERR wrong number of arguments for ${command} command`
                        socket.write(`-${message}\r\n`);
                    }
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

server.listen(
    port,
    hostname,
    () => console.log(`custom redis server started on ${hostname}:${port}`)
);