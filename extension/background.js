chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "toggleState" && message.enabled) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) triggerPageScan(tab.id);
    }
});

async function triggerPageScan(tabId) {
    const isEnabled = await chrome.storage.local.get("enableRedaction");
    if (!isEnabled.enableRedaction) return;

    try {
        // 1. Ask the active tab for its current visible text
        const [{ result: pageText }] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.body.innerText
        });

        const sentences = Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(pageText))
            .map(s => s.segment.trim())
            .filter(s => s.length > 10);

        if (sentences.length === 0) return;

        // 2. Query local AI server
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: sentences })
        });

        const resultsData = await response.json();
        const toxicCount = resultsData.data.filter(item => item.label === 2).length;

        // Re-check if redaction is still enabled (user may have disabled during fetch)
        const recheck = await chrome.storage.local.get("enableRedaction");
        if (!recheck.enableRedaction) return;

        //console.log(resultsData.data.filter(item => item.label === 2))
        try {
            await chrome.tabs.sendMessage(tabId, { action: "applyRedactions", data: resultsData.data });
        }
        catch (e) {
            console.warn("Content script error:", e);
        }
        await chrome.runtime.sendMessage({ action: "updatePopupUI", toxicCount: toxicCount });

    } catch (e) {
        console.error("Background scanner error:", e);
    }
}