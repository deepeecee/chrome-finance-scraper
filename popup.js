let scrape = document.getElementById("scrape");

// When the button is clicked, inject scrapeData into current page
scrape.addEventListener("click", async() => {
    // TODO: Write code such that this isn't duplicated here and in scrapeData().
    const regexDomainsToXPaths = {
        // Finbox: https://finbox.com/<TICKER>/models/ps-multiples
        "^.*(finbox+)\..*?$": {
            "analysis": "/html/body/div[1]/div/div[4]/div[3]/div/div/div[1]/h5",
            "fairValue": "/html/body/div[1]/div/div[4]/div[3]/div/div/div[2]/div[2]/div[2]/div[1]"
        },
        // GuruFocus: https://www.gurufocus.com/term/gf_value/<TICKER>
        "^.*(gurufocus+)\..*?$": {
            "analysis": "/html/body/div[2]/div[2]/div/div/div/div[2]/h1",
            "fairValue": "/html/body/div[2]/div[2]/div/div/div/div[2]/font[1]"
        }
    };
    let tabs = await chrome.tabs.query({ currentWindow: true });
    console.log(tabs);

    let results = await Promise.all(tabs.filter(function(tab) {
        for (const [domainRegex, xPaths] of Object.entries(regexDomainsToXPaths)) {
            const currDomainRegex = new RegExp(domainRegex);
            if (currDomainRegex.test(tab.url)) {
                return true;
            }
        }
        return false;
    }).map(tab => {
        return chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: scrapeData,
        });
    })).then((values) => {
        let dataToStore = [];
        values.forEach(value => {
            const valueResult = value[0]['result'];
            if (valueResult !== null) {
                dataToStore.push(valueResult);
            }
        });
        const headers = dataToStore.map(x => x['analysis']).join(',');
        const estimatedFairValues = dataToStore.map(x => x['value']).join(',');
        alert(headers + '\n' + estimatedFairValues);
    });
});

// The body of this function will be execuetd as a content script inside the
// current page
function scrapeData() {
    // Make this generally available to all scripts rather than passing this to each tab.
    const regexDomainsToXPaths = {
        // Finbox: https://finbox.com/<TICKER>/models/ps-multiples
        "^.*(finbox+)\..*?$": {
            "analysis": "/html/body/div[1]/div/div[4]/div[3]/div/div/div[1]/h5",
            "fairValue": "/html/body/div[1]/div/div[4]/div[3]/div/div/div[2]/div[2]/div[2]/div[1]"
        },
        // GuruFocus: https://www.gurufocus.com/term/gf_value/<TICKER>
        "^.*(gurufocus+)\..*?$": {
            "analysis": "/html/body/div[2]/div[2]/div/div/div/div[2]/h1",
            "fairValue": "/html/body/div[2]/div[2]/div/div/div/div[2]/font[1]"
        }
    };

    for (const [domainRegex, xPaths] of Object.entries(regexDomainsToXPaths)) {
        const currTabUrl = window.location.href;
        // Skip non-matching domains.
        const currDomainRegex = new RegExp(domainRegex);

        // If we don't have a match for the domain regex, we should skip.
        if (!currDomainRegex.test(currTabUrl)) {
            continue;
        }

        // document.evaluate returns an iterator in case there are multiple results.
        const analysisTitleIterator = document.evaluate(xPaths['analysis'], document);
        const fairValueIterator = document.evaluate(xPaths['fairValue'], document);
        try {
            const analysis = analysisTitleIterator.iterateNext().innerText;
            const fairValue = fairValueIterator.iterateNext().innerText.match(/\D*(\$?[\d,]+\.?\d{2}?)/)[0];
            console.log(analysis, fairValue);
            return {
                "analysis": analysis.replace('/', '').trim().replace('  ', ' '),
                "value": fairValue.replace(/[^0-9.]/g, '').trim(),
            };
        } catch (e) {
            console.log('Could not store element. Either it was not found or something went wrong with storage.', e);
        }
    }
}