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

function createSerializedArrayResult(result) {
    // *2\r\n$5\r\nhello\r\n$5\r\nworld\r\n
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

module.exports = {
    checkIfKeyExist,
    createSerializedArrayResult
}