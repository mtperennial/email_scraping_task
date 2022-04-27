const appRoot = require('app-root-path');
const config = require(appRoot + '/config.json');

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

function getEmailContent(email) {
    return `
        console.warn("========= working inside helper function ===========")
        var response = JSON.parse(sessionStorage.getItem("response"));
        var emailData = {};
        var div = document.getElementsByClassName("gmail_default")[0];

        emailData.id = Date.now();
        if(div == null || div == undefined) {
            var tbl = document.querySelectorAll("table")[10].querySelector("tr");
            emailData.message = tbl.innerText
        }
        else{
            emailData.message = div.textContent;
        }
        emailData.attachmentsCount = 0;
        emailData.attachments = [];

        var attachmentsDiv = document.getElementsByClassName("aSH");
        var file = document.getElementsByClassName("N5jrZb")
        console.warn('attachmentsDiv:===>>>>', attachmentsDiv)

        if(attachmentsDiv.length > 0) {
            var attachmentsArr = []
            for (var i = 0; i < attachmentsDiv.length; i++) {
                var fileObj = {};
                var attachment = attachmentsDiv[i].querySelector("span")
                // file[i].classList.add("aZp")
                fileObj.name = attachment.textContent;
                fileObj.url = '${config.emailsDownloadPath}'+'${email}/'+attachment.textContent;
                // console.warn('fileObj:', fileObj)
                emailData.attachments.push(fileObj);
                attachmentsArr.push(file[i].querySelector("a"));
            }

            if (attachmentsArr.length > 0) {
                var interval = setInterval(download, 1000, attachmentsArr);
                function download(attachmentsArray) {
                    console.warn('attachmentsArray:11111111=======>>>>>>', attachmentsArray)
                    var url = attachmentsArray.pop();
                    var a = document.createElement('a');
                    a.setAttribute('href', 'url');
                    a.setAttribute('download', '');
                    a.setAttribute('target', '_blank');
                    a.append(url);
                    a.querySelector('a').click();
                    if (attachmentsArray.length == 0) {
                        clearInterval(interval);
                    }
                    a.removeChild(url);
                    a.remove();
                }
            }
        }
        emailData.attachmentsCount = emailData.attachments.length;  // ! to check how many attachments are there
        response.push(emailData);
        sessionStorage.setItem("response", JSON.stringify(response));
    `
}

module.exports = {
    sleep,
    timeout,
    waitForFunction,
    getEmailContent,
};

