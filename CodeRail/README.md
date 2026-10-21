# CodeRail 🚀

AI-Powered Competitive Programming Coach and Problem Ladder Generator using Google Gemini.

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Key**:
   - Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Set your key in [`.env`](file:///.env):
     ```env
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     ```

3. **Run CodeRail**:
   - **Web UI (Minimalist & Clean)**:
     ```bash
     python server.py
     ```
     Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.
   
   - **Interactive CLI**:
     ```bash
     python main.py
     ```

## Dedicated Folder Organization (`.txt` Files)

All outputs are automatically saved as clean text files into separate folders:

- 📂 [`roadmaps/`](file:///c:/Users/SAMYAKK/Downloads/CodeRail/CodeRail/roadmaps): Curated topic roadmaps & problem ladders (e.g., `dp_roadmap_20260819_231205.txt`)
- 📂 [`problem_sets/`](file:///c:/Users/SAMYAKK/Downloads/CodeRail/CodeRail/problem_sets): Fetched Codeforces problem sets with direct URLs (e.g., `greedy_problems_20260819_231931.txt`)
- 📂 [`hints/`](file:///c:/Users/SAMYAKK/Downloads/CodeRail/CodeRail/hints): 3-tier progressive hints by problem ID (e.g., `1899A_hints.txt`)
- 📂 [`editorials/`](file:///c:/Users/SAMYAKK/Downloads/CodeRail/CodeRail/editorials): Deep-dive editorials, complexity analysis & solutions (e.g., `4A_editorial.txt`)
