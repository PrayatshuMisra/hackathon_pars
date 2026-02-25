# PARS - Patient Assessment & Risk Stratification System
### Team Errorists - Hackathon Presentation Script

---

## 🎤 Member 1: Introduction & Problem Statement

**[Slide: Title Slide - PARS Logo and Team Name]**

**Member 1:** "Hello everyone! We are Team Errorists, and we are excited to present our project: **PARS**, which stands for the **Patient Assessment & Risk Stratification System**. 

**[Slide: The Problem]**

Have you ever walked into an Emergency Room and seen people waiting for hours just to get a basic assessment? Current ER triage processes are highly manual, time-consuming, and prone to human error. In critical moments, a delay in identifying a high-risk patient—like someone quietly suffering from subtle heart attack symptoms—can be fatal. Overcrowding and understaffing make this problem even worse. Hospitals need a way to rapidly and accurately prioritize patients the moment they arrive.

**[Slide: Our Solution - PARS]**

That is exactly why we built PARS. PARS is an AI-powered smart triage system designed to completely revolutionize ER efficiency. By leveraging machine learning and real-time data processing, our system automatically evaluates a patient's vital signs, medical history, and chief complaints, and instantly categorizes them into High, Medium, or Low risk. Our goal is simple: ensure that critical cases receive immediate attention, removing the guesswork from the intake process and drastically reducing wait times where it matters most.

Now, I'll pass it over to [Member 2's Name] to show you how this workflow actually operates in real-time."

---

## 🎤 Member 2: The End-to-End Workflow

**[Slide: Patient Journey (Self-Check-In Kiosk)]**

**Member 2:** "Thank you! The beauty of PARS lies in its seamless workflow, divided into two main portals: the Patient Kiosk and the Doctor's Command Center.

Let’s start with the **Patient Journey**. Imagine a patient walking into the ER. Instead of standing in line, they use our multilingual Self-Check-In Kiosk. We've made data entry incredibly accessible. A patient can either type their symptoms manually, or use our **Voice-to-Text feature** to simply speak their symptoms—'I have a severe headache and chest pain'—supported in over six languages! 
If they have a past medical report or a referral, they can just upload it. Our system uses OCR to instantly extract their medical history. Concurrently, a simulated wearable device pulls in vital signs like Heart Rate and SpO2 levels. 
Once the data is in, our AI instantly assesses the patient, generates a Risk Report, and—if they are using the system remotely—our geolocation feature maps the route to the nearest emergency facility.

**[Slide: Doctor's Command Center]**

Simultaneously, let's look at the **Staff Journey**. The moment the patient completes intake, their card dynamically appears on the Doctor's Dashboard. This Command Center features a live, color-coded Patient Queue. If a high-risk patient enters the system, Framer Motion animations immediately push their card to the top of the queue with an alert. Doctors can view live stats, hospital KPIs, and bed availability, and can seamlessly admit or discharge patients with a single click. 

To explain the brain behind this routing and risk-scoring, I’ll hand it over to [Member 3's Name]."

---

## 🎤 Member 3: AI & Machine Learning Integration

**[Slide: The AI Engine & Architecture]**

**Member 3:** "Thanks! To make PARS truly intelligent, we built a decoupled AI engine using Python, FastAPI, and TensorFlow, which handles three major tasks: Risk Stratification, NLP Department Routing, and Medical OCR.

**[Slide: Risk Stratification & Guardrails]**

First is the **Risk Stratification Model**. We trained a deep Sequential Neural Network using Keras on a comprehensive patient dataset (`patients_data.csv`). The model takes in 22 distinct features—including age, vitals like blood pressure and GCS score, and medical history—and passes them through hidden layers with dropout regularization. It outputs a probabilistic risk score from 0 to 1. 

However, AI isn't perfect, and in healthcare, safety is paramount. So, we instituted a **Hybrid Approach with Safety Guardrails**. Before the neural network makes a decision, strict rule-based overrides check for critical conditions. If a patient's heart rate is over 180 or O2 is below 85%, the system immediately flags them as 'High Risk' bypassing the AI entirely.

**[Slide: NLP Routing & OCR]**

Second, our **NLP Department Classifier**. We integrated a Hugging Face Sentence-Transformer (`all-MiniLM-L6`) using Sentence-BERT. When a patient says, 'My chest feels heavy,' the model uses cosine similarity to map that text to the correct medical vector space, automatically referring them to the Cardiology department.

Finally, for the document uploads, we combined PyMuPDF, Tesseract, and the Gemini API to parse everything from digital to scanned PDF prescriptions, reliably extracting vital fields despite messy formatting. 

Now, building this wasn't easy. I’ll let [Member 4's Name] wrap up with the hurdles we faced and what lies ahead."

---

## 🎤 Member 4: Challenges Faced, Future Scope & Scalability

**[Slide: Challenges & Issues Faced]**

**Member 4:** "Thank you. Bringing PARS to life definitely came with some heavy technical challenges. 

1. **Memory constraints and OOM Errors**: Initially, hosting a full TensorFlow model alongside Sentence Transformers caused extreme memory spikes, leading to Out-Of-Memory (OOM) crashes on our backend servers. We had to heavily optimize our Dockerfile, implement lazy loading for our heavy models (so they only load into RAM when needed), and migrate our deployment perfectly to keep memory usage under the 512MB limits.
2. **OCR Inconsistencies**: Parsing medical PDFs was a nightmare. Standard text extraction failed on scanned images, so we had to build a robust fallback system combining regex heuristics with Gemini API vision capabilities to ensure we never missed crucial tabular vital signs.
3. **Strict Typing Quirks**: On the frontend, migrating fully to strict TypeScript resulted in several block-scoped redeclaration and type-matching errors in our React workflows, which taught us to strictly govern our application state.

**[Slide: Future Scope & Scalability]**

Looking ahead, the **scalability and future potential** of PARS is massive:
*   **Hardware / Wearable Integration**: Currently, we simulate vitals like ECG and SpO2. Our next step is true IoT integration with hospital-grade wearables (like Apple Watch or Garmin APIs) for live, continuous telemetry.
*   **Full EMR Sync**: We plan to implement absolute HL7/FHIR compliance, allowing PARS to directly read and write to standard Electronic Medical Records (Epic, Cerner).
*   **Multi-Hospital Scaling**: Upgrading our Supabase database architecture to support a centralized multi-tenant network, so dispatchers can route ambulances not just to the nearest hospital, but to the hospital with the fastest AI-predicted ER queue.

By predicting emergencies before they hit the doctor's desk, PARS won't just save time—it will save lives. 

Thank you all for listening, we are Team Errorists, and we’re happy to take your questions!"
