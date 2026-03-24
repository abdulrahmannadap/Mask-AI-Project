import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"

# Yahan apna pasandida model naam dalein (e.g., "mistral", "llama3.1", "phi3")
LLM_MODEL = "llama3"

def ask_llm_stream(prompt: str, system_prompt: str = ""):
    try:
        payload = {
            "model": LLM_MODEL,
            "prompt": prompt,
            "stream": True
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            stream=True
        )
        for line in response.iter_lines():
            if line:
                data = json.loads(line.decode('utf-8'))
                if "response" in data:
                    yield data["response"]
    except Exception as e:
        yield "LLM Connection Error: Ensure Ollama is running."

def ask_llm(prompt: str, system_prompt: str = ""):
    try:
        payload = {
            "model": LLM_MODEL,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        response = requests.post(OLLAMA_URL, json=payload)
        if response.status_code == 200:
            return response.json().get("response", "")
    except Exception: pass
    return ""
