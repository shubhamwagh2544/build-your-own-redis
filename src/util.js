function checkIfKeyExist(key, object) {
    // let keys = Object.keys(object);
    // keys.forEach(k => {
    //     if (k === key) {
    //         return true;
    //     }
    // })
    // return false;

    // 1
    // return key in object;

    // 2
    return object.hasOwnProperty(key);
}

function deserializer(result) {
    let resultString = '';
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
    const redisIgnoreCommands = ["COMMAND", "INFO", "SERVER", "DOCS"];

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
    let result = '';
    result = '$' + data.length + '\r\n' + data + '\r\n';
    return result;
}

module.exports = {
    checkIfKeyExist,
    deserializer,
    serializer,
    redisRegexPattern,
    checkKeysExists,
    processBulkString
}