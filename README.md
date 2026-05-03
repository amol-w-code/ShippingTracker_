# NexTrack AI 🚀
### *Logistics Reimagined through AI-Driven Scrollytelling*

NexTrack AI is a premium, interactive logistics platform that transforms the boring process of "checking a status" into a visual story. It uses a **Scrollytelling Engine** (HTML5 Canvas) to animate a package’s journey and provides hyper-accurate delivery estimates using a dual-layer AI system.

**Render Link:** [https://shippingtracker.onrender.com/](https://shippingtracker.onrender.com/)

---

## 🌟 Project Overview
*   **What it does**: NexTrack AI visualizes delivery journeys in real-time. It doesn't just show a status; it tells a story of the package moving across cities, factoring in environmental challenges.
*   **Problem it solves**: Traditional tracking apps provide static, often inaccurate data. NexTrack solves this by visualizing the route and using real-time factors (Weather & Traffic) to predict delays that standard systems miss.
*   **Target users**: E-commerce businesses, logistics managers, and tech-savvy consumers who want transparency and a premium tracking experience.

## ✨ Key Features
- **Dynamic Scrollytelling Interface:** An engaging frontend that reveals step-by-step features as the user scrolls, culminating in an interactive tracking dashboard.
- **Dual AI Predictive Engine:** 
    - **Machine Learning**: Uses Random Forest Regression for historical data analysis.
    - **Fuzzy Logic**: A heuristic fallback engine for complex reasoning about weather and traffic delays.
- **Intelligent Groq-Powered Chatbot:** A conversational AI (Llama 3.3) that understands the context of your specific shipment and can answer complex questions about logistics statistics.
- **Real-time Tracking Dashboard:** Displays the current location, weather, traffic, remaining distance, and a full timeline history of the package journey.

## 🛠️ Technology Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Premium Glassmorphism & Responsive Design).
- **Backend**: Python (Flask Framework), `python-dotenv`.
- **AI & Machine Learning**: 
    - **LLM**: Groq Cloud API (Llama 3.3-70B).
    - **Predictive ML**: Scikit-Learn (Random Forest Regression).
    - **Heuristic AI**: Scikit-Fuzzy (Fuzzy Logic).
- **Data Source**: Amazon Delivery Dataset (1M+ records) & local JSON shipment mappings.

## 🏗️ Overall Architecture
The project follows a **Client-Server Architecture**:
1.  **Client**: A Single Page Application (SPA) that handles the Canvas animation and user interactions.
2.  **Server**: A Flask API that processes tracking requests, runs AI predictions, and interfaces with the Groq API for chatbot responses.
3.  **Data Flow**: `User Input` → `Flask API` → `Dual AI Prediction` → `JSON Response` → `Canvas Animation & Dashboard Rendering`.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Groq API Key (Sign up at [console.groq.com](https://console.groq.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amol-w-code/ShippingTracker_.git
   cd AI-Essentials
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your API Key:
   Create a `.env` file in the root directory and add your key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. Start the application:
   ```bash
   python app.py
   ```

6. Open `http://127.0.0.1:3000` in your browser.

## 📦 How to Use
1. Scroll down to experience the interactive scrollytelling animation.
2. Enter a sample Tracking ID (e.g., `SHP12345`, `SHP22222`) and click **Track Package**.
3. Interact with the **NexTrack AI Assistant** in the bottom right corner to ask about your package or general delivery statistics.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

---
*Created with ❤️ by the NexTrack Team at Lovely Professional University, Punjab.*
