function checkIfKeyExist(key, object) {
    let keys = Object.keys(object);
    keys.forEach(k => {
        if (k === key) {
            return true;
        }
    })
    return false;
}

module.exports = {
    checkIfKeyExist
}