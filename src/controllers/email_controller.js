const CDP = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const appRoot = require('app-root-path');
const config = require(appRoot + '/config.json');
const helper = require('../utils/helper');
const fs = require('fs');

/* NOTE:
    1. default time of sleep is 3000ms
*/

const loginEmail = async (req, res) => {
    const { email, password } = req.body;

    const chrome = await chromeLauncher.launch({
        chromeFlags: [
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--disable-popup-blocking',
            '--ignore-certificate-errors',
            '--enable-features=NetworkService',
            '--window-size=1600,1250',
        ],
    });

    //checking if download path exist, if not then create one
    if (!fs.existsSync(config.emailsDownloadPath + '/' + email + '/')) {
        fs.mkdirSync(config.emailsDownloadPath + '/' + email + '/', { recursive: true });
    }

    let chromePort = chrome.port;
    console.log('http://localhost:' + chromePort);

    const tab = await CDP.New({
        port: chromePort,
    }).catch((err) => {
        console.log(err);
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    const { Page, DOM, Runtime, Network } = await CDP({
        target: tab.id,
        port: chromePort,
    });
    await Promise.all([
        Network.enable(),
        Page.enable(),
        Page.navigate({ url: config.login_url }),
        Page.loadEventFired(),
        DOM.enable(),
    ]).catch((err) => {
        console.log(err);
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    await helper.sleep(2000);
    await Runtime.evaluate({
        expression: `
            let changeEvent = new Event('change');
            let email = document.getElementById('Email');
            email.value = '${email}';
            email.dispatchEvent(changeEvent);
        `,
    }).catch((err) => {
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    await helper.sleep();
    await Runtime.evaluate({
        expression: `
            let nextBtn = document.getElementById('next');
            nextBtn.click();
        `,
    }).catch((err) => {
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    await helper.sleep();
    await Runtime.evaluate({
        expression: `
            let changeEvent = new Event('change');
            let password = document.getElementById('password');
            password.value = '${password}';
            password.dispatchEvent(changeEvent);
        `,
    }).catch((err) => {
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    await helper.sleep();
    await Runtime.evaluate({
        expression: `
            let checkbox = document.getElementById('trustDevice');
            checkbox.click();
        `,
    }).catch((err) => {
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    await helper.sleep();
    await Runtime.evaluate({
        expression: `
            let submitBtn = document.getElementById('submit');
            submitBtn.click();
        `,
    }).catch((err) => {
        CDP.Close({ id: tab.id, port: chromePort });
        return res.status(400).json({ status_cd: 'error', message: err.message });
    });

    return res.status(200).json({ tabId: tab.id, port: chromePort, pid: chrome.pid });
};

// API for searching email
const searchEmail = async (req, res) => {
    const { email, tabId, port, pid, query } = req.body;

    const { Runtime, Page, DOM } = await CDP({
        target: tabId,
        port: port,
    });
    await Runtime.enable();
    await Page.enable();
    await DOM.enable();

    await Page.setDownloadBehavior({
        behavior: 'allow',
        downloadPath: config.emailsDownloadPath + '/' + email + '/',
    });

    // ! if query is empty then search for all emails
    if (query === undefined || query === '') {
        console.log("query is undefined");
        let unReadEmails;
        await Runtime.evaluate({
            expression: `
	        sessionStorage.setItem("response", JSON.stringify([]));
	        document.getElementsByClassName("zE").length;
	    `,
        })
            .then((res) => {
                unReadEmails = res.result.value;
            })
            .catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error while targeting the email container' });
            });

        await helper.sleep(2000);
        for (let i = 0; i < 3; i++) {
            console.log('i: ==>', i);

            await helper.sleep(6000);
            await Runtime.evaluate({
                expression: `
                let unReadEmail = document.getElementsByClassName("zE");
                console.log('unReadEmail:', unReadEmail, 'unReadEmail.length:', unReadEmail.length)
                unReadEmail[0].click();
                console.warn("clicked", ${i});
	    `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error while opening email' });
            });

            // await helper.sleep(8000);
            // await Runtime.evaluate({
            //     expression: `
            //     console.warn("=========================== working ============================")
            //     let response = JSON.parse(sessionStorage.getItem("response"));
            //     let emailData = {};
            //     let div = document.getElementsByClassName("gmail_default")[0];

            //     emailData.id = Date.now();
            //     if(div == null || div == undefined) {
            //         let tbl = document.querySelectorAll("table")[10].querySelector("tr");
            //         emailData.message = tbl.innerText
            //     }
            //     else{
            //         emailData.message = div.textContent;
            //     }
            //     emailData.attachments = [];

            //     let attachmentsDiv = document.getElementsByClassName("aSH");
            //     let file = document.getElementsByClassName("N5jrZb")
            //     console.warn('attachmentsDiv:===>>>>', attachmentsDiv)

            //     if(attachmentsDiv.length > 0) {

            //         let attachmentsArr = []

            //         for (let i = 0; i < attachmentsDiv.length; i++) {
            //             let fileObj = {};
            //             let attachment = attachmentsDiv[i].querySelector("span")
            //             // file[i].classList.add("aZp")
            //             fileObj.name = attachment.textContent;
            //             fileObj.url = '${config.emailsDownloadPath}'+'${email}/'+attachment.textContent;
            //             // console.warn('fileObj:', fileObj)
            //             emailData.attachments.push(fileObj);
            //             attachmentsArr.push(file[i].querySelector("a"));

            //         }
            //         console.warn('attachmentsArr:0000000 ======>>>>>>', attachmentsArr)
            //         if (attachmentsArr.length > 0) {
            //             var interval = setInterval(download, 1000, attachmentsArr);
            //             function download(attachmentsArray) {
            //                 console.warn('attachmentsArray:11111111=======>>>>>>', attachmentsArray)
            //                 var url = attachmentsArray.pop();
            //                 var a = document.createElement('a');
            //                 a.setAttribute('href', 'url');
            //                 a.setAttribute('download', '');
            //                 a.setAttribute('target', '_blank');
            //                 a.append(url);
            //                 a.querySelector('a').click();
            //                 if (attachmentsArray.length == 0) {
            //                     clearInterval(interval);
            //                 }
            //                 a.removeChild(url);
            //                 a.remove();
            //             }
            //         }
            //     }
            //     response.push(emailData);
            //     sessionStorage.setItem("response", JSON.stringify(response));

            // `,
            // }).catch((err) => {
            //     CDP.Close({ id: tabId, port: port });
            //     return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error in scrap the email' });
            // });

            await helper.sleep(5000);
            await Runtime.evaluate({
                expression: `
                history.back();
                console.warn("history.back() ===>>>>>", ${i})
        `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error in history.back()' });
            });
        }
    }
    // ! if query is not undefined
    else {
        console.log('query:', query);
        await Runtime.evaluate({
            expression: `
            const changeEvent = new Event('change');
            let inputElem = document.getElementsByClassName("gb_ef")[1];
            console.warn('query is not empty');
            inputElem.value = '${query}';
            inputElem.dispatchEvent(changeEvent);
        `,
        }).catch((err) => {
            CDP.Close({ id: tabId, port: port });
            return res.status(400).json({ status_cd: 'error', message: err.message });
        });

        await helper.sleep(2000);
        await Runtime.evaluate({
            expression: `
            let searchBtn = document.getElementsByClassName("gb_nf")[0]
            searchBtn.click();
        `,
        }).catch((err) => {
            CDP.Close({ id: tabId, port: port });
            return res.status(400).json({ status_cd: 'error', message: err.message });
        });

        await helper.sleep(2000);
        await Runtime.evaluate({
            expression: `
            let searchBtn = document.getElementsByClassName("gb_nf")[0]
            searchBtn.click();
        `,
        }).catch((err) => {
            CDP.Close({ id: tabId, port: port });
            return res.status(400).json({ status_cd: 'error', message: err.message });
        });

        await helper.sleep();
        await Runtime.evaluate({
            expression: `
	        sessionStorage.setItem("response", JSON.stringify([]));
	        let tablesLength = document.getElementsByTagName("table").length
	        document.getElementsByTagName("table")[tablesLength - 1].rows.length;
	    `,
        })
            .then((res) => {
                tableRows = res.result.value;
                console.log('tableRows:', tableRows)
            })
            .catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });

        for (let i = 0; i < 3; i++) {
            await helper.sleep(10000);
            await Runtime.evaluate({
                expression: `
                console.log("next time", ${i})
                let table = document.getElementsByTagName("table")
                console.log('table:', table)
	            let tableRows = document.getElementsByTagName("table")[table.length - 1];
	            console.log('tableRows:', tableRows)
                let res = JSON.parse(sessionStorage.getItem("response"));
                console.log('res length =====>>>>>>', res.length)
                if(tableRows.rows['${i}'].classList.contains("zE")){   // ! class zE to check for email is unread then open it
                    tableRows.rows['${i}'].click()
                }

	    `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });

            await helper.sleep();
            await Runtime.evaluate({
                expression: `
	            console.warn("=========================== working ============================")
                let response = JSON.parse(sessionStorage.getItem("response"));
                let emailData = {};
                let div = document.getElementsByClassName("gmail_default")[0];

                emailData.id = Date.now();
                if(div == null || div == undefined) {
                    let tbl = document.querySelectorAll("table")[10].querySelector("tr");
                    emailData.message = tbl.innerText
                }
                else{
                    emailData.message = div.textContent;
                }
                emailData.attachments = [];

                let attachmentsDiv = document.getElementsByClassName("aSH");
                let file = document.getElementsByClassName("N5jrZb")
                console.warn('attachmentsDiv:===>>>>', attachmentsDiv)

                if(attachmentsDiv.length > 0) {

                    let attachmentsArr = []

                    for (let i = 0; i < attachmentsDiv.length; i++) {
                        let fileObj = {};
                        let attachment = attachmentsDiv[i].querySelector("span")
                        // file[i].classList.add("aZp")
                        fileObj.name = attachment.textContent;
                        fileObj.url = '${config.emailsDownloadPath}'+'${email}/'+attachment.textContent;
                        // console.warn('fileObj:', fileObj)
                        emailData.attachments.push(fileObj);
                        attachmentsArr.push(file[i].querySelector("a"));

                    }
                    console.warn('attachmentsArr:0000000 ======>>>>>>', attachmentsArr)
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
	            response.push(emailData);
	            sessionStorage.setItem("response", JSON.stringify(response));
	    `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });

            await helper.sleep(5000);
            await Runtime.evaluate({
                expression: `
                history.back();
                console.log('back', ${i})
		`,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });
        }
    }

    await helper.sleep(3000);
    await Runtime.evaluate({
        expression: `sessionStorage.getItem("response")`,
    })
        .then((resp) => {
            let response = JSON.parse(resp.result.value);
            console.log(response);
            return res.status(200).json({ status: 'success', response });
        })
        .catch((err) => {
            console.log(err);
            return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error in sending response' });
        });
};

module.exports = { loginEmail, searchEmail };
