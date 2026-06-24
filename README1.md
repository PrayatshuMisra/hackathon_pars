# PARS - Patient Assessment & Risk Stratification System - BY TEAM ERRORISTS

![PARS Logo](public/logo.png)

PARS is a state-of-the-art **AI-Powered Triage System** designed to revolutionize emergency room efficiency. By leveraging machine learning and real-time data processing, PARS automatically prioritizes patients based on vital signs and chief complaints, ensuring that critical cases receive immediate attention.

# Project Title: AI-Powered Smart Patient Triage System (Hackathon Winner)
## 1. Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion (for smooth animations), Lucide React (icons), Recharts (for risk charts).
- **Backend:** Python FastAPI (standard for ML integration).
- **Database:** SQLite (for simplicity) using SQLAlchemy.
- **ML Engine:** Python (TensorFlow/Keras + Scikit-Learn logic).
- **NLP


---

## 🏗️ System Architecture

The system follows a modern **Client-Server Architecture** with a decoupled AI Engine.

```mermaid
graph TD

Client["Frontend (React + Vite)"]
API["Backend API (FastAPI)"]
ML["ML Engine (TensorFlow / Keras + Scikit-Learn)"]
NLP["NLP Engine (SentenceTransformers)"]
DB["Database (Supabase PostgreSQL)"]
EXT["External APIs (OpenStreetMap)"]

Client -->|"REST API / JSON"| API
API -->|"Inference"| ML
API -->|"Semantic Processing"| NLP
API -->|"Read / Write"| DB
Client -->|"Geolocation"| EXT

subgraph Admin Dashboard
Client
end

subgraph AI Core
ML
NLP
end
```

---

## 🚀 Key Features

*   **Real-Time AI Triage**: Instantly categorizes patients into High, Medium, or Low risk using a Neural Network.
*   **Automatic Department Referral**: Uses NLP (BERT-based models) to route patients to the correct specialist (e.g., "Chest pain" -> Cardiology).
*   **Live Patient Queue**: A dynamic, color-coded dashboard for doctors to monitor incoming patients.
*   **Voice-to-Text Intake**: Multilingual voice recognition for hands-free patient data entry.
*   **OCR Integration**: Upload medical reports (PDF/Images) to auto-fill patient history.
*   **Hospital Locator**: Integrated geolocation to find the nearest emergency facility.
*   **Internationalization (i18n)**: Full support for 6+ languages (English, Hindi, Tamil, Telugu, Bengali, etc.).

---

## 🛠️ Tech Stack

### **Frontend**
*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) (Fast Hardware-Accelerated Build Tool)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Utility-first CSS), [Shadcn UI](https://ui.shadcn.com/) (Accessible Components)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) (Complex UI transitions)
*   **Icons**: Lucide React
*   **Charts**: Recharts (Medical data visualization)
*   **State Management**: React Query (Server state), Context API (Auth)

### **Backend**
*   **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (High-performance Python web framework)
*   **Server**: Uvicorn (ASGI Server)
*   **Database**: Supabase (PostgreSQL with Realtime capabilities)

### **Machine Learning & AI**
*   **Core Engine**: TensorFlow / Keras (Sequential Neural Networks)
*   **Preprocessing**: Scikit-Learn (StandardScaler, OneHotEncoder)
*   **NLP**: SentenceTransformers (Hugging Face `all-MiniLM-L6-v2`) for semantic similarity.
*   **OCR**: PyMuPDF / Tesseract (Document parsing)

---

## 🧠 ML & Triage Logic

### **1. Risk Stratification Model**
The heart of PARS is a **Neural Network (Sequential Model)** trained on `patients_data.csv`.

*   **Inputs (22 Features)**: Age, Gender, Heart Rate, BP (Sys/Dia), O2, Temp, Resp Rate, Pain Score, GCS, Medical History (Diabetes, etc.).
*   **Architecture**:
    *   Input Layer (64 neurons, ReLU)
    *   Hidden Layers (Dropout for regularization)
    *   Output Layer (Sigmoid activation) -> Returns a **Risk Score (0.0 - 1.0)**.

### **2. Safety Guardrails (Hybrid Approach)**
To prevent AI errors in critical scenarios, we implement **Rule-Based Overrides** before neural inference.

```mermaid
graph TD

Start["Patient Input"] --> Guard{"Critical Condition Check"}

Guard -->|"HR > 180"| Critical["HIGH RISK - Critical"]
Guard -->|"O2 < 85%"| Critical
Guard -->|"GCS <= 8"| Critical

Guard -->|"Otherwise"| Model["Neural Network Inference"]

Model --> Score["Risk Score Generated"]

Score -->|"Score > 0.75"| High["HIGH RISK"]
Score -->|"Score > 0.40"| Medium["MEDIUM RISK"]
Score -->|"Score <= 0.40"| Low["LOW RISK"]
```

### **3. NLP Department Classifier**
Uses **Sentence-BERT** to map chief complaints to medical departments via **Cosine Similarity**.
*   *Input*: "My chest feels heavy and hurts"
*   *Embedding Match*: Matches "Cardiology" vector space.
*   *Output*: **Cardiology** (Referral).

---

## 📂 Component & Page Breakdown

### **1. Pages (`src/pages/`)**

| Page | Description | Key Features |
| :--- | :--- | :--- |
| **Login (`Login.tsx`)** | Dual-mode authentication portal. | • **Staff Portal**: Secure doctor login.<br>• **Patient Portal**: Kiosk mode access.<br>• **Video Background**: Immersive medical ambience.<br>• **i18n**: Language switcher. |
| **Dashboard (`Dashboard.tsx`)** | The "Command Center" for medical staff. | • **Live Stats**: Bed availability, critical count.<br>• **Patient Queue**: Real-time sorting by acuity.<br>• **Admit/Discharge**: One-click actions. |
| **PatientIntake (`PatientIntake.tsx`)** | Patient self-check-in kiosk. | • **Voice Input**: "I have a headache."<br>• **Simulated Vitals**: Connects to dummy wearable.<br>• **GPS Map**: Finds nearest hospital.<br>• **Auto-Triage**: Instant AI result display. |

### **2. Key Components (`src/components/`)**

*   **`AdminStats.tsx`**: Visualizes hospital KPIs using `Recharts`.
    *   *Charts*: Arrival trends, Department volume, Risk distribution (Pie).
*   **`PatientQueue.tsx`**: The core list view.
    *   *Features*: Animated re-ordering when new high-risk patients arrive. Uses `Framer Motion` for layout transitions.
*   **`VitalsMonitor.tsx`**: A realistic ECG simulation.
    *   *Tech*: Animated SVC graphs representing Heart Rate and SpO2 waveforms. Allows manual "Simulation Mode" (e.g., triggering Tachycardia).

---

## ⚙️ Installation & Setup

### **Prerequisites**
*   Node.js (v18+)
*   Python (3.9+)
*   Git

### **1. Clone Repository**
```bash
git clone https://github.com/YourRepo/PARS.git
cd patient_pars
```

### **2. Backend Setup (FastAPI)**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload
```
*Server will start at `http://localhost:8000`*

### **3. Frontend Setup (React)**
```bash
# Open a new terminal root directory
npm install
npm run dev
```
*App will run at `http://localhost:8000` (Vite Default)*

---

## 🧪 Testing & Validation

### **Running the Triage Model Manually**
You can test the AI logic without the frontend using the provider script:
```bash
cd backend
python test_api.py
```

### **Training a New Model**
To retrain the Neural Network on new data:
1.  Update `patients_data.csv`.
2.  Run:
    ```bash
    python train.py
    ```
3.  This replaces `triage_model_nn.keras` with the improved version.

---

## 🗺️ User Flows

### **Patient Journey (Kiosk Mode)**
```mermaid
graph LR
    Start[User Arrives] --> Mode{Selection}
    Mode -- Manual --> Form[Fill Form]
    Mode -- Voice --> Mic[Speak Symptoms]
    Mode -- Files --> OCR[Upload Report]
    
    Form & Mic & OCR --> AI[AI Analysis]
    AI --> Result[Risk Report]
    Result --> Map[Navigate to Hospital]
```

### **Doctor/Admin Journey**
```mermaid
graph LR
    Login --> Dash[Command Center]
    Dash -->|View| Queue[Live Queue]
    Dash -->|Analyze| Stats[Hospital Metrics]
    Dash -->|Action| Treat[Admit/Discharge Patient]
```

Figure 1: High-Level System Architecture Diagram
```mermaid
flowchart TD
    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef model fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef core fill:#ffe0b2,stroke:#e65100,stroke-width:2px;
    classDef db fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef output fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef decision fill:#fce4ec,stroke:#880e4f,stroke-width:2px;

    %% Level 1: Intake Layer
    subgraph L1 [1. Multimodal Intake Layer]
        direction LR
        V_F[/"WebSpeech API<br/>(Real-Time UI)"/]:::input
        V_B[/"Whisper Engine<br/>(Backend)"/]:::input
        T[/"Manual Entry<br/>Portal"/]:::input
        W[/"Wearable Vitals<br/>Stream"/]:::input
        O[/"Scanned Docs &<br/>Lab Reports"/]:::input
        
        %% Force visual order
        V_F ~~~ V_B ~~~ T ~~~ W ~~~ O
    end

    %% Level 2: Extraction
    subgraph L2 [2. Data Extraction & Normalization]
        direction LR
        NLP_E{{"Sentence-BERT<br/>Semantic Embedder"}}:::model
        NORM["Structured JSON<br/>Normalization"]:::core
        OCR_P{{"Optical Character<br/>Recognition (OCR)"}}:::model
        
        NLP_E ~~~ NORM ~~~ OCR_P
    end

    %% Level 3: Dual-Processing Engine
    subgraph L3 [3. Hybrid Triage Processing Core]
        direction LR
        
        %% Left Side logic
        MATCH{"Cosine Matcher<br>(-1.0 to 1.0)"}:::decision
        
        %% Right Side logic
        subgraph Pipeline [Sequential Risk Assessment]
            direction TB
            RULE{"Deterministic Guardrails<br>(HR>180, SpO2<85%)"}:::decision
            DNN{{"5-Layer Keras<br/>Deep Neural Network"}}:::model
            XAI["Explainable AI<br/>(XAI)"]:::core
            
            RULE == "Thresholds Passed<br/>(Safe)" ==> DNN
            RULE -.->|"Safety Override<br/>Bypass DNN (Risk=0.99)"| XAI
            DNN ==>|"Probabilistic Score"| XAI
        end
        
        MATCH ~~~ Pipeline
    end

    %% Level 4: Final Output
    subgraph L4 [4. Output & Hospital Integration]
        direction LR
        R[/"Smart Dept<br/>Router"/]:::output
        EHR[/"EHR Database<br/>Sync"/]:::output
        DB[("Hospital Database")]:::db
        PDF[/"Auto-Generated<br/>Patient File"/]:::output
        
        R ~~~ EHR ~~~ DB ~~~ PDF
    end

    %% ================= CONNECTIONS ================= %%
    
    %% NLP / Left Column Path
    V_F -.->|"Async Correction"| V_B
    V_F -->|"Draft Audio"| NLP_E
    V_B -->|"Validated Terms"| NLP_E
    T -->|"Symptom Text"| NLP_E
    
    NLP_E ==>|"Embeddings"| MATCH
    MATCH ==>|"Confidence Score"| R
    R -->|"Target Dept"| EHR

    %% Docs & Vitals / Right Column Path
    O -->|"Image Data"| OCR_P
    OCR_P -->|"Extracted Vitals"| NORM
    W -->|"Live Feed"| NORM
    T -->|"Manual Demographics"| NORM
    
    NORM ==>|"Aggregated Matrix"| RULE
    
    %% To EHR and Final Outputs
    XAI ==>|"Risk Acuity + Factors"| EHR
    EHR -->|"Commit Record"| DB
    EHR -->|"Compile Report"| PDF
```

Figure 2: Hybrid Risk Stratification Flowchart
```mermaid
flowchart LR
 subgraph Gatekeeper["Deterministic Safety Guardrails (Early-Exit Check)"]
    direction TB
        C{"Evaluate Critical Vitals<br>Against Configured Thresholds"}
        C1["Check: HR &gt; 180 or HR &lt; 40"]
        C2["Check: Systolic BP &lt; 70"]
        C3["Check: SpO2 &lt; 85%"]
        C4["Check: GCS ≤ 8 (Coma)"]
        E{"Any Critical<br>Condition Met?"}
  end
 subgraph Override_Path["Emergency Override Path"]
    direction TB
        G["Trigger Safety Override:<br>Bypass Neural Network"]
        H["Force Risk Score = 0.99 (HIGH)"]
        XAI_OR@{ label: "Generate Override Reason<br>(e.g., 'Critical Hypoxia SpO2 &lt; 85%')" }
  end
 subgraph ML_Pipeline["Deep Neural Network Inference Pipeline"]
    direction TB
        B["Initialize DataFrame<br>from Patient Payload"]
        PREP["Data Pre-processing"]
        DNN{{"5-Layer Keras DNN<br>(ReLU &amp; Tanh activations, Sigmoid output)"}}
        D["Extract Probabilistic Inference Score<br>(Continuous Float: 0.0 - 1.0)"]
  end
 subgraph Output_Formatting["Explainable AI & Final Categorization"]
    direction TB
        CAT{"Score Categorization"}
        CAT_L["Score &lt; 0.40 = LOW"]
        CAT_M["Score 0.40 - 0.74 = MEDIUM"]
        CAT_H["Score ≥ 0.75 = HIGH"]
        XAI_NN@{ label: "Rule-Based XAI Parser:<br>Analyze input vector to formulate explanation<br>(e.g., 'Fever detected', 'Low O2')" }
  end
    C -.-> C1 & C2 & C3 & C4
    C1 -.-> E
    C2 -.-> E
    C3 -.-> E
    C4 -.-> E
    G ==> H
    H ==> XAI_OR
    B --> PREP
    PREP --> DNN
    DNN --> D
    CAT -.-> CAT_L & CAT_M & CAT_H
    A[/"Incoming Patient Payload:<br>(HR, SpO2, BP, GCS, Temp, Age, Pain, History)"/] -.-> C
    E == YES ==> G
    E == NO (Safe) ==> B
    D ==> CAT
    D --> XAI_NN
    XAI_OR ==> I["Final API Response Object:<br>{ risk_score, risk_label, details }"]
    CAT_L ==> I
    CAT_M ==> I
    CAT_H ==> I
    XAI_NN ==> I

    XAI_OR@{ shape: rect}
    XAI_NN@{ shape: rect}
     C:::decision
     C1:::process
     C2:::process
     C3:::process
     C4:::process
     E:::decision
     G:::decision
     H:::process
     XAI_OR:::process
     B:::data
     PREP:::process
     DNN:::model
     D:::process
     CAT:::decision
     CAT_L:::process
     CAT_M:::process
     CAT_H:::process
     XAI_NN:::process
     A:::input
     I:::output
    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef model fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef output fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
```

Figure 3: Semantic NLP Department Routing Workflow
```mermaid
flowchart TD
    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef model fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef logic fill:#fce4ec,stroke:#880e4f,stroke-width:2px;
    classDef data fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef final fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;

    %% 1. Input Processing
    A[/"Unstructured Patient Symptom Text"/]:::input --> VAL{"Length > 3 Chars?"}:::logic
    VAL -- "NO" --> FM[/"Fallback to 'General_Medicine'"/]:::final
    
    %% 2. The Dual-Track Analysis Pipeline
    VAL -- "YES" --> DT[DUAL-TRACK ANALYSIS]:::logic
    
    %% Left Branch: NLP
    DT --> SEM_B(["NLP Engine: SentenceTransformer<br/>('all-MiniLM-L6-v2')"]):::model
    SEM_B --> SEM_V["Compute Symptom Embedding Vector"]:::logic
    
    DB_E[("Pre-computed Department<br/>Embeddings Archive")]:::data --> SEM_C
    SEM_V --> SEM_C{"Compute Cosine<br/>Similarity Matrix (-1.0 to 1.0)"}:::logic
    SEM_C --> S_SCORE["Output: NLP Scores Array"]:::data
    
    %% Right Branch: Med Dictionary
    DT --> DICT[("Medical Keyword Dictionary<br/>(Weighted 0.0 - 1.0)")]:::data
    DICT --> KW_C{"Iterative Matching &<br/>Multi-Match Boosting"}:::logic
    KW_C --> K_SCORE["Output: Keyword Scores Array"]:::data
    
    %% 3. The Hybrid Scoring Matrix
    subgraph Engine [Dynamic Hybrid Weighting Engine]
        direction TB
        HYB{"Conditional Weight Logic"}:::logic
        C1["If Keyword Score ≥ 0.8<br/>Priority: 70% KW | 30% NLP"]:::logic
        C2["If Keyword Score ≥ 0.5<br/>Balance: 50% KW | 50% NLP"]:::logic
        C3["Default Confidence<br/>Priority: 30% KW | 70% NLP"]:::logic
        
        HYB -.-> C1 & C2 & C3
    end
    
    S_SCORE & K_SCORE ==> HYB
    
    %% 4. Final Routing & Database Queries
    C1 & C2 & C3 ==> RANK["Compute Final Aggregated Score"]:::logic
    RANK ==> MAX["Select Maximum Scoring Department"]:::logic
    
    %% Doctor fetching
    MAX ==> SQL[("Query Database DB<br/>Table = Target Department")]:::data
    SQL ==> RES[/"Final JSON Payload:<br/>{ department: str, doctors: [] }"/]:::final
```

Figure 4: Multimodal Voice Intake Pipeline
```mermaid
sequenceDiagram
    autonumber
    
    box rgb(225, 245, 254) Client-Side (React Frontend)
        participant U as Patient/Attendant User
        participant UI as PARS UI (useSpeechToText)
        participant WEB as Browser WebSpeech API
    end
    
    box rgb(255, 243, 224) Server-Side (FastAPI Backend)
        participant W_API as FastAPI Transcription Endpoint
        participant WHISPER as Whisper Acoustic Model
        participant AI as PARS Triage Engine
    end

    U->>UI: Triggers Microphone (Click or AltRight)
    
    alt MODE: Web (Low Latency / Offline Capable)
        UI->>WEB: Initializes window.SpeechRecognition
        activate WEB
        WEB-->>UI: Real-time interim results stream
        
        loop Continuous Listening
            U->>WEB: Dictates symptoms ("I feel dizzy... stop listening")
            WEB->>UI: Returns final phrase
            UI->>UI: Regex Command Parsing (Extracts "stop" / "submit")
            UI-->>U: Updates DOM instantly with text
        end
        deactivate WEB
        UI->>AI: Pushes final curated text string
        
    else MODE: Whisper (High Medical Accuracy)
        UI->>UI: Requests getUserMedia(sampleRate: 48000)
        UI->>UI: Applies Noise Suppression & Echo Cancellation
        
        U->>UI: Dictates complex medical history
        activate UI
        UI->>UI: MediaRecorder chunks audio to Blob[] array
        
        U->>UI: Stops Recording
        UI->>UI: Compiles chunks into standard .webm Blob
        UI->>W_API: POST /transcribe (multipart/form-data)
        deactivate UI
        
        activate W_API
        W_API->>WHISPER: Injects audio buffer for inference
        activate WHISPER
        WHISPER->>WHISPER: Acoustic Denoising + Medical Terminology Decoding
        WHISPER-->>W_API: Returns corrected transcript
        deactivate WHISPER
        
        W_API-->>UI: JSON Response {text: "..."}
        deactivate W_API
        
        UI->>UI: Parses commands (e.g., "Submit")
        UI-->>U: Updates DOM with high-accuracy text
        UI->>AI: Pushes final curated text string
    end
    
    %% Final integration into triage
    activate AI
    AI->>AI: Execute NLP Routing & Risk Scoring
    AI-->>UI: Returns { risk_score, department, details }
    deactivate AI
```

Figure 5: User Interface and Output Artifacts
```mermaid
classDiagram
    %% The Output Artifacts
    class DigitalPatientFile_PDF {
        <<Generated Output Artifact (jsPDF)>>
        +String Case_ID
        +String Demographics_String
        +String Chief_Complaint_Block
        +Grid Vitals_Observation_Matrix
        +Color Risk_Categorization_Badge
        +String Recommended_Specialist
        +Datetime Generation_Timestamp
        --
        +exportBuffer() : Blob
        +triggerDownload() : void
    }
    
    class Database TriageRecord {
        <<Database Entity>>
        +UUID patient_id
        +String name
        +String chief_complaint
        +String risk_label
        +Float risk_score
        +String department
        +String explanation
        --
        +insert() : HTTPResponse
        +subscribe() : RealtimeChannel
    }

    %% The Core Interface
    class PatientIntake_UI {
        <<Client-Side React Interface>>
        +SpeechRecorder useSpeechToText
        +FormData patient_schema_zod
        +VitalsMonitor simulatedHardware
        --
        +handleVoiceResult(text)
        +onSubmit(payload)
        +handleExportPDF()
    }

    %% The Analytics/Monitoring Interface
    class TriageAttendant_Dashboard {
        <<Real-Time Monitoring UI>>
        +Array~DatabaseTriageRecord~ ActiveQueue
        +Array~DatabaseTriageRecord~ PatientHistory
        --
        +calculateRiskDistribution()
        +filterByRetentionTime()
    }
    
    class ExplainableAI_RiskPanel {
        <<Transparent Decision Component>>
        +String Risk_Level (LOW/MEDIUM/HIGH)
        +String Ai_Rationale_Text
        +List Extracted_Contributing_Factors
        --
        +renderDynamicColor() : CSSObject
        +displayTypewriterEffect()
    }

    %% System Relationships
    PatientIntake_UI "1" --> "1" DigitalPatientFile_PDF : Generates Report on Demand
    PatientIntake_UI "1" --> "1" DatabaseTriageRecord : Commits Payload to DB
    DatabaseTriageRecord "many" --> "1" TriageAttendant_Dashboard : Streams Real-Time Updates
    TriageAttendant_Dashboard "1" *-- "1" ExplainableAI_RiskPanel : Embeds XAI Data Visualization

    %% ==========================================
    %% Styling and Color Scheme
    %% ==========================================
    style PatientIntake_UI fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    style TriageAttendant_Dashboard fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    
    style DatabaseTriageRecord fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    
    style DigitalPatientFile_PDF fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    
    style ExplainableAI_RiskPanel fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
```