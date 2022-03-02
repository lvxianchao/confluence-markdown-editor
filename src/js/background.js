chrome.runtime.onInstalled.addListener((reason) => {
    if (reason.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: 'pages/options.html'
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
        return;
    }

    switch (request.event) {
        case "getCookie":
            chrome.cookies.get({url: request.url, name: "JSESSIONID"}, cookie => {
                sendResponse({cookie});
            });
            break;
        default:
            return;
    }

    return true;
});