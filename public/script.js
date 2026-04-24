document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

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

    function updateScrollState() {
        // Don't update if an overlay is active
        if (document.querySelector('.overlay-page.active')) return;

        const step5 = document.getElementById('step5');
        const step5Top = step5.offsetTop;

        // If results are active, don't allow scrolling above Step 5
        if (document.body.classList.contains('results-active')) {
            if (window.scrollY < step5Top) {
                window.scrollTo(0, step5Top);
            }
        }

        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFraction = Math.max(0, Math.min(1, scrollTop / scrollHeight));

        targetFrameIndex = scrollFraction * (frameCount - 1);

        // Force 'landed' state and final frame if results are active
        if (document.body.classList.contains('results-active')) {
            document.body.classList.add('landed');
            // Ensure we stay at or near the final frame for the animation
            targetFrameIndex = Math.max(targetFrameIndex, (frameCount - 1) * 0.85);
        } else {
            // Normal scrollytelling behavior
            document.body.classList.toggle('landed', scrollFraction > 0.78);
        }

        // Step activation and parallax
        steps.forEach((step) => {
            const rect = step.getBoundingClientRect();
            const glassCard = step.querySelector('.glass-card');
            
            if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
                step.classList.add('active');
                
                if (glassCard) {
                    const relativePos = (rect.top + rect.height/2) / window.innerHeight;
                    const moveY = (relativePos - 0.5) * 60;
                    glassCard.style.transform = `translateY(${moveY}px) rotate(${ (relativePos - 0.5) * 10 }deg)`;
                }
            } else {
                step.classList.remove('active');
            }
        });
    }

    // Scroll listener
    window.addEventListener('scroll', updateScrollState);

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
        
        // Don't hide resultsContainer here if you want to keep showing old results while loading new ones,
        // or hide it if you want a clean state.
        resultsContainer.classList.remove('active'); 

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
            resOrigin.innerText = data.Origin;
            resDest.innerText = data.Destination;
            resEta.innerText = data.prediction.etaFormatted;
            resFuzzyStatus.innerText = data.prediction.fuzzyStatus;
            resLocation.innerText = data.CurrentLocation;
            resWeather.innerText = data.WeatherCondition;
            resTraffic.innerText = data.TrafficCongestion;
            resDistance.innerText = `${data.DistanceRemaining} km`;

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

            // Show results inline
            resultsContainer.classList.add('active');
            resultsContainer.classList.remove('hidden');
            document.body.classList.add('results-active'); // Lock scroll up
            
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

    // --- Clear Tracking Logic ---
    const clearBtn = document.getElementById('clear-btn');
    
    // Initial state check
    if (trackInput.value.trim().length === 0) {
        clearBtn.classList.add('hidden');
        trackInput.classList.remove('has-content');
    }

    // Show/Hide clear button and adjust padding based on input
    trackInput.addEventListener('input', () => {
        if (trackInput.value.trim().length > 0) {
            clearBtn.classList.remove('hidden');
            trackInput.classList.add('has-content');
        } else {
            clearBtn.classList.add('hidden');
            trackInput.classList.remove('has-content');
        }
    });

    clearBtn.addEventListener('click', () => {
        // Clear input and state
        trackInput.value = '';
        clearBtn.classList.add('hidden');
        trackInput.classList.remove('has-content');
        errorMsg.classList.add('hidden');
        
        // Hide results
        resultsContainer.classList.remove('active');
        document.body.classList.remove('results-active');
        
        // Smoothly scroll back to Step 5
        const step5 = document.getElementById('step5');
        step5.scrollIntoView({ behavior: 'smooth' });
    });

    // --- Logo Navigation Logic ---
    const logoBtn = document.getElementById('logo-btn');
    logoBtn.addEventListener('click', () => {
        // If results are open, reset everything and go to Step 1
        if (document.body.classList.contains('results-active')) {
            document.body.classList.remove('results-active');
            resultsContainer.classList.remove('active');
            resultsContainer.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        // If in Step 5 (landed), go to Step 1
        if (document.body.classList.contains('landed')) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Otherwise, go to Step 5
            const step5 = document.getElementById('step5');
            step5.scrollIntoView({ behavior: 'smooth' });
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
        
        let formattedMsg = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Add icons for a more premium feel
        const iconName = sender === 'bot' ? 'bot' : 'user';
        msgDiv.innerHTML = `
            <div class="message-icon"><i data-lucide="${iconName}"></i></div>
            <div class="message-text">${formattedMsg}</div>
        `;
        
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Re-initialize Lucide for the new icon
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    const handleSendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    trackingId: currentTrackingId
                })
            });
            const data = await response.json();
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

    // --- Overlay Navigation Logic ---
    const menuLinks = document.querySelectorAll('.side-menu a');
    const overlayPages = document.querySelectorAll('.overlay-page');
    const closeOverlayBtns = document.querySelectorAll('.close-overlay, .back-btn');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1); 
            const targetPage = document.getElementById(`${targetId}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
                document.body.classList.add('no-scroll');
            }
        });
    });

    closeOverlayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlayPages.forEach(page => page.classList.remove('active'));
            document.body.classList.remove('no-scroll');
            updateScrollState();
        });
    });

    overlayPages.forEach(page => {
        page.addEventListener('click', (e) => {
            if (e.target === page) {
                page.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateScrollState();
            }
        });
    });

});
