async function sleep(time = 3000) {
	return timeout(time);
}

function timeout(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
	sleep,
	timeout,
};
