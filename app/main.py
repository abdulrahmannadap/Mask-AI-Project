import os
import logging
import shutil
import concurrent.futures
import re
import requests
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from app.llm import ask_llm_stream, ask_llm
from app.db import engine
from app.models import chat_table, feedback_table, document_text_table, scraped_data_table, metadata
from app.rag import process_document, retrieve_context, save_chat_memory
from duckduckgo_search import DDGS
from sqlalchemy import select
from bs4 import BeautifulSoup
import yfinance as yf
import wikipedia

app = FastAPI()

logging.basicConfig(level=logging.INFO)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

static_path = os.path.join(BASE_DIR, "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)

app.mount("/static", StaticFiles(directory=static_path), name="static")

templates_path = os.path.join(BASE_DIR, "templates")
if not os.path.exists(templates_path):
    os.makedirs(templates_path)

templates = Jinja2Templates(directory=templates_path)

try:
    metadata.create_all(engine)
    logging.info("Database connected")
except Exception as e:
    logging.error(f"DB Error: {e}")

class ChatRequest(BaseModel):
    user_id: str
    query: str
    global_user_id: str = "user_123"

class FeedbackRequest(BaseModel):
    user_id: str
    feedback: str
    feedback_text: str = None
    message_id: int = None

def get_system_prompt():
    current_date_time = datetime.now().strftime("%A, %d %B %Y, %I:%M %p")
    return f"""You are Mask AI, an expert Financial and Trading AI Analyst.
If anyone asks about your identity or what you can do, professionally introduce yourself as 'Mask AI' and state that you are here to provide "any financial knowledge you want", including stock market analysis, trading strategies, and financial data interpretation.
Today's date and current time is {current_date_time}. Use this information if the user asks about today, the current time, or dates in relation to today.
Your capabilities include:
- Answering complex questions about finance, trading, stock markets, crypto, and investments.
- Reading, understanding, and comparing multiple uploaded financial documents (like earnings reports, balance sheets, and trading logs). You can cross-reference data between different files.
- Handling Financial Tables: Pay strict attention to Markdown tables. Correlate rows and columns accurately, extract exact numbers, and present your financial comparisons clearly.
- Acting as a smart financial analyst: Auto-summarize financial reports, extract key financial metrics, highlight market risks, and identify profitable trends.
- Knowledge Graph: Visually map out financial flows or market correlations using a `mermaid` code block when asked.
Always maintain a professional, analytical, and highly accurate tone suitable for trading and finance. Be clear and concise, using beautiful Markdown formatting (headings, bold text, bullet points) for readability."""

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

def save_message(user_id, message, msg_type):
    with engine.begin() as conn:
        conn.execute(
            chat_table.insert().values(
                user_id=user_id,
                message=message,
                message_type=msg_type
            )
        )

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        save_message(request.user_id, request.query, "user")
        
        def stream_generator():
            full_response = ""
            llm_generator = None
            source_text = ""
            
            try:
                # 1. Thought Process: Search Database First
                query_clean = request.query.strip().lower()
                fast_chat_keywords = ["hi", "hello", "hey", "hii", "hiii", "good morning", "good evening", "how are you", "who are you", "what's up", "thanks", "thank you", "ok", "okay", "bye", "goodbye"]
                
                if query_clean in fast_chat_keywords or len(query_clean) <= 2:
                    context, sources = "", []  # Fast Bypass: Skip heavy database search for casual chats
                else:
                    context, sources = retrieve_context(request.query, request.global_user_id)
                
                # URL Scraping Logic: Detect URL in chat and save to DB
                url_match = re.search(r'(https?://[^\s]+)', request.query)
                if url_match:
                    url = url_match.group(0)
                    try:
                        with engine.connect() as conn:
                            existing = conn.execute(
                                scraped_data_table.select().where(
                                    (scraped_data_table.c.user_id == request.global_user_id) & 
                                    (scraped_data_table.c.url == url)
                                )
                            ).first()
                        
                        if existing:
                            scraped_text = existing.content
                        else:
                            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                            res = requests.get(url, headers=headers, timeout=5)
                            soup = BeautifulSoup(res.content, 'html.parser')
                            for element in soup(["script", "style", "nav", "footer", "header"]):
                                element.extract()
                            scraped_text = soup.get_text(separator=' ', strip=True)
                            
                            if scraped_text:
                                with engine.begin() as conn:
                                    conn.execute(
                                        scraped_data_table.insert().values(
                                            user_id=request.global_user_id,
                                            url=url,
                                            content=scraped_text
                                        )
                                    )
                                    
                        if scraped_text:
                            context = (context + "\n\n" if context else "") + f"Website Content ({url}):\n{scraped_text}"
                            if url not in sources:
                                sources.append(url)
                    except Exception as e:
                        logging.error(f"Failed to scrape URL: {e}")

                if context:
                    # Context Compression: Summarize large contexts before final generation
                    if len(context) > 30000:
                        raw_text = context[:30000] # Safe token limit for compression
                        compression_prompt = f"Extract and summarize ONLY the key information highly relevant to answering this query: '{request.query}'. Omit all irrelevant details.\n\nRaw Text:\n{raw_text}"
                        compressed = ask_llm(compression_prompt, system_prompt="You are a strict data extractor. Return only the compressed relevant facts.")
                        if compressed:
                            context = compressed
                            
                    prompt = f"""Analyze the following retrieved context (which may contain uploaded documents, tables, or past conversation memory) as an expert Business Analyst. 
Provide a smart, insightful, and well-structured answer to the user's question. 
If the question involves comparing data or tables, carefully cross-reference the exact numbers, rows, and columns before drawing conclusions. Where applicable, include an auto-summary, list key modules, and highlight high-complexity areas.

Context:
{context}

Question: {request.query}"""
                    source_text = ", ".join(sources)
                else:
                    # 2. Thought Process: Web Search Fallback
                    query_lower = request.query.lower()
                    live_keywords = ["news", "stock", "price", "weather", "match", "score", "latest", "today", "nifty", "sensex"]
                    wiki_keywords = ["what is", "who is", "define", "explain", "history", "background", "concept", "gdp", "population"]
                    needs_web = any(word in query_lower for word in live_keywords)
                    needs_wiki = any(word in query_lower for word in wiki_keywords)
                    web_context = ""
                    
                    def fetch_wiki(q):
                        try:
                            search_res = wikipedia.search(q)
                            if search_res:
                                return f"Wikipedia Knowledge & Facts:\n{wikipedia.summary(search_res[0], sentences=4, auto_suggest=False)}\n\n"
                        except Exception: pass
                        return ""

                    def fetch_stock(q):
                        stock_info = []
                        try:
                            if "nifty" in q:
                                data = yf.Ticker("^NSEI").history(period="1d")
                                if not data.empty: stock_info.append(f"Nifty 50 Live/Close Price: ₹{data['Close'].iloc[-1]:.2f}")
                            if "sensex" in q:
                                data = yf.Ticker("^BSESN").history(period="1d")
                                if not data.empty: stock_info.append(f"BSE Sensex Live/Close Price: ₹{data['Close'].iloc[-1]:.2f}")
                        except Exception: pass
                        return "Real-time Stock Market Data:\n" + "\n".join(stock_info) + "\n\n" if stock_info else ""

                    def fetch_news(q):
                        try:
                            results = DDGS().text(q, max_results=3)
                            return "Latest Market News:\n" + "\n".join([f"- {r['body']}" for r in results]) + "\n\n"
                        except Exception: pass
                        return ""

                    # Parallel Execution (Speed Boost)
                    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                        futures = []
                        if needs_wiki: futures.append(executor.submit(fetch_wiki, request.query))
                        if needs_web:
                            futures.append(executor.submit(fetch_stock, query_lower))
                            futures.append(executor.submit(fetch_news, request.query))
                            
                        for future in concurrent.futures.as_completed(futures):
                            res = future.result()
                            if res: web_context += res
                            
                    prompt = f"Here is some real-time information from the web:\n{web_context}\n\nBased on this, answer the following question: {request.query}" if web_context else request.query

                # --- MEMORY: Inject Chat History ---
                history_text = ""
                try:
                    with engine.connect() as conn:
                        recent_msgs = conn.execute(
                            chat_table.select()
                            .where(chat_table.c.user_id == request.user_id)
                            .order_by(chat_table.c.id.desc())
                            .limit(7)  # Fetch last 6 messages + current query
                        ).fetchall()
                        if len(recent_msgs) > 1:
                            history_text = "--- Previous Conversation Context ---\n"
                            # Skip the 0th element because it is the current query we just saved
                            for m in reversed(recent_msgs[1:]):
                                role = "User" if m.message_type == 'user' else "AI"
                                msg_clean = m.message[:500] + "..." if len(m.message) > 500 else m.message
                                history_text += f"{role}: {msg_clean}\n"
                            history_text += "-------------------------------------\n\n"
                except Exception as e:
                    logging.error(f"History fetch error: {e}")
                
                final_prompt = f"{history_text}{prompt}"

                # 3. Final AI Answer Stream
                for chunk in ask_llm_stream(final_prompt, system_prompt=get_system_prompt()):
                    full_response += chunk
                    yield chunk
                
                if source_text:
                    citation = f"\n\n**Source File(s):** `{source_text}`\n"
                    full_response += citation
                    yield citation
            finally:
                if full_response.strip():
                    save_message(request.user_id, full_response, "ai")
                    
                    # Disable Heavy Long-Term Memory to speed up replies and keep new chats clean
                    # try:
                    #     save_chat_memory(request.global_user_id, request.query, full_response)
                    # except Exception as e:
                    #     logging.error(f"Long-term memory error: {e}")

        return StreamingResponse(stream_generator(), media_type="text/plain")
    except Exception as e:
        return StreamingResponse(iter([f"Error: {str(e)}"]), media_type="text/plain")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        user_folder = os.path.join(BASE_DIR, "data", "users", user_id)
        os.makedirs(user_folder, exist_ok=True)
        
        file_path = os.path.join(user_folder, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        chunks_added, extracted_text = process_document(file_path, user_id)
        
        doctype = os.path.splitext(file.filename)[1].lower().replace(".", "")
        
        with engine.begin() as conn:
            conn.execute(
                document_text_table.insert().values(
                    user_id=user_id,
                    filename=file.filename,
                    doctype=doctype,
                    content=extracted_text
                )
            )
            
        return {"status": "success", "message": f"Processed {chunks_added} sections and securely saved document text to Database for <b>{file.filename}</b>."}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/sessions")
def get_sessions():
    with engine.connect() as conn:
        result = conn.execute(chat_table.select()).fetchall()
        
    sessions = {}
    for row in result:
        uid = row.user_id
        # Chat ka pehla 'user' message as a title set karenge
        if uid not in sessions and row.message_type == 'user':
            sessions[uid] = row.message
            
    return [{"session_id": k, "title": v} for k, v in sessions.items()]

@app.get("/history")
def get_history(user_id: str = None, limit: int = 50, offset: int = 0):
    with engine.connect() as conn:
        stmt = select(
            chat_table.c.id, chat_table.c.user_id, chat_table.c.message, 
            chat_table.c.message_type, feedback_table.c.feedback, feedback_table.c.feedback_text
        ).select_from(
            chat_table.outerjoin(feedback_table, chat_table.c.id == feedback_table.c.message_id)
        )

        if user_id:
            stmt = stmt.where(chat_table.c.user_id == user_id)
            
        stmt = stmt.order_by(chat_table.c.id.desc()).limit(limit).offset(offset)
        result = conn.execute(stmt).fetchall()

    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "message": row.message,
            "message_type": row.message_type,
            "feedback": getattr(row, 'feedback', None),
            "feedback_text": getattr(row, 'feedback_text', None)
        }
        for row in reversed(result)
    ]

@app.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    try:
        with engine.begin() as conn:
            target_msg_id = req.message_id
            if not target_msg_id:
                latest = conn.execute(
                    chat_table.select().where((chat_table.c.user_id == req.user_id) & (chat_table.c.message_type == 'ai')).order_by(chat_table.c.id.desc()).limit(1)
                ).first()
                if latest:
                    target_msg_id = latest.id
                    
            if target_msg_id:
                existing = conn.execute(feedback_table.select().where(feedback_table.c.message_id == target_msg_id)).first()
                if existing:
                    conn.execute(feedback_table.update().where(feedback_table.c.message_id == target_msg_id).values(feedback=req.feedback, feedback_text=req.feedback_text))
                else:
                    conn.execute(feedback_table.insert().values(message_id=target_msg_id, user_id=req.user_id, feedback=req.feedback, feedback_text=req.feedback_text))
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.delete("/clear")
def clear_history():
    try:
        with engine.begin() as conn:
            conn.execute(chat_table.delete())
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
