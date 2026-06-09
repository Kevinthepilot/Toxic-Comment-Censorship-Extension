document.getElementById('scanBtn').addEventListener('click', async () => {
    const resultDiv = document.getElementById('result');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    resultDiv.innerText = "Analyzing...";


    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
    }, async (results) => {
        const sentences = new Intl.Segmenter('en', { granularity: 'sentence' })
            .segment(results[0].result);
        const sentenceArray = Array.from(sentences).map(s => s.segment.trim()).filter(s => s.length > 10);

        try {
            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: sentenceArray })
            });


            const resultsData = await response.json();
            const processedData = resultsData.data;

            const toxicCount = resultsData.data.filter(item => item.label == 2).length;
            resultDiv.innerText = `Total Sentences: ${sentenceArray.length}\n` +
                `Toxic/Offensive Detected: ${toxicCount}`;

            // Send this mapping to the page to perform replacements

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (data) => {
                    // Iterate through all text nodes on the page
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                    let node;
                    while (node = walker.nextNode()) {
                        data.forEach(item => {
                            if (item.label == 2 && node.textContent.includes(item.text)) {
                                node.textContent = node.textContent.replace(item.text, "[#####]");
                            }
                        });
                    }
                },
                args: [processedData]

            });

        } catch (e) {
            resultDiv.innerText = "Error: Is the server running?";
        }
    });
});