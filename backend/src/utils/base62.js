const characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encodeBase62(number) {
    if (number === 0) {
        return "0";
    }

    let result = "";

    while (number > 0) {
        const remainder = number % 62;
        result = characters[remainder] + result;
        number = Math.floor(number / 62);
    }

    return result;
}

function decodeBase62(code) {
    let number = 0;

    for (const char of code) {
        const value = characters.indexOf(char);

        if (value === -1) {
            throw new Error("Invalid Base62 code");
        }

        number = number * 62 + value;
    }

    return number;
}

module.exports = {
    encodeBase62,
    decodeBase62
};