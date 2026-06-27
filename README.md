

# 🛡️ Vietnamese Toxic Comment Censorship Extension

A  extension and local AI backend designed to create a safer browsing experience, especially for children. By utilizing a custom machine learning model trained for text classification, this tool evaluates web text in real-time and automatically censors harmful, toxic, or offensive comments before you read them. 

The project pairs a lightweight JavaScript frontend extension with a local Python inference server to process text efficiently without relying on external APIs.

## 📋 Table of Contents
- [Program Architecture](#architecture)
- [Program Architecture](#dataset)
- [Model Details & Performance](#model-details--performance)
- [Installation & Setup](#installation--setup)
  - [Backend Server Setup](#backend-server-setup)
  - [Extension Installation](#extension-installation)


## Program Architecture

```mermaid
---
config:
  layout: fixed
---
flowchart TB
 subgraph Extension["Extension"]
        CS_Scan["Content Script: Scans Text"]
        BG_Req["Background Script: Routes Request"]
        CS_Apply["Content Script: Applies CSS Filter"]
  end
 subgraph subGraph1["User Browser"]
        DOM["Webpage DOM"]
        Extension
        Action["Action: Blur, Redact, or Hide Element"]
  end
 subgraph subGraph2["Local Python Backend"]
        API["server.py API Endpoint"]
        Token["Text Tokenizer"]
        Model["Multi-Label AI Model"]
  end
    DOM -- "1. New comments load" --> CS_Scan
    CS_Scan -- "2. Extracts text" --> BG_Req
    BG_Req -- "3. HTTP POST Payload" --> API
    API -- "4. Processes string" --> Token
    Token -- "5. Feeds tensors" --> Model
    Model -- "6. Returns classification results" --> API
    API -- "7. JSON Response" --> CS_Apply
    CS_Apply -- "8. Modifies DOM" --> Action
    Action -- "9. Safe Content Displayed" --> DOM
```

## Dataset

To ensure the extension accurately understands the nuances of Vietnamese internet slang, context, and toxicity, the model was trained using the **ViHSD (Vietnamese Hate Speech Detection)** dataset. 

### Dataset Overview
Developed by the UIT Natural Language Processing Group, ViHSD is a large-scale, human-annotated corpus specifically designed for detecting harmful content on Vietnamese social media. 
* **Data Source:** Over 30,000 comments collected from real-world, highly active social platforms like Facebook and YouTube.
* **Categorization:** The dataset categorizes text into three core labels: `CLEAN`, `OFFENSIVE`, and `HATE`.

As is common with organic social media data, the ViHSD dataset is highly imbalanced—the vast majority of comments are `CLEAN`, while genuine `HATE` represents a smaller minority class. Training a multi-label classifier directly on imbalanced distributions often leads to poor minority class detection. To overcome this, the current training pipeline utilizes undersampling of the `CLEAN` class to achieve class balance. 

![](https://www.kaggleusercontent.com/kf/328689048/eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..c54IjXxOEJsBjVWu1jfU-g.vBGOP2XjHa1KDHfHSIgsJ51xhJdr3zHRB02esDBhGN9ayXtjP22c2e7BphNTnLXUgTmL1wpOG-KdRT_Hz7ykWo4T7of96FZNRfBHIg_RYK6AVkH1v8sfy8CCATJdndVadVmrSzYOd0r3YFp96tjFDtnn0izSJkPwGFDfp4ZyhAgslIGHlnguUHqba7mJA4t1BJJvljcnQL6uRK_ZPSqkdY65a3W2s4LnURqkzWW_VZ0UA0ElcWy7Tklqj_u1p39UECSSERP1COoHwuLAiQzyWHxf11Tsr9UWIsSauQjaqBw7srJGBH5Xa8IWzfL2lW_I1QZ6MlYhNPZ3JuG_1VCTKNSiqckjPKB4B-pilxKms4pgPbtM-mHH5GfKqAj6EMUULzd-BJ_CY2JllG5nIERhDkcV47rncamnQLnPacSAOFFNH1pMIPSbgJ-pQIaMI1OL6xXrjkseCP2LOV9atM4J_573U1AIkQKFxVUh4x7FznytC-3_Jpzs34IsvVwI-Phwj-SU5VMN9nAZ8FodTgSu_plFQP7HapFADWFwcvoUJSXdQdGo38e3YyX-mZHrlANrxSmwEce4M9vI1EL_He99PcYagwe5doqOVXj_QHTzHYBYDHcp2bxiK3eMJbvCiVniLPxRSEFW90j0hdTQre2Lnw.egkY4TVeRpHH0QcKiw5eTg/__results___files/__results___3_0.png)

## 🧠 Model Details & Performance




###  Model Architecture 


The model leverages **PhoBERT-base**, a pre-trained language model specifically optimized for Vietnamese text (based on the RoBERTa architecture). To optimize training and preserve PhoBERT's foundational language understanding, the custom `ToxicClassifier` uses a targeted fine-tuning strategy:
* **Frozen Backbone (Layers 0-9):** The first 10 transformer layers are frozen. This reduces the computational resources needed for training while retaining the general language embeddings.
* **Fine-Tuned Layers (Layers 10, 11 & Pooler):** Only the deepest transformer layers are trained, allowing the model to adapt specifically to the toxicity classification task.
* **Custom Classification Head (ToxicClassifier):** This simple network uses Dropout (to prevent overfitting) and ReLU activation, finally reducing the 768-dimensional embedding down to the **3 specific toxicity classes (HATE, OFFENSIVE, and CLEAN)**.

```mermaid
graph TD
    subgraph Input Layer
        Inp[input_ids] 
        Msk[attention_mask]
    end

    subgraph PhoBERT Base Backbone
        PB_Frozen["PhoBERT Transformer Layers 0-9 <br><i>(Weights Frozen)</i>"]
        PB_Train["PhoBERT Transformer Layers 10-11 & Pooler <br><i>(Fine-tuned / Gradients Enabled)</i>"]
    end


    subgraph ToxicClassifier
        Drop1[nn.Dropout 0.3]
        Dense1[nn.Linear 768 ➔ 512]
        Act[nn.ReLU]
        Drop2[nn.Dropout 0.2]
        Out[nn.Linear 512 ➔ 3 Labels]
    end

    %% Data Connections
    Inp & Msk --> PB_Frozen
    PB_Frozen --> PB_Train
    PB_Train -->  Drop1
    Drop1 --> Dense1
    Dense1 --> Act
    Act --> Drop2
    Drop2 --> Out

    %% Styling blocks
    classDef frozen fill:#f9f9f9,stroke:#ccc,stroke-dasharray: 5 5;
    classDef active fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;
    class PB_Frozen frozen;
    class PB_Train,Dense1,Out active;
```

###  Performance

![image](https://www.kaggleusercontent.com/kf/328689048/eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..-Im6GuNdr0J2HQRiqDb-OA.Lt530NnitkJw9cZKJeaIBkeLN41Ukz1Df6YM3w--rnTfPvOcIFShvR4BeaQ7LbPEGOAjD8O1U_khk05fHNy5S0sBwMCBNsUqdLwGTuLSCScOTKWwWINpPuCfJvPtRdM23AL79VfQpcaEzd1cJe3FrbP4s9L5V6wZn7yIc5J4JzdAeqWcdDksPrJXK7o9DyMKAHk5vXW-FReEBdIWayzMsblvT6KK4dKUGdXZppDmFIwLdAZ15cI7QJOJNp62a_4yob409gR4EJDI7W4qEfzefYEid0hu-kjbUiRdQij6sHYjXPonoV2i0IvqLVFYI3POOoKwhQK1mus4nWqFN1XIp8ZqDF6m5VgP_kBmwl9rKV59QPAD8ZR8LYCdvFMIRroZ0VW-4GfH_FPoYDpHLiznJrnYqlLPDmnvlLQ9QhaH7s4SVUAzMlUcuqfl6TM_Zj5ceG95NcWoisZEi8QnrBHdCQNK06ANcM5HwkknEohMoNGhmUru_aNwdU0JhVv91StMNlyciOOkHs5b5_7zM650b6YkP1UEvCiSDY9Bk-gVmALcwHDHiW4Js0vBOO7PKYlA4sMcREo3KkqH7ozcXtMOSnleYQ32AXmTUwbSVY1MrTueUk4J4oHk5eV0NBIoSU8EdQHV1Y2ttI-KHET-6L75Hg.qL6F1G3WHnviuhR52rfGAw/__results___files/__results___8_0.png)

## Installation & Setup

Because this extension runs inference entirely on your local machine to protect privacy, you will need to set up both the Python backend server and load the extension into your browser.

### 1. Backend Server Setup

Clone the repository:
   ```bash
   git clone [https://github.com/Kevinthepilot/Toxic-Comment-Censorship-Extension.git](https://github.com/Kevinthepilot/Toxic-Comment-Censorship-Extension.git)
   cd Toxic-Comment-Censorship-Extension
   ```
Install the required dependencies:
```bash
pip install -r requirements.txt
```

Start the local API server:
```bash
python server.py
```
### 2. Browser Extension Installation
- Once the backend server is running, install the extension in your browser:
    - Open your browser and navigate to `chrome://extensions/`
- Enable Developer mode using the toggle switch (usually found in the top right corner).
- Click on the Load unpacked button (top left corner).
- Select the extension folder from the directory where you cloned this repository.

