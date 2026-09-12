const A = 37;
const B = 12345;
const M = 1000000007;

// Modular inverse of A modulo M
const A_INVERSE = 621621626;

function obfuscate(id) {
    return (A * id + B) % M;
}

function deobfuscate(value) {
    return (A_INVERSE * (value - B + M)) % M;
}

module.exports = {
    obfuscate,
    deobfuscate
};