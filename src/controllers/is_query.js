if (isQuery) {
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
		})
		.catch((err) => {
			CDP.Close({ id: tabId, port: port });
			return res.status(400).json({ status_cd: 'error', message: err.message });
		});

	await helper.sleep(10000);
	await Runtime.evaluate({
		expression: `
                console.log("next time")
                let table = document.getElementsByTagName("table")
                console.log('table:', table)
	            let tableRows = document.getElementsByTagName("table")[table.length - 1];
	            console.log('tableRows:', tableRows)
	            tableRows.rows[${i}].click()
                
	    `,
	}).catch((err) => {
		CDP.Close({ id: tabId, port: port });
		return res.status(400).json({ status_cd: 'error', message: err.message });
	});

	await helper.sleep();
	await Runtime.evaluate({
		expression: `
	            let emailData = {};
	            let div = document.getElementsByClassName("gmail_default")[0];
	            // console.warn("div: ==>", div)
	            emailData.id = Date.now();
	            emailData.message = div.textContent;
	            // console.log('emailData:', emailData)
	            let response = JSON.parse(sessionStorage.getItem("response"));
	            response.push(emailData);
	            sessionStorage.setItem("response", JSON.stringify(response));
                // history.back();
	    `,
	}).catch((err) => {
		CDP.Close({ id: tabId, port: port });
		return res.status(400).json({ status_cd: 'error', message: err.message });
	});

	await helper.sleep();
	await Runtime.evaluate({
		expression: `
            history.back();
            console.log('back', ${i})
		    // let searchBtn = document.getElementsByClassName("gb_nf")[0]
		    // console.log('searchBtn:002', searchBtn)
		    // searchBtn.click();
		`,
	}).catch((err) => {
		CDP.Close({ id: tabId, port: port });
		return res.status(400).json({ status_cd: 'error', message: err.message });
	});
}
