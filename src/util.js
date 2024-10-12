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

module.exports = {
    checkIfKeyExist,
    deserializer,
    serializer
}