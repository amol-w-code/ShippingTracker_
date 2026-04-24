document.addEventListener('DOMContentLoaded', () => {
    // --- Scrollytelling Logic ---
    const canvas = document.getElementById('scrolly-canvas');
    const context = canvas.getContext('2d');
    const scrollySection = document.getElementById('scrollytelling');
    const steps = document.querySelectorAll('.step');

    const frameCount = 134;
    const currentFrame = index => (
        `frames/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`
    );

    const images = [];
    let imagesLoaded = 0;

    // Preload images
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === 1) {
                // Draw first frame immediately
                renderFrame(0);
                canvas.classList.add('loaded');
            }
        };
        images.push(img);
    }

    let targetFrameIndex = 0;
    let currentFrameIndex = 0;

    function renderFrame(index) {
        const roundedIndex = Math.round(index);
        if (images[roundedIndex]) {
            const img = images[roundedIndex];
            const canvasRatio = canvas.width / canvas.height;
            const imgRatio = img.width / img.height;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasRatio > imgRatio) {
                drawWidth = canvas.width;
                drawHeight = canvas.width / imgRatio;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = canvas.height * imgRatio;
                drawHeight = canvas.height;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }
    }

    function updateCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        renderFrame(currentFrameIndex);
    }

    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    // Smooth animation loop
    function animate() {
        // Lerp factor (0.1 for slow/smooth, 1.0 for instant)
        const lerpFactor = 0.1;
        currentFrameIndex += (targetFrameIndex - currentFrameIndex) * lerpFactor;

        renderFrame(currentFrameIndex);
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Scroll listener for target frame index
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFraction = Math.max(0, Math.min(1, scrollTop / scrollHeight));

        targetFrameIndex = scrollFraction * (frameCount - 1);

        // Toggle landed state for Step 5 layout transformation
        // Step 5 is the 5th section out of 5, so around 80%+ scroll
        document.body.classList.toggle('landed', scrollFraction > 0.78);

        // Step activation and parallax
        steps.forEach((step) => {
            const rect = step.getBoundingClientRect();
            const glassCard = step.querySelector('.glass-card');

            if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
                step.classList.add('active');

                if (glassCard) {
                    const relativePos = (rect.top + rect.height / 2) / window.innerHeight;
                    const moveY = (relativePos - 0.5) * 60;
                    glassCard.style.transform = `translateY(${moveY}px) rotate(${(relativePos - 0.5) * 10}deg)`;
                }
            } else {
                step.classList.remove('active');
            }
        });
    });

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
                throw new Error("Unable to connect to the tracking server. Make sure you have run 'python app.py' and are viewing this at http://localhost:3000");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to retrieve package data.");
            }

            // Populate dashboard
            currentTrackingId = id;

            resStatus.innerText = data.Status;

            // Adjust color based on status
            if (data.Status === 'Delayed') resStatus.style.color = '#ef4444';
            else if (data.Status === 'Out for Delivery') resStatus.style.color = '#10B981';
            else resStatus.style.color = '#60A5FA';

            resOrigin.innerText = data.Origin;
            resDest.innerText = data.Destination;

            // Fuzzy Prediction Data
            resEta.innerText = data.prediction.etaFormatted;
            resFuzzyStatus.innerText = data.prediction.fuzzyStatus;

            // Highlight negative delays
            if (data.prediction.fuzzyStatus.includes('Delay')) {
                resFuzzyStatus.style.color = '#ef4444';
            } else {
                resFuzzyStatus.style.color = '#10B981';
            }

            // Conditions
            resLocation.innerText = data.CurrentLocation;
            resWeather.innerText = data.WeatherCondition;
            resTraffic.innerText = data.TrafficCongestion;
            resDistance.innerText = `${data.DistanceRemaining} km`;

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

            // Smooth scroll to results
            setTimeout(() => {
                resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

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
        if (!chatWindow.classList.contains('hidden')) {
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
        if (!message) return;

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
