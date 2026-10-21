import os
import random
from datetime import datetime
import requests
from dotenv import load_dotenv
from google import genai

# load the env file
load_dotenv()

# create folders if they dont exist
os.makedirs("roadmaps", exist_ok=True)
os.makedirs("problem_sets", exist_ok=True)
os.makedirs("hints", exist_ok=True)
os.makedirs("editorials", exist_ok=True)


def get_gemini():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("Error: Please set GEMINI_API_KEY in your .env file!")
        exit()
    return genai.Client(api_key=key)


def save_file(folder, filename, text):
    path = os.path.join(folder, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Saved file to:", path)


import json
import time

_CACHE_FILE = ".cf_cache.json"
_CACHE_EXPIRY = 7200  # 2 hours
_MEM_CACHE = None
_MEM_CACHE_TIME = 0


def fetch_all_codeforces_problems():
    global _MEM_CACHE, _MEM_CACHE_TIME
    now = time.time()

    # 1. In-memory cache
    if _MEM_CACHE and (now - _MEM_CACHE_TIME < _CACHE_EXPIRY):
        return _MEM_CACHE

    # 2. Disk cache
    if os.path.exists(_CACHE_FILE):
        try:
            mtime = os.path.getmtime(_CACHE_FILE)
            if now - mtime < _CACHE_EXPIRY:
                with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                    _MEM_CACHE = json.load(f)
                    _MEM_CACHE_TIME = mtime
                    return _MEM_CACHE
        except Exception:
            pass

    # 3. Codeforces API
    url = "https://codeforces.com/api/problemset.problems"
    try:
        print("Fetching problems from Codeforces API...")
        res = requests.get(url, timeout=12)
        data = res.json()
        if data.get("status") == "OK":
            problems = data["result"]["problems"]
            _MEM_CACHE = problems
            _MEM_CACHE_TIME = now
            try:
                with open(_CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(problems, f)
            except Exception:
                pass
            return problems
    except Exception as e:
        print(f"Warning: Codeforces fetch error: {e}")
        if os.path.exists(_CACHE_FILE):
            try:
                with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                    _MEM_CACHE = json.load(f)
                    return _MEM_CACHE
            except Exception:
                pass
    return []


def get_problems(tag, min_rating, max_rating, count):
    all_probs = fetch_all_codeforces_problems()
    if not all_probs:
        print("Failed to get problems from Codeforces")
        return []

    tag_clean = tag.strip().lower() if tag else ""
    filtered = []

    for p in all_probs:
        rating = p.get("rating")
        if rating and min_rating <= rating <= max_rating:
            p_tags = [t.lower() for t in p.get("tags", [])]
            if not tag_clean or tag_clean in p_tags or any(tag_clean in t for t in p_tags):
                contest = p.get("contestId")
                index = p.get("index")
                prob_data = {
                    "id": f"{contest}{index}",
                    "name": p.get("name"),
                    "rating": rating,
                    "tags": p.get("tags", []),
                    "url": f"https://codeforces.com/problemset/problem/{contest}/{index}"
                }
                filtered.append(prob_data)

    random.shuffle(filtered)
    filtered = filtered[:count]
    filtered.sort(key=lambda x: x["rating"])
    return filtered


def generate_with_gemini(client, prompt):
    preferred = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    candidates = [preferred, "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]
    seen = set()
    model_list = [m for m in candidates if not (m in seen or seen.add(m))]

    last_err = None
    for model_name in model_list:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            last_err = e
            print(f"Model '{model_name}' failed ({e}), trying fallback...")
            continue
    if last_err:
        raise last_err


import re

def clean_coach_text(text: str) -> str:
    """Strips robotic AI intros and conversational filler, ensuring output starts directly with friendly structured content."""
    if not text:
        return ""
    cleaned = text.strip()
    # Strip any introductory lines like "Here is a structured...", "Sure, here's...", "Below is..."
    cleaned = re.sub(
        r"^(?:Here\s+(?:is|are)|Here\'s|Sure,|Below\s+is|Certainly!|Welcome\s+to|In\s+this\s+roadmap)[^\n]*\n+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    # Remove leading horizontal divider lines
    cleaned = re.sub(r"^---\s*\n+", "", cleaned.strip())
    return cleaned.strip()


SYSTEM_COACH_INSTRUCTION = """You are CodeRail, a friendly, encouraging human peer coach and competitive programming mentor.
You talk like an experienced teammate who loves solving problems and helping others build genuine intuition.

CRITICAL RULES:
- NEVER start with robotic conversational filler like "Here is a structured practice roadmap...", "Sure, here are...", "Below is...", "As an AI...", "Certainly!", or "Welcome to your roadmap".
- Jump directly into your first section with a friendly heading.
- Speak in a warm, empowering, and direct tone (like an experienced friend explaining how they solved it over coffee).
- Structure the content cleanly with clear markdown headings (##, ###), bullet points, bold terms, and code blocks.
"""


def make_roadmap(client, topic, problems):
    text_list = ""
    for p in problems:
        tags_str = ", ".join(p.get("tags", []))
        text_list += f"- [{p.get('rating')}] {p.get('id')} - {p.get('name')} ({p.get('url')}) | Tags: {tags_str}\n"

    prompt = f"""{SYSTEM_COACH_INSTRUCTION}

We are preparing a practice game plan for mastering the '{topic}' pattern with this problem ladder:
{text_list}

Jump straight into the content. Do NOT include any introductory sentence like "Here is a roadmap...". Start directly with the first heading. Use this exact structure:

## 1. Core Mental Models
Explain the intuition behind {topic} simply. What is the fundamental observation you make when this pattern applies?

## 2. Recommended Solve Order & Why
For each problem in the ladder, write a 1-2 sentence warm tip on why to solve it at this step and what concept it reinforces.

## 3. Reusable Code Patterns
Show the clean snippet or mental template you keep in your head for {topic} problems.

## 4. Traps & Common Gotchas
What subtle bugs, off-by-one errors, or constraint traps cost people penalties in contests?
"""
    print("Generating roadmap...")
    raw = generate_with_gemini(client, prompt)
    return clean_coach_text(raw)


def get_hints(client, problem_id):
    prompt = f"""{SYSTEM_COACH_INSTRUCTION}

Provide 3 friendly progressive hints for Codeforces problem {problem_id} (url: https://codeforces.com/problemset):

Do not write any introductory sentence. Start directly with Hint 1. Use this format:

## Hint 1: The Observation
A gentle nudge. What happens when you test the smallest case or look at parity/invariants?

## Hint 2: The Core Mechanism
The algorithm and time complexity to aim for. Which data structure or invariant makes it efficient?

## Hint 3: The Blueprint Steps
High-level steps to implement it yourself without giving away complete code.
"""
    print("Generating hints...")
    raw = generate_with_gemini(client, prompt)
    return clean_coach_text(raw)


def get_editorial(client, problem_id, my_code=""):
    code_text = ""
    if my_code:
        code_text = f"\nHere is the student's attempt to review:\n```\n{my_code}\n```\nGive constructive feedback on this attempt.\n"

    prompt = f"""{SYSTEM_COACH_INSTRUCTION}

Give a friendly, crystal-clear editorial and solution breakdown for Codeforces problem {problem_id} (url: https://codeforces.com/problemset):
{code_text}

Do not write any introductory sentence. Start directly with the problem intuition. Use this structure:

## Problem Intuition
Explain what the problem is really asking in plain English.

## The Approach
How to derive the solution step-by-step with clear logic.

## Complexity
- **Time Complexity:** O(...) with quick explanation.
- **Space Complexity:** O(...) with quick explanation.

## Reference Implementations

### Python
```python
# clean, well-commented solution
```

### C++
```cpp
// clean, idiomatic modern C++ solution
```

## Common Traps & Edge Cases
What mistakes cause Wrong Answer on test 2 or TLE?
"""
    print("Generating editorial...")
    raw = generate_with_gemini(client, prompt)
    return clean_coach_text(raw)


def show_problems_table(problems):
    print("\n" + "-" * 60)
    print("#   Rating  Problem                             Link")
    print("-" * 60)
    for i, p in enumerate(problems, 1):
        name = p["name"]
        if len(name) > 30:
            name = name[:27] + "..."
        print(f"{i:<3} {p['rating']:<7} {name:<35} {p['url']}")
    print("-" * 60)


def main():
    client = get_gemini()

    while True:
        print("\n--- CodeRail ---")
        print("1. Make a Topic Roadmap")
        print("2. Search Codeforces Problems")
        print("3. Get Hints for a Problem")
        print("4. Get Problem Editorial / Solution")
        print("0. Exit")

        choice = input("\nEnter choice (0-4): ").strip()

        if choice == "0":
            print("Bye!")
            break

        elif choice == "1":
            topic = input("Enter topic (e.g. dp, math, greedy): ").strip()
            min_r_input = input("Enter min rating (default 1000): ").strip()
            min_r = int(min_r_input) if min_r_input.isdigit() else 1000

            max_r_input = input("Enter max rating (default 1600): ").strip()
            max_r = int(max_r_input) if max_r_input.isdigit() else 1600

            count_input = input("Enter number of problems (default 4): ").strip()
            count = int(count_input) if count_input.isdigit() else 4

            problems = get_problems(topic, min_r, max_r, count)
            if not problems:
                print("No problems found!")
                continue

            show_problems_table(problems)
            roadmap = make_roadmap(client, topic, problems)
            print("\n" + roadmap)

            time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{topic or 'general'}_roadmap_{time_str}.txt"

            save_text = f"ROADMAP FOR: {topic.upper()}\n"
            save_text += f"Rating: {min_r} to {max_r}\n\nPROBLEMS:\n"
            for i, p in enumerate(problems, 1):
                save_text += f"{i}. [{p['rating']}] {p['id']} - {p['name']}\n   URL: {p['url']}\n\n"
            save_text += f"\nROADMAP:\n\n{roadmap}\n"

            save_file("roadmaps", filename, save_text)

        elif choice == "2":
            topic = input("Enter topic (leave empty for all): ").strip()
            min_r_input = input("Enter min rating (default 800): ").strip()
            min_r = int(min_r_input) if min_r_input.isdigit() else 800

            max_r_input = input("Enter max rating (default 2000): ").strip()
            max_r = int(max_r_input) if max_r_input.isdigit() else 2000

            count_input = input("Enter count (default 10): ").strip()
            count = int(count_input) if count_input.isdigit() else 10

            problems = get_problems(topic, min_r, max_r, count)
            if not problems:
                print("No problems found!")
                continue

            show_problems_table(problems)

            time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{topic or 'all'}_problems_{time_str}.txt"

            save_text = f"PROBLEMS FOR: {topic.upper()}\nRating: {min_r}-{max_r}\n\n"
            for i, p in enumerate(problems, 1):
                save_text += f"{i}. {p['id']} - {p['name']} (Rating: {p['rating']})\n   URL: {p['url']}\n\n"

            save_file("problem_sets", filename, save_text)

        elif choice == "3":
            prob_id = input("Enter problem id (e.g. 1899A, 4A): ").strip().upper()
            hints = get_hints(client, prob_id)
            print("\n" + hints)

            filename = f"{prob_id}_hints.txt"
            save_text = f"HINTS FOR: {prob_id}\n\n{hints}\n"
            save_file("hints", filename, save_text)

        elif choice == "4":
            prob_id = input("Enter problem id (e.g. 1900B, 4A): ").strip().upper()
            print("Paste your code if you have any (press Enter to skip):")
            lines = []
            while True:
                line = input()
                if not line:
                    break
                lines.append(line)
            my_code = "\n".join(lines)

            editorial = get_editorial(client, prob_id, my_code)
            print("\n" + editorial)

            filename = f"{prob_id}_editorial.txt"
            save_text = f"EDITORIAL FOR: {prob_id}\n\n{editorial}\n"
            save_file("editorials", filename, save_text)

        else:
            print("Wrong option, please choose 0-4.")


if __name__ == "__main__":
    main()
