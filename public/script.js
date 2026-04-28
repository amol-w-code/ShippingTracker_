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

    let isTakingOff = false;

    // Smooth animation loop
    function animate() {
        if (isTakingOff) {
            // Cinematic takeoff: Automatic fast playback
            const speed = 0.8;
            if (currentFrameIndex < frameCount - 1) {
                currentFrameIndex += speed;
            } else {
                currentFrameIndex = frameCount - 1;
                isTakingOff = false;
                document.body.classList.add('results-active');
                document.body.classList.add('landed');
                
                // Trigger UI updates
                const resultsContainer = document.getElementById('tracking-results');
                resultsContainer.classList.add('active');
                resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
            }
        } else if (!document.body.classList.contains('results-active')) {
            // Normal Scrollytelling: Smoothly interpolate to target frame based on scroll
            const scrollEasing = 0.1;
            currentFrameIndex += (targetFrameIndex - currentFrameIndex) * scrollEasing;
        }

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
        const scrollFraction = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;

        // Update target frame for scrollytelling
        if (!isTakingOff && !document.body.classList.contains('results-active')) {
            targetFrameIndex = scrollFraction * (frameCount - 1);
        }

        // Force 'landed' state and final frame if results are active
        if (document.body.classList.contains('results-active')) {
            document.body.classList.add('landed');
        } else {
            // Normal behavior: Landed state triggers the side menu
            document.body.classList.toggle('landed', scrollFraction > 0.85);
        }

        // Step activation and parallax
        steps.forEach((step) => {
            const rect = step.getBoundingClientRect();
            const glassCard = step.querySelector('.glass-card');
            
            if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
                step.classList.add('active');
                
                if (glassCard) {
                    const relativePos = (rect.top + rect.height/2) / window.innerHeight;
                    const moveY = (relativePos - 0.5) * 20;
                    glassCard.style.transform = `translateY(${moveY}px) rotate(${ (relativePos - 0.5) * 4 }deg)`;
                }
            } else {
                step.classList.remove('active');
            }
        });
    }

    // --- Cursor Hint Logic ---
    const cursorHint = document.getElementById('cursor-hint');
    let hasScrolled = false;

    // Hide default cursor initially
    document.body.style.cursor = 'none';

    window.addEventListener('mousemove', (e) => {
        if (!hasScrolled) {
            cursorHint.style.left = e.clientX + 'px';
            cursorHint.style.top = e.clientY + 'px';
            cursorHint.classList.add('visible');
        }
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            if (!hasScrolled) {
                hasScrolled = true;
                cursorHint.classList.remove('visible');
                document.body.style.cursor = 'auto'; // Restore default cursor
            }
        } else {
            hasScrolled = false;
            document.body.style.cursor = 'none';
        }
        updateScrollState();
    });

    // --- Tracking Logic ---
    const trackForm = document.getElementById('tracking-form');
    const trackInput = document.getElementById('tracking-input');
    const trackBtn = document.getElementById('track-btn');
    const errorMsg = document.getElementById('error-message');
    const resultsContainer = document.getElementById('tracking-results');

    // Force clear input on refresh/load
    trackInput.value = '';

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

    // --- Toast Notification ---
    const toastContainer = document.getElementById('toast-container');
    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i data-lucide="alert-circle"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    trackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = trackInput.value.trim();
        if (!id) return;

        trackBtn.innerText = "Tracking...";
        trackBtn.disabled = true;
        
        try {
            const response = await fetch(`/api/track/${id}`);
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
            resFuzzyStatus.innerText = data.prediction.displayStatus;
            resLocation.innerText = data.CurrentLocation;
            resWeather.innerText = data.WeatherCondition;
            resTraffic.innerText = data.TrafficCongestion;
            resDistance.innerText = `${data.DistanceRemaining} km`;

            // Build a complete journey timeline: Origin -> History -> Current -> Destination
            const history = [...data.HistoryEvents]; 
            const now = new Date();
            
            // Calculate Estimated Arrival Time
            const etaHours = data.prediction.etaHours || 0;
            const arrivalDate = new Date(now.getTime() + etaHours * 60 * 60 * 1000);
            const arrivalStr = arrivalDate.toLocaleString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
            });

            const originTime = history.length > 0 ? history[0].timestamp : "Just now";
            const currentTime = history.length > 0 ? history[history.length - 1].timestamp : "Just now";
            
            let timelineHtml = `
                <li class="timeline-origin">
                    <div class="time">${originTime}</div>
                    <div class="event">Package Registered</div>
                    <div class="loc">${data.Origin}</div>
                </li>
            `;
            
            timelineHtml += history.map(evt => `
                <li>
                    <div class="time">${evt.timestamp}</div>
                    <div class="event">${evt.event}</div>
                    <div class="loc">${evt.location}</div>
                </li>
            `).join('');
            
            timelineHtml += `
                <li class="timeline-current">
                    <div class="time">Arrived: ${currentTime}</div>
                    <div class="event">Current Status: ${data.Status}</div>
                    <div class="loc">${data.CurrentLocation}</div>
                </li>
            `;
            
            timelineHtml += `
                <li class="timeline-estimated">
                    <div class="time">${arrivalStr} (Estimated)</div>
                    <div class="event">Expected Arrival</div>
                    <div class="loc">${data.Destination}</div>
                </li>
            `;
            
            resHistory.innerHTML = timelineHtml;

            // Reset Lucide icons in the new elements
            if (window.lucide) window.lucide.createIcons();

            // UI Enhancements
            document.body.classList.add('results-active');
            document.body.classList.add('landed');
            
            // Show and scroll to results container
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('active');
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            showToast(err.message);
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
        // Just clear the input and UI state, don't move or hide results
        trackInput.value = '';
        clearBtn.classList.add('hidden');
        trackInput.classList.remove('has-content');
        errorMsg.classList.add('hidden');
        trackInput.focus();
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
        chatWindow.classList.remove('fullscreen');
    });

    const addMessage = (message, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        
        let formattedMsg = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        
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
    
    // Add global access to addMessage for the animation loop
    window.addBotMessage = (msg) => addMessage(msg, 'bot');

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
            
            if (data.trackingId) {
                currentTrackingId = data.trackingId;
                chatWindow.classList.add('fullscreen');
            }
            
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

    // Chatbot will only open on manual click or after a cinematic flight completion
});
