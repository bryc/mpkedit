chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create("index.htm", {
        bounds: {width: 512, height: 650},
        resizable: false
    });
});
