async function getRedactionState() {
    const data = await chrome.storage.local.get("enableRedaction");
    return data.enableRedaction || false;
}

function updateButtonUI(isEnabled) {
    const btn = document.getElementById('scanBtn');
    if (isEnabled) {
        btn.style.backgroundColor = ""; // Reset to your CSS default (e.g., Green/Blue)
        btn.innerText = "Disable Redaction";
    } else {
        btn.style.backgroundColor = "#cccccc"; // Grey when disabled
        btn.innerText = "Enable Redaction";
    }
}

document.getElementById('scanBtn').addEventListener('click', async () => {
    const currentState = await getRedactionState();
    const newState = !currentState;

    await chrome.storage.local.set({ enableRedaction: newState });
    chrome.runtime.sendMessage({ action: "toggleState", enabled: newState });

    updateButtonUI(newState);
});

document.addEventListener('DOMContentLoaded', async () => {
    const isEnabled = await getRedactionState();
    updateButtonUI(isEnabled);
    // Only update UI on popup open — don't trigger a scan
});

chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "updatePopupUI") {
        document.getElementById("result").innerText = "Toxic Comment Count: " + message.toxicCount
    }
});