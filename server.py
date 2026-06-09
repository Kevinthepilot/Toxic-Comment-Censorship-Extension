import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import torch.nn as nn
from typing import List

# --- Model Definition (Keep exactly as you had it) ---
class ToxicClassifier(nn.Module):
    def __init__(self, hidden_size=512):
        super().__init__()
        self.pho_bert = AutoModel.from_pretrained("vinai/phobert-base")
        for param in self.pho_bert.parameters():
            param.requires_grad = False
        self.classifier = nn.Sequential(
            nn.Linear(768, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 256),
            nn.Dropout(0.3),
            nn.Linear(256, 3)
        )

    def forward(self, inp, atn_msk):
        x = self.pho_bert(input_ids=inp, attention_mask=atn_msk)
        return self.classifier(x.last_hidden_state[:, 0, :])

# --- Setup ---
tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class BatchTextRequest(BaseModel):
    words: List[str]

model = ToxicClassifier()
model.load_state_dict(torch.load("vietnamese_toxic_comment_baseline.pth", map_location=torch.device('cpu')))
model.eval()

# --- Endpoint ---
@app.post("/predict")
async def predict(payload: BatchTextRequest):
    texts = payload.words
    all_results = []
    
    # Process in batches of 64
    for i in range(0, len(texts), 64):
        batch = texts[i:i+64]
        inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=128)
        
        with torch.no_grad():
            logits = model(inputs['input_ids'], inputs['attention_mask'])
            preds = torch.argmax(logits, dim=-1).tolist()
            
            # Combine text + prediction for the client
            for text, pred in zip(batch, preds):
                all_results.append({"text": text, "label": pred})
    
    return {"status": "success", "data": all_results}
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)