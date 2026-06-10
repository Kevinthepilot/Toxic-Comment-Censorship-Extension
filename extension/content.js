function redactTextNodes(processedData) {
    // Create a TreeWalker to efficiently find all raw text nodes in the DOM
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while (node = walker.nextNode()) {
        processedData.forEach(item => {
            if (item.label === 2 && node.textContent.includes(item.text)) {

                observer.disconnect();
                node.textContent = node.textContent.replace(item.text, "[#####]");
                enableObserver()

            }
        });
    }
}

//Watch for content changes
const observer = new MutationObserver(() => {
    chrome.storage.local.get("enableRedaction", (data) => {
        if (data.enableRedaction) {
            chrome.runtime.sendMessage({ action: "toggleState", enabled: true });
        }
    });
});

function enableObserver() {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// --- Event Listeners ---

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "applyRedactions" && message.data) {
        console.log(message.data)
        redactTextNodes(message.data);
    }
});

chrome.storage.local.get("enableRedaction", (data) => {
    if (data.enableRedaction) {
        chrome.runtime.sendMessage({ action: "toggleState", enabled: true });
        enableObserver()
    }
});