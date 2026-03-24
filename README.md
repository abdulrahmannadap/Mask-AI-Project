# Mask AI 🎭 - Expert Financial & Trading AI Analyst

Mask AI is an advanced, locally-hosted Financial AI Analyst built with **FastAPI**, **Ollama (Local LLMs)**, and **ChromaDB**. It can answer complex financial queries, analyze uploaded documents (PDFs, Excels, Word), perform real-time web searches for live stock prices, and maintain long-term chat memory.

---

## 🚀 Prerequisites

Before running this project on your local system, ensure you have the following installed:

1. **Python 3.9+**: [Download Python](https://www.python.org/downloads/)
2. **Ollama**: For running local LLMs. Highly recommended for fast processing via GPU. Download Ollama
3. **Tesseract OCR**: For extracting text from scanned PDFs and images. 
   * **Windows Users:** Download and install it in `C:\Program Files\Tesseract-OCR\`. Download Tesseract
4. **SQL Server Express**: To save chat history. (Make sure *ODBC Driver 17 for SQL Server* is installed).
5. **Git**: To clone the repository.

---

## 🛠️ Step-by-Step Setup & Installation

### Step 1: Clone the Repository
First, clone the project repository to your local machine:
```bash
git clone https://github.com/abdulrahmannadap/mask-ai.git
cd mask-ai
```

### Step 2: Create a Virtual Environment
Python ka virtual environment banayein taaki dependencies clash na hon:
```bash
python -m venv .venv
```
**Activate the environment:**
* Windows: `.venv\Scripts\activate`
* Mac/Linux: `source .venv/bin/activate`

### Step 3: Install Dependencies
Project ki saari zaroori libraries install karein:
```bash
pip install -r requirements.txt
```

### Step 4: Setup Ollama & Download Models
Ye application **Ollama** ka use karti hai. Humey 2 models download karne honge:
1. **Chat ke liye (LLM):** `llama3`
2. **Vector Embeddings ke liye (RAG):** `nomic-embed-text`

Apna terminal/CMD kholiye aur ye commands run karein:
```bash
ollama run llama3
ollama pull nomic-embed-text
```
*(Note: `ollama run llama3` command model ko download karegi aur run karegi. Download hone ke baad aap `/bye` type karke bahar aa sakte hain. Background mein Ollama chalta rahega, jo GPU ka use karke fast response dega).*

### Step 5: Database Configuration (SQL Server)
Chat history aur user feedback ko save karne ke liye SQL Server use ho raha hai. 
1. Apne SQL Server mein ek naya database create karein jiska naam `chatdb` ho.
2. Apne project mein `app/db.py` file ko open karein.
3. `SERVER_NAME` variable ko apne SQL Server ke naam se replace karein (For example: `localhost\SQLEXPRESS`).

```python
# Example (Update in app/db.py)
SERVER_NAME = r"YOUR_SERVER_NAME\SQLEXPRESS"
DATABASE_NAME = "chatdb"
```
*(Note: ChromaDB (Vector Database) local folder `chroma_db` mein khud ban jayega).*

---

## 🏃‍♂️ How to Run the Application

Jab saara setup complete ho jaye, toh application ko start karne ke liye ye command run karein:

```bash
uvicorn app.main:app --reload
```

Ya phir aap direct Python se bhi run kar sakte hain:
```bash
python app/main.py
```

Ab apna web browser kholiye aur is link par jayen:
👉 **http://127.0.0.1:8000**

---

## 🌟 Key Features
- **Live Web Search**: Gets real-time Nifty/Sensex data, latest news, and Wikipedia summaries.
- **RAG (Retrieval-Augmented Generation)**: Upload PDFs, DOCX, TXT, or Excel files. The AI uses `nomic-embed-text` to index them in ChromaDB and answers questions based on your documents.
- **OCR Integration**: Reads text from scanned images and PDFs using Tesseract.
- **Smart Memory**: Keeps track of your past conversations for contextual replies.
- **GPU Accelerated**: Fully utilizes your Graphics Card via Ollama for lightning-fast AI responses.

---
*Developed by Abdul Rahman Nadap*

_________________________________________________________________________________________________________________

# Mask AI 🎭 - Expert Financial & Trading AI Analyst

Mask AI is an advanced, locally-hosted Financial AI Analyst built with **FastAPI**, **Ollama (Local LLMs)**, and **ChromaDB**. It can answer complex financial queries, analyze uploaded documents (PDFs, Excels, Word), perform real-time web searches for live stock prices, and maintain long-term chat memory.

---

## 🚀 Prerequisites (Zaroori Software)

Is project ko apne system par run karne se pehle, aapke paas niche di gayi cheezein install honi chahiye:

1. **Python 3.9+**: [Download Python](https://www.python.org/downloads/)
2. **Ollama**: Local LLMs ko run karne ke liye. Graphic Card (GPU) par fast processing ke liye zaroori hai. [Download Ollama](https://ollama.com/)
3. **Tesseract OCR**: Scanned PDFs aur images se text nikalne ke liye. 
   * **Windows Users:** Isko download karein aur `C:\Program Files\Tesseract-OCR\` mein install karein. Download Tesseract
4. **SQL Server Express**: Chat history save karne ke liye. (Make sure *ODBC Driver 17 for SQL Server* is installed).
5. **Git**: Code ko clone karne ke liye.

---

## 🛠️ Step-by-Step Setup & Installation

### Step 1: Clone the Repository
Sabse pehle project ko apne local system mein clone karein:
```bash
git clone https://github.com/abdulrahmannadap/mask-ai.git
cd mask-ai
```

### Step 2: Create a Virtual Environment
Python ka virtual environment banayein taaki dependencies clash na hon:
```bash
python -m venv .venv
```
**Activate the environment:**
* Windows: `.venv\Scripts\activate`
* Mac/Linux: `source .venv/bin/activate`

### Step 3: Install Dependencies
Project ki saari zaroori libraries install karein:
```bash
pip install -r requirements.txt
```

### Step 4: Setup Ollama & Download Models
Ye application **Ollama** ka use karti hai. Humey 2 models download karne honge:
1. **Chat ke liye (LLM):** `llama3`
2. **Vector Embeddings ke liye (RAG):** `nomic-embed-text`

Apna terminal/CMD kholiye aur ye commands run karein:
```bash
ollama run llama3
ollama pull nomic-embed-text
```
*(Note: `ollama run llama3` command model ko download karegi aur run karegi. Download hone ke baad aap `/bye` type karke bahar aa sakte hain. Background mein Ollama chalta rahega, jo GPU ka use karke fast response dega).*

### Step 5: Database Configuration (SQL Server)
Chat history aur user feedback ko save karne ke liye SQL Server use ho raha hai. 
1. Apne SQL Server mein ek naya database create karein jiska naam `chatdb` ho.
2. Apne project mein `app/db.py` file ko open karein.
3. `SERVER_NAME` variable ko apne SQL Server ke naam se replace karein (For example: `localhost\SQLEXPRESS`).

```python
# Example (Update in app/db.py)
SERVER_NAME = r"YOUR_SERVER_NAME\SQLEXPRESS"
DATABASE_NAME = "chatdb"
```
*(Note: ChromaDB (Vector Database) local folder `chroma_db` mein khud ban jayega).*

---

## 🏃‍♂️ How to Run the Application

Jab saara setup complete ho jaye, toh application ko start karne ke liye ye command run karein:

```bash
uvicorn app.main:app --reload
```

Ya phir aap direct Python se bhi run kar sakte hain:
```bash
python app/main.py
```

Ab apna web browser kholiye aur is link par jayen:
👉 **http://127.0.0.1:8000**

---

## 🌟 Key Features
- **Live Web Search**: Gets real-time Nifty/Sensex data, latest news, and Wikipedia summaries.
- **RAG (Retrieval-Augmented Generation)**: Upload PDFs, DOCX, TXT, or Excel files. The AI uses `nomic-embed-text` to index them in ChromaDB and answers questions based on your documents.
- **OCR Integration**: Reads text from scanned images and PDFs using Tesseract.
- **Smart Memory**: Keeps track of your past conversations for contextual replies.
- **GPU Accelerated**: Fully utilizes your Graphics Card via Ollama for lightning-fast AI responses.

---
*Developed by Abdul Rahman Nadap*