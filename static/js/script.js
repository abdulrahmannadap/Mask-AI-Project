let currentSessionId = localStorage.getItem('currentSessionId') || "session_" + Date.now();
const globalUserId = "user_123"; // Account System hone par user ki actual ID yaha lagengi
let selectedFile = null;
let messageOffset = 0;
const MESSAGE_LIMIT = 50;
let isFetchingHistory = false;
let hasMoreHistory = true;

async function loadSessions() {
    try {
        const response = await fetch('/sessions');
        const sessions = await response.json();
        const recentSection = document.querySelector('.recent-section');
        
        recentSection.innerHTML = '';
        
        const groups = { "Today": [], "Yesterday": [], "Previous 7 Days": [], "Older": [] };
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const last7Days = new Date(today); last7Days.setDate(last7Days.getDate() - 7);

        sessions.forEach(session => {
            const sessionDate = new Date(session.created_at);
            const compareDate = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

            if (compareDate.getTime() === today.getTime()) {
                groups["Today"].push(session);
            } else if (compareDate.getTime() === yesterday.getTime()) {
                groups["Yesterday"].push(session);
            } else if (compareDate.getTime() > last7Days.getTime()) {
                groups["Previous 7 Days"].push(session);
            } else {
                groups["Older"].push(session);
            }
        });

        for (const [groupName, groupSessions] of Object.entries(groups)) {
            if (groupSessions.length === 0) continue;
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'recent-title';
            titleDiv.innerText = groupName;
            if (recentSection.children.length > 0) titleDiv.style.marginTop = '20px';
            recentSection.appendChild(titleDiv);

            groupSessions.forEach(session => {
                const btn = document.createElement('button');
                btn.className = `session-btn ${session.session_id === currentSessionId ? 'active' : ''}`;
                let title = session.title;
                if (title.length > 20) title = title.substring(0, 20) + '...';
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${title}`;
                btn.onclick = () => switchSession(session.session_id);
                recentSection.appendChild(btn);
            });
        }
    } catch (err) {
        console.error("Failed to load sessions", err);
    }
}

async function loadHistory(isScroll = false) {
    // Agar already history fetch ho rahi hai ya aur history nahi bachi, toh ruk jayein
    if (isFetchingHistory || (!hasMoreHistory && isScroll)) return;
    
    if (!isScroll) {
        messageOffset = 0;
        hasMoreHistory = true;
        localStorage.setItem('currentSessionId', currentSessionId);
    }
    
    isFetchingHistory = true;
    
    try {
        const response = await fetch(`/history?user_id=${currentSessionId}&limit=${MESSAGE_LIMIT}&offset=${messageOffset}`);
        const data = await response.json();
        
        if (data.length < MESSAGE_LIMIT) {
            hasMoreHistory = false; // Iska matlab ab aur purane messages nahi bache
        }
        
        const chatHistory = document.getElementById('chat-history');
        
        if (!isScroll) {
            chatHistory.innerHTML = '';
            data.forEach(msg => {
                const isUser = msg.message_type === 'user';
                appendMessage(msg.message, isUser ? 'user' : 'ai', null, !isUser, msg.id, msg.feedback);
            });
            loadSessions(); // Sidebar load karein
            renderMermaid(); // Purane graphs draw karein
        } else {
            if (data.length === 0) return;
            
            // Scroll position maintain rakhne ke liye purani height save karein
            const oldScrollHeight = chatHistory.scrollHeight;
            const fragment = document.createDocumentFragment();
            
            data.forEach(msg => {
                const isUser = msg.message_type === 'user';
                const rowDiv = createMessageElement(msg.message, isUser ? 'user' : 'ai', null, !isUser, msg.id, msg.feedback);
                fragment.appendChild(rowDiv);
            });
            
            // Naye (purane) messages ko chat history ke sabse upar (top) insert karein
            chatHistory.insertBefore(fragment, chatHistory.firstChild);
            
            // Scroll ko wahi adjust karein jahan user padh raha tha
            chatHistory.scrollTop = chatHistory.scrollHeight - oldScrollHeight;
            renderMermaid();
        }
        
        messageOffset += data.length; // Offset badha dein taaki agli baar aur purane aayein
    } catch (err) {
        console.error("Failed to load history", err);
    } finally {
        isFetchingHistory = false;
    }
}

function createMessageElement(text, type, id = null, isMarkdown = false, messageId = null, feedback = null) {
    const rowDiv = document.createElement('div');
    rowDiv.className = `message-row ${type}`;
    if (id) rowDiv.id = id;
    
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'message-wrapper';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = isMarkdown ? marked.parse(text) : text;
    
    wrapperDiv.appendChild(msgDiv);
    
    // Sirf AI messages ke aage Copy Icon lagayenge
    if (type === 'ai') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'msg-actions';
        
        // Jab tak "loading-" (typing) ho raha hai, tab tak buttons hide rakhein
        if (id && id.startsWith('loading-')) {
            actionsDiv.style.display = 'none';
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.title = 'Copy Message';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(msgDiv.innerText).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#F58220"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
                }, 2000); // 2 second baad checkmark hata denge
            });
        };
        actionsDiv.appendChild(copyBtn);

        // Feedback Buttons (Thumbs Up / Down)
        const upBtn = document.createElement('button');
        upBtn.className = `action-btn feedback-btn ${feedback === 'up' ? 'active-up' : ''}`;
        upBtn.title = 'Helpful';
        upBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';
        
        const downBtn = document.createElement('button');
        downBtn.className = `action-btn feedback-btn ${feedback === 'down' ? 'active-down' : ''}`;
        downBtn.title = 'Not Helpful';
        downBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>';

        // Feedback Box (Dislike karne par khulega)
        const feedbackBox = document.createElement('div');
        feedbackBox.className = 'feedback-box';
        feedbackBox.style.display = 'none';
        feedbackBox.innerHTML = `
            <input type="text" placeholder="What went wrong? Tell me how to improve..." class="feedback-input" />
            <button class="feedback-submit-btn">Regenerate</button>
        `;

        upBtn.onclick = () => {
            submitFeedback(messageId, 'up', upBtn, downBtn);
            feedbackBox.style.display = 'none';
        };
        
        downBtn.onclick = () => {
            submitFeedback(messageId, 'down', downBtn, upBtn);
            feedbackBox.style.display = 'flex'; // Dislike par box dikhayein
        };
        
        const submitBtn = feedbackBox.querySelector('.feedback-submit-btn');
        const inputField = feedbackBox.querySelector('.feedback-input');
        submitBtn.onclick = async () => {
            const fbText = inputField.value.trim();
            if (!fbText) return;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Saving...";
            
            await submitFeedback(messageId, 'down', downBtn, upBtn, fbText);
            feedbackBox.style.display = 'none';
            
            // Turant naya prompt field me daalkar Regenerate hit karein
            const queryInput = document.getElementById('query');
            queryInput.value = `The previous response was not helpful. Here is the feedback: "${fbText}". Please generate a corrected response.`;
            sendChat();
        };

        actionsDiv.appendChild(upBtn);
        actionsDiv.appendChild(downBtn);
        wrapperDiv.appendChild(actionsDiv);
        wrapperDiv.appendChild(feedbackBox);
        
        addCopyButtonsToCodeBlocks(msgDiv);
    }

    rowDiv.appendChild(wrapperDiv);
    return rowDiv;
}

async function submitFeedback(messageId, type, activeBtn, inactiveBtn, feedbackText = null) {
    activeBtn.classList.add(`active-${type}`);
    inactiveBtn.classList.remove(type === 'up' ? 'active-down' : 'active-up');
    
    try {
        const response = await fetch('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentSessionId, feedback: type, message_id: messageId, feedback_text: feedbackText })
        });
        const data = await response.json();
        if (data.status === "error") {
            console.error("Database Save Error:", data.detail);
        }
    } catch (e) { console.error("Feedback API error", e); }
}

function appendMessage(text, type, id = null, isMarkdown = false, messageId = null, feedback = null) {
    const chatHistory = document.getElementById('chat-history');
    const rowDiv = createMessageElement(text, type, id, isMarkdown, messageId, feedback);
    chatHistory.appendChild(rowDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addCopyButtonsToCodeBlocks(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-code-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.innerText = 'Copy';
        btn.onclick = () => {
            const code = pre.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.innerText = 'Copied!';
                setTimeout(() => btn.innerText = 'Copy', 2000);
            });
        };
        pre.appendChild(btn);
    });
}

function renderMermaid() {
    const mermaidBlocks = document.querySelectorAll('.language-mermaid');
    mermaidBlocks.forEach((block) => {
        const pre = block.parentElement;
        if (pre && pre.tagName.toLowerCase() === 'PRE') {
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.innerHTML = block.textContent;
            pre.parentNode.replaceChild(div, pre);
        }
    });
    try {
        mermaid.initialize({ startOnLoad: false, theme: document.body.classList.contains('dark-mode') ? 'dark' : 'default' });
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    } catch (err) {
        console.warn("Graph Render Error:", err);
    }
}

function switchSession(sessionId) {
    currentSessionId = sessionId;
    loadHistory();
}

function startNewChat() {
    currentSessionId = "session_" + Date.now();
    loadHistory(); // Naya UI set karega
}

async function sendChat() {
    const queryInput = document.getElementById('query');
    const sendBtn = document.getElementById('send-btn');
    const query = queryInput.value.trim();
    
    if (!query && !selectedFile) return;

    let userMsgDisplay = query;
    if (selectedFile) {
        userMsgDisplay = query ? `${query}<br><br><small style="color:#777;">📎 <i>Attached: ${selectedFile.name}</i></small>` : `<small style="color:#777;">📎 <i>Attached: ${selectedFile.name}</i></small>`;
    }
    appendMessage(userMsgDisplay, 'user');

    queryInput.value = '';
    queryInput.style.height = 'auto'; // Message bhejne ke baad box chhota kar dein
    
    // Request send karte hi inputs disable kar dein
    queryInput.disabled = true;
    sendBtn.disabled = true;

    // 1. Agar File Attached hai, toh pehle use upload and process karein
    if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("user_id", globalUserId);

        const uploadId = "upload-" + Date.now();
        const progressHtml = `
            <div id="progress-text-${uploadId}" style="margin-bottom: 5px; font-size: 14px;">Uploading <b>${selectedFile.name}</b>: <span>0%</span></div>
            <div class="upload-progress-container">
                <div id="progress-bar-${uploadId}" class="upload-progress-bar"></div>
            </div>
        `;
        appendMessage(progressHtml, 'ai', uploadId);
        document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;

        try {
            const data = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/upload", true);
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        const pBar = document.getElementById(`progress-bar-${uploadId}`);
                        const pText = document.getElementById(`progress-text-${uploadId}`);
                        if (pBar) pBar.style.width = percent + '%';
                        if (pText) {
                            if (percent < 100) pText.innerHTML = `Uploading <b>${selectedFile.name}</b>: <span>${percent}%</span>`;
                            else pText.innerHTML = `Reading & Processing document... ⏳`;
                        }
                    }
                };
                
                xhr.onload = () => {
                    if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
                    else reject(new Error(xhr.statusText));
                };
                xhr.onerror = () => reject(new Error("Network Error"));
                xhr.send(formData);
            });

            const uploadRow = document.getElementById(uploadId);
            
            if (data.status === "success") {
                uploadRow.querySelector('.message').innerHTML = `✅ <b>Document Ready!</b> ${data.message}`;
                removeAttachment(); // UI se attachment hata dein
            } else {
                uploadRow.querySelector('.message').innerHTML = `❌ <b>Upload Failed:</b> ${data.detail}`;
                queryInput.disabled = false;
                sendBtn.disabled = false;
                return; // Error aane par aage chat na karein
            }
        } catch (err) {
            const uploadRow = document.getElementById(uploadId);
            uploadRow.querySelector('.message').innerHTML = `❌ Connection Error during upload.`;
            queryInput.disabled = false;
            sendBtn.disabled = false;
            return;
        }
    }

    // 2. Agar koi Chat query nahi hai (sirf file bheji thi), toh ruk jayein
    if (!query) {
        queryInput.disabled = false;
        sendBtn.disabled = false;
        queryInput.focus();
        return;
    }

    const loadingId = "loading-" + Date.now();
    appendMessage('<div class="typing-dots"><span></span><span></span><span></span></div>', 'ai', loadingId);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentSessionId, query: query, global_user_id: globalUserId }) 
        });
        
        const loadingRow = document.getElementById(loadingId);
        const msgDiv = loadingRow.querySelector('.message');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let aiMessage = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            aiMessage += decoder.decode(value, { stream: true });
            msgDiv.innerHTML = marked.parse(aiMessage);
            document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
        }

        addCopyButtonsToCodeBlocks(msgDiv);
        loadingRow.removeAttribute('id');
        
        // Jab chat poori ho jaye, tab actions(buttons) ko dikhayein
        const actionsDiv = loadingRow.querySelector('.msg-actions');
        if (actionsDiv) actionsDiv.style.display = 'flex';
        
        renderMermaid(); // Streaming khatam hone par Graph draw karein
        messageOffset += 2; // Update offset, kyunki 2 naye messages (User + AI) database me gaye hain
        loadSessions(); 
        
        // Chat Length Warning - Prompt user to start new chat
        const messageCount = document.querySelectorAll('.message-row').length;
        if (messageCount >= 15 && !document.getElementById('token-warning')) {
            const warningDiv = document.createElement('div');
            warningDiv.id = 'token-warning';
            warningDiv.style = "text-align: center; margin: 15px auto; max-width: 80%; font-size: 13px; color: #856404; background: #fff3cd; padding: 10px; border-radius: 8px; border: 1px solid #ffeeba;";
            warningDiv.innerHTML = `⚠️ <b>Long Conversation:</b> This chat is getting long. To keep AI responses fast and avoid token limits, please <a href="#" onclick="startNewChat(); return false;" style="color: #F58220; font-weight: bold; text-decoration: underline;">Start a New Chat</a>.`;
            document.getElementById('chat-history').appendChild(warningDiv);
            document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
        }
    } catch (err) {
        const loadingRow = document.getElementById(loadingId);
        loadingRow.querySelector('.message').innerHTML = `<span style="color: red;">Connection Error</span>`;
    } finally {
        // Response complete hone par wapis enable karein aur input me focus layein
        queryInput.disabled = false;
        sendBtn.disabled = false;
        queryInput.focus();
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;
    document.getElementById('attachment-name').innerText = file.name;
    document.getElementById('attachment-preview').style.display = 'flex';
}

function removeAttachment() {
    selectedFile = null;
    document.getElementById('pdf-upload').value = '';
    document.getElementById('attachment-preview').style.display = 'none';
}

async function clearChat() {
    if (!confirm("Are you sure you want to delete ALL chat history from Database?")) return;
    try {
        const response = await fetch('/clear', { method: 'DELETE' });
        if (response.ok) {
            localStorage.removeItem('currentSessionId');
            startNewChat();
        } else {
            alert("Failed to clear chat.");
        }
    } catch (err) {
        console.error("Error clearing chat", err);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    // Dark mode par graphs ko wapas theme ke hisab se render karein
    const container = document.getElementById('chat-history');
    if (container.innerHTML.includes('mermaid')) location.reload();
}

function handleKeyPress(e) { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); // Nayi line dalne se rokein
        sendChat(); 
    } 
}

function autoResize(el) {
    el.style.height = 'auto'; // Pehle height reset karein
    el.style.height = (el.scrollHeight) + 'px'; // Text ke hisab se height set karein
}

window.onload = () => {
    // Load Dark Mode Preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    loadHistory();
    
    // Infinite Scroll Event Listener
    document.getElementById('chat-history').addEventListener('scroll', function() {
        if (this.scrollTop <= 5) {
            loadHistory(true);
        }
    });
};