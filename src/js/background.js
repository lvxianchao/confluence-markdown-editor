chrome.runtime.onInstalled.addListener((reason) => {
    if (reason.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: 'pages/options.html'
        });
    }
});