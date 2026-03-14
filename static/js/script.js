document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatWindow = document.getElementById('chatWindow');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');
    const statusText = document.getElementById('statusText');
    const themeToggle = document.getElementById('themeToggle');

    // Theme Toggle Logic
    let currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeIcon();

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateThemeIcon();
    });

    function updateThemeIcon() {
        if (currentTheme === 'light') {
            themeToggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        } else {
            themeToggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    }

    // Chat Logic
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');

        // Simple markdown parsing for Gemini responses
        if (sender === 'bot') {
            // Replace **bold** with <strong>bold</strong>
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Replace *italic* with <em>italic</em>
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            // Replace newlines with <br>
            formattedText = formattedText.replace(/\n/g, '<br>');
            bubble.innerHTML = formattedText;
        } else {
            bubble.textContent = text;
        }
        
        messageDiv.appendChild(bubble);
        chatWindow.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatWindow.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function sendCommand(command) {
        if (!command.trim()) return;

        // Disable input while sending
        userInput.disabled = true;
        sendBtn.disabled = true;
        
        appendMessage('user', command);
        userInput.value = '';
        showTypingIndicator();
        statusText.textContent = "Generating response...";

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: command })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            removeTypingIndicator();
            
            if (data.response) {
                appendMessage('bot', data.response);
            } else {
                appendMessage('bot', "I have nothing to say.");
            }
            statusText.textContent = "Ready";

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            appendMessage('bot', "Sorry, I couldn't reach the server. Please ensure the backend is running.");
            statusText.textContent = "Error connected to server";
            statusText.style.color = "#ef4444";
            setTimeout(() => {
                statusText.style.color = "var(--muted-text)";
                statusText.textContent = "Ready";
            }, 3000);
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendCommand(userInput.value);
    });

    // Web Speech API Logic
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        let isListening = false;

        voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch(e) {
                    console.error(e);
                }
            }
        });

        recognition.onstart = function() {
            isListening = true;
            voiceBtn.classList.add('listening');
            statusText.textContent = "Listening... Speak now";
            statusText.style.color = "#10b981";
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            sendCommand(transcript);
        };

        recognition.onerror = function(event) {
            console.error(event.error);
            statusText.textContent = "Microphone error: " + event.error;
            statusText.style.color = "#ef4444";
        };

        recognition.onend = function() {
            isListening = false;
            voiceBtn.classList.remove('listening');
            if (statusText.textContent.includes("Listening")) {
               statusText.textContent = "Ready";
               statusText.style.color = "var(--muted-text)";
            }
        };
    } else {
        voiceBtn.style.display = 'none';
        console.warn("Speech Recognition API not supported in this browser.");
    }
    
    // Auto focus input
    userInput.focus();
});
