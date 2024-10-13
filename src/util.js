const net = require('net');
const {get} = require('lodash');
const {version} = require('../package.json');

const port = 8000;
const hostname = '127.0.0.1';
const redisUrl = `https://redis.io/learn/howtos/quick-start/cheat-sheet`;
let totalCommandsProcessed = 0;

const server = net.createServer();
const store = {};

const serverInfo =
    `
    # Server
    redis_version: ${version}
    os: ${process.platform}-${process.arch}
    process_id: ${process.pid}
    uptime_in_seconds: ${process.uptime()}
    tcp_port: ${port}
    `;

const clientsInfo =
    `
    # Clients
    connected_clients: ${get(server, 'connections', 0)}
    blocked_clients: 0
    `;

const memoryInfo =
    `
    # Memory
    used_memory: ${process.memoryUsage().heapUsed}
    used_memory_human: ${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)}M
    used_memory_peak: ${process.memoryUsage().heapTotal}
    used_memory_peak_human: ${(process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)}M
    `;

const statsInfo =
    `
    # Stats
    total_connections_received: ${get(server, 'connections', 0)}
    total_commands_processed: ${totalCommandsProcessed}
    `;

const replicationInfo =
    `
    # Replication
    role: master
    connected_slaves: 0
    `;

const cpuInfo =
    `
    # CPU
    used_cpu_sys: ${process.cpuUsage().system}
    used_cpu_user: ${process.cpuUsage().user}
    `;

const keyspaceInfo =
    `
    # Keyspace
    db0:keys=${'0'},expires=0,avg_ttl=0
    `;

function checkIfKeyExist(key, object) {
    // 1
    // return key in object;

    // 2
    return object.hasOwnProperty(key);
}

function deserializer(result) {
    let resultString;
    let terminator = '\r\n';

    resultString = '*' + result.length + terminator;

    for (let i = 0; i < result.length; i++) {
        let word = result[i];

        if (word === 'nil') {
            resultString += '$-1' + terminator;
        } else {
            word = '$' + word.length + terminator + word + terminator;
            resultString += word;
        }
    }

    return resultString;
}

function serializer(data) {
    const result = [];
    // const redisIgnoreCommands = ["COMMAND", "INFO", "SERVER", "DOCS"];

    if (typeof data !== 'string') {
        return [];
    }
    if (data.startsWith('*')) {
        data = data.trim();
        // data is an array
        data = data.slice(1).split('\r\n').filter((item) => item !== '').slice(1);
        // check array content valid
        if (data.length % 2 !== 0) {
            return 'Error: invalid request';
        }
        for (let i = 0; i < data.length; i += 2) {
            const length = parseInt(data[i].slice(1));
            if (data[i + 1].length !== length) {
                console.log('Error: error at parsing data');
            }
            // result.push(!redisIgnoreCommands.includes(data[i + 1]) ? data[i + 1] : 'nil');
            result.push(data[i + 1]);
        }
    }
    return result;
}

function redisRegexPattern(pattern, store) {
    // Escape special regex characters, except for Redis wildcards: *, ?, [, ]
    pattern = pattern.replace(/([.+^$()|[\]\\])/g, '\\$1');

    pattern = pattern                       // Convert Redis patterns to regex equivalents
        .replace(/\?/g, '.')                // Convert ? to .
        .replace(/\*/g, '.*')               // Convert * to .*
        .replace(/\[([^\]]+)\]/g, '[$1]');  // Leave [ae], [a-b], [^e] intact

    const result = [];

    // Add start (^) and end ($) anchors to match the whole string
    const regex = new RegExp('^' + pattern + '$');
    Object.keys(store).forEach(key => {
        if (regex.test(key)) {
            result.push(key);
        }
    })

    return result;
}

function checkKeysExists(keys, store) {
    const data = {
        result: [],
        count: 0
    };

    for (const key of keys) {
        if (store[key]) {
            data.count++;
            data.result.push(`${store[key]}`)
        } else {
            data.result.push(`nil`)
        }
    }
    return data;
}

function processBulkString(data) {
    // $<length>\r\n<data>\r\n
    data = data.trim();
    let result;
    result = '$' + data.length + '\r\n' + data + '\r\n';
    return result;
}

function deleteMultipleKeys(keys, store) {
    const data = {
        result: [],
        count: 0
    };
    for (const key of keys) {
        if (store[key]) {
            data.count++;
            data.result.push(`${store[key]}`)
            delete store[key];
        }
    }
    return data;
}

function checkIfKeyIsList(key, store) {
    return typeof store[key] === 'object';
}


module.exports = {
    port,
    hostname,
    redisUrl,
    totalCommandsProcessed,
    version,
    store,
    server,
    serverInfo,
    clientsInfo,
    memoryInfo,
    statsInfo,
    replicationInfo,
    cpuInfo,
    keyspaceInfo,
    redisInfo: serverInfo + clientsInfo + memoryInfo + statsInfo + replicationInfo + cpuInfo + keyspaceInfo,
    deserializer,
    serializer,
    redisRegexPattern,
    checkKeysExists,
    processBulkString,
    deleteMultipleKeys,
    checkIfKeyIsList
}