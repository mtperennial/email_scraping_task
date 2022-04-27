async function sleep(time = 3000) {
    return timeout(time);
}

function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFunction(testFunction, timeoutMs) {
    return new Promise((resolve, reject) => {
        const maxTimeoutMs = timeoutMs ? timeoutMs : 10000;
        const startTime = new Date().getTime();
        var conditionMet = false;
        var interval = setInterval(() => {
            const endTime = new Date().getTime();
            if ((endTime - startTime < maxTimeoutMs) && !conditionMet) {
                testFunction(result => {
                    conditionMet = result;
                });
            } else {
                clearInterval(interval);
                if (!conditionMet) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            }
        }, 250);
    });
};

module.exports = {
    sleep,
    timeout,
    waitForFunction,
};

