# NexTrack AI 🚀

NexTrack AI is a modern, interactive delivery tracking application built with a Flask backend and a dynamic scrollytelling frontend. It utilizes Fuzzy Logic AI to predict hyper-accurate delivery windows based on real-time factors like weather and traffic congestion.

## ✨ Key Features

- **Dynamic Scrollytelling Interface:** An engaging frontend that reveals step-by-step features as the user scrolls, culminating in an interactive tracking dashboard. Features a smooth, continuous background animation.
- **Fuzzy Logic Predictive Engine:** Instead of static ETAs, the system uses the `scikit-fuzzy` library to dynamically calculate delivery delays based on origin/destination, weather, and traffic conditions.
- **Interactive Chatbot Assistant:** A built-in virtual assistant that understands heuristic intents. Users can ask questions like "Where is my package?" or "What is the ETA?" and the bot will respond contextually based on their active Tracking ID.
- **Real-time Tracking Dashboard:** Displays the current location, weather, traffic, remaining distance, and a full timeline history of the package journey.

## 🛠️ Technology Stack

- **Backend:** Python, Flask
- **AI/Logic:** `numpy`, `scikit-fuzzy`
- **Frontend:** HTML5, Vanilla JavaScript, CSS3
- **Icons:** Lucide Icons
- **Data Source:** JSON-based local dataset mapped to Indian cities

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Pip package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd ShippingTracker
   ```

2. (Optional but recommended) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the Flask application:
   ```bash
   python app.py
   ```

5. Open your web browser and navigate to:
   ```
   http://127.0.0.1:3000
   ```

## 📦 How to Use

1. Scroll down the homepage to experience the interactive scrollytelling animation.
2. At the "Ready to Track?" section, enter a sample Tracking ID (e.g., `SHP12345`, `SHP22222`, or `SHP55555`) and click **Track Package**.
3. View the AI-calculated ETA, current conditions, and journey timeline.
4. Click the floating chat icon in the bottom right corner to interact with the AI tracking assistant about your specific package.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

Render Link-
https://shippingtracker.onrender.com/
