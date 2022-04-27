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

/**--------------------------------
 * !  API for searching emails
 *-------------------------------**/
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

    // ! if query is empty then search for all unread emails
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
        for (let i = 0; i < unReadEmails; i++) {
            console.log('i: ==>', i);

            await helper.sleep(3000);
            await Runtime.evaluate({
                expression: `
                var unReadEmail = document.getElementsByClassName("zE");
                console.log('unReadEmail:', unReadEmail, 'unReadEmail.length:', unReadEmail.length)
                unReadEmail[0].click();
                console.warn("clicked", ${i});
            `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error while opening email' });
            });

            await helper.sleep(8000);
            await Runtime.evaluate({
                expression: `
                ${helper.getEmailContent(email)}
            `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error in scrap the email' });
            });

            await helper.sleep(3000);
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
            var inputElem = document.getElementsByClassName("gb_ef")[1];
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
            var searchBtn = document.getElementsByClassName("gb_nf")[0]
            searchBtn.click();
        `,
        }).catch((err) => {
            CDP.Close({ id: tabId, port: port });
            return res.status(400).json({ status_cd: 'error', message: err.message });
        });

        let tableRows;
        // ! if sender email is present then search for all emails for the particular sender
        if (query.includes(".com", "@")) {
            await helper.sleep();
            await Runtime.evaluate({
                expression: `
                console.warn('sender is available');
                sessionStorage.setItem("queryBasedSearch", 0);
                sessionStorage.setItem("response", JSON.stringify([]));
                var tablesLength = document.getElementsByTagName("table").length
                document.getElementsByTagName("table")[tablesLength - 2].rows.length;
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
        }
        // ! if sender email is not present then search for all emails by query
        else {
            await helper.sleep();
            await Runtime.evaluate({
                expression: `
                console.warn('query is available');
                sessionStorage.setItem("queryBasedSearch", 1);
                sessionStorage.setItem("response", JSON.stringify([]));
                var tablesLength = document.getElementsByTagName("table").length
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
        }

        let skipHistoryBack = 0;
        for (let i = 0; i < tableRows; i++) {
            let isBack;
            await helper.sleep(3000);
            await Runtime.evaluate({
                expression: `
                console.log("next time", ${i})
                var table = document.querySelectorAll("table")
                
                var queryBasedSearch = sessionStorage.getItem("queryBasedSearch");
                var tableRows;
                if(queryBasedSearch == 1){
                    console.warn("queryBasedSearch == 1");
                    tableRows = document.querySelectorAll("table")[table.length - 1];
                }
                else{
                    console.warn("queryBasedSearch == 0");
                    tableRows = document.querySelectorAll("table")[table.length - 2];
                }
	            console.log('tableRows:', tableRows)
                if(tableRows.rows['${i}'].classList.contains("zE")){   // ! class zE to check for email is unread then open it
                    tableRows.rows['${i}'].click()
                    sessionStorage.setItem("isBack", 1);  // ! if email is open then need to back to previous page
                }
	        `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });

            await helper.sleep(8000);
            await Runtime.evaluate({
                expression: `
	            ${helper.getEmailContent(email)}
	        `,
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });

            await helper.sleep(2000)
            await Runtime.evaluate({
                expression: `
                    sessionStorage.getItem("isBack");
                    `,
            }).then(res => {
                isBack = res.result.value;
            }).catch((err) => {
                CDP.Close({ id: tabId, port: port });
                return res.status(400).json({ status_cd: 'error', message: err.message });
            });
            if (isBack == 1) {
                await helper.sleep(3000);
                await Runtime.evaluate({
                    expression: `
                    sessionStorage.setItem("isBack", 0);
                    history.back();
                    console.log('history.back()', ${i})
                    `,
                }).catch((err) => {
                    CDP.Close({ id: tabId, port: port });
                    return res.status(400).json({ status_cd: 'error', message: err.message });
                });
            }
            else {
                skipHistoryBack++;
            }
        }
        console.log('skipHistoryBack:', skipHistoryBack)
    }

    await helper.sleep(3000);
    await Runtime.evaluate({
        expression: `sessionStorage.getItem("response")`,
    })
        .then((resp) => {
            let response = JSON.parse(resp.result.value);
            console.log(response);
            return res.status(200).json({ status: 'success', emailsCount: response.length, data: response });
        })
        .catch((err) => {
            console.log(err);
            return res.status(400).json({ status_cd: 'error', message: err.message, msg: 'error in sending response' });
        });
};

module.exports = { loginEmail, searchEmail };
