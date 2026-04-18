document.addEventListener('DOMContentLoaded', () => {
    // --- Tracking Logic ---
    const trackForm = document.getElementById('tracking-form');
    const trackInput = document.getElementById('tracking-input');
    const trackBtn = document.getElementById('track-btn');
    const errorMsg = document.getElementById('error-message');
    const resultsContainer = document.getElementById('tracking-results');

    // Result Nodes
    const resStatus = document.getElementById('res-status');
    const resOrigin = document.getElementById('res-origin');
    const resDest = document.getElementById('res-destination');
    const resEta = document.getElementById('res-eta');
    const resFuzzyStatus = document.getElementById('res-fuzzy-status');
    const resLocation = document.getElementById('res-location');
    const resWeather = document.getElementById('res-weather');
    const resTraffic = document.getElementById('res-traffic');
    const resDistance = document.getElementById('res-distance');
    const resHistory = document.getElementById('res-history');

    // Global state
    let currentTrackingId = null;

    trackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = trackInput.value.trim();
        if (!id) return;

        trackBtn.innerText = "Tracking...";
        trackBtn.disabled = true;
        errorMsg.classList.add('hidden');
        resultsContainer.classList.add('hidden');

        try {
            const response = await fetch(`/api/track/${id}`);
            
            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Unable to connect to the tracking server. Are you sure you are running 'node server.js' and viewing this at http://localhost:3000?");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to retrieve package data.");
            }

            // Populate dashboard
            currentTrackingId = id;
            
            resStatus.innerText = data.Status;
            
            // Adjust color based on status
            if(data.Status === 'Delayed') resStatus.style.color = '#ef4444';
            else if(data.Status === 'Out for Delivery') resStatus.style.color = '#10B981';
            else resStatus.style.color = '#60A5FA';

            resOrigin.innerText = data.Origin;
            resDest.innerText = data.Destination;

            // Fuzzy Prediction Data
            resEta.innerText = data.prediction.etaFormatted;
            resFuzzyStatus.innerText = data.prediction.fuzzyStatus;
            
            // Highlight negative delays
            if(data.prediction.fuzzyStatus.includes('Delay')) {
                resFuzzyStatus.style.color = '#ef4444';
            } else {
                resFuzzyStatus.style.color = '#10B981';
            }

            // Conditions
            resLocation.innerText = data.CurrentLocation;
            resWeather.innerText = data.WeatherCondition;
            resTraffic.innerText = data.TrafficCongestion;
            resDistance.innerText = `${data.DistanceRemaining} miles`;

            // History Timeline
            resHistory.innerHTML = '';
            data.HistoryEvents.forEach(evt => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <p class="time">${evt.timestamp}</p>
                    <p class="event">${evt.event}</p>
                    <p class="loc">${evt.location}</p>
                `;
                resHistory.appendChild(li);
            });

            // Show results
            resultsContainer.classList.remove('hidden');

        } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.classList.remove('hidden');
        } finally {
            trackBtn.innerText = "Track Package";
            trackBtn.disabled = false;
        }
    });

    // --- Chatbot Logic ---
    const chatToggle = document.getElementById('chatbot-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatBody = document.getElementById('chat-body');

    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if(!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    const addMessage = (message, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        
        // Parse simple markdown-like bold text **text** to HTML
        let formattedMsg = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        msgDiv.innerHTML = formattedMsg;

        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const handleSendMessage = async () => {
        const message = chatInput.value.trim();
        if(!message) return;

        // User message
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    trackingId: currentTrackingId // Send current context context
                })
            });
            
            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Unable to connect to the server.");
            }

            const data = await response.json();
            
            // Bot response
            addMessage(data.reply, 'bot');
        } catch (err) {
            addMessage("Sorry, I'm having trouble connecting to the server.", 'bot');
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    };

    chatSend.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

});
