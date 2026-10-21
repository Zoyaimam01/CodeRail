import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

# Import core business logic from main.py
import main

load_dotenv()

app = Flask(__name__, static_folder="static")

# Ensure all output directories exist
os.makedirs("roadmaps", exist_ok=True)
os.makedirs("problem_sets", exist_ok=True)
os.makedirs("hints", exist_ok=True)
os.makedirs("editorials", exist_ok=True)

# Lazy client initialization
_gemini_client = None

def get_client():
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = main.get_gemini()
    return _gemini_client


@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
    return response


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    static_file_path = os.path.join("static", path)
    if os.path.exists(static_file_path):
        return send_from_directory("static", path)
    return jsonify({"status": "error", "message": "Not found"}), 404


@app.route("/api/problems", methods=["GET"])
def api_problems():
    try:
        tag = request.args.get("tag", "").strip()
        min_r = int(request.args.get("min_rating", 800))
        max_r = int(request.args.get("max_rating", 2000))
        count = int(request.args.get("count", 10))

        problems = main.get_problems(tag, min_r, max_r, count)

        # Save problem set if requested or non-empty
        if problems and request.args.get("save", "true").lower() == "true":
            time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{tag or 'all'}_problems_{time_str}.txt"
            save_text = f"PROBLEMS FOR: {(tag or 'ALL').upper()}\nRating: {min_r}-{max_r}\n\n"
            for i, p in enumerate(problems, 1):
                save_text += f"{i}. {p['id']} - {p['name']} (Rating: {p['rating']})\n   URL: {p['url']}\n\n"
            main.save_file("problem_sets", filename, save_text)

        return jsonify({"status": "ok", "problems": problems})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/roadmap", methods=["POST"])
@app.route("/api/roadmaps", methods=["POST"])
def api_roadmap():
    try:
        data = request.get_json(force=True)
        topic = data.get("topic", "dp").strip()
        min_r = int(data.get("min_rating", 1000))
        max_r = int(data.get("max_rating", 1600))
        count = int(data.get("count", 4))

        problems = data.get("problems")
        if not problems or not isinstance(problems, list):
            problems = main.get_problems(topic, min_r, max_r, count)

        if not problems:
            return jsonify({"status": "error", "message": f"No problems found for tag '{topic}' with rating {min_r}-{max_r}"}), 404

        client = get_client()
        roadmap = main.make_roadmap(client, topic, problems)

        # Save to roadmaps folder
        time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{topic or 'general'}_roadmap_{time_str}.txt"
        save_text = f"ROADMAP FOR: {topic.upper()}\nRating: {min_r} to {max_r}\n\nPROBLEMS:\n"
        for i, p in enumerate(problems, 1):
            save_text += f"{i}. [{p.get('rating')}] {p.get('id')} - {p.get('name')}\n   URL: {p.get('url')}\n\n"
        save_text += f"\nROADMAP:\n\n{roadmap}\n"
        main.save_file("roadmaps", filename, save_text)

        return jsonify({
            "status": "ok",
            "topic": topic,
            "problems": problems,
            "roadmap": roadmap,
            "saved_file": filename
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/hints", methods=["POST"])
def api_hints():
    try:
        data = request.get_json(force=True)
        problem_id = data.get("problem_id", "").strip().upper()
        if not problem_id:
            return jsonify({"status": "error", "message": "Problem ID is required"}), 400

        client = get_client()
        hints = main.get_hints(client, problem_id)

        filename = f"{problem_id}_hints.txt"
        save_text = f"HINTS FOR: {problem_id}\n\n{hints}\n"
        main.save_file("hints", filename, save_text)

        return jsonify({
            "status": "ok",
            "problem_id": problem_id,
            "hints": hints,
            "saved_file": filename
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/editorial", methods=["POST"])
@app.route("/api/editorials", methods=["POST"])
def api_editorial():
    try:
        data = request.get_json(force=True)
        problem_id = data.get("problem_id", "").strip().upper()
        my_code = data.get("my_code", "")

        if not problem_id:
            return jsonify({"status": "error", "message": "Problem ID is required"}), 400

        client = get_client()
        editorial = main.get_editorial(client, problem_id, my_code)

        filename = f"{problem_id}_editorial.txt"
        save_text = f"EDITORIAL FOR: {problem_id}\n\n{editorial}\n"
        main.save_file("editorials", filename, save_text)

        return jsonify({
            "status": "ok",
            "problem_id": problem_id,
            "editorial": editorial,
            "saved_file": filename
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def api_history():
    folders = ["roadmaps", "problem_sets", "hints", "editorials"]
    history = {}
    for folder in folders:
        files = []
        if os.path.exists(folder):
            for fname in sorted(os.listdir(folder), reverse=True):
                if fname.endswith(".txt") or fname.endswith(".pdf"):
                    fpath = os.path.join(folder, fname)
                    size = os.path.getsize(fpath)
                    mtime = datetime.fromtimestamp(os.path.getmtime(fpath)).strftime("%Y-%m-%d %H:%M:%S")
                    files.append({
                        "filename": fname,
                        "size": size,
                        "modified": mtime,
                        "folder": folder
                    })
        history[folder] = files
    return jsonify({"status": "ok", "history": history})


@app.route("/api/file-content", methods=["GET"])
def api_file_content():
    folder = request.args.get("folder", "").strip()
    filename = request.args.get("filename", "").strip()

    allowed_folders = ["roadmaps", "problem_sets", "hints", "editorials"]
    if folder not in allowed_folders:
        return jsonify({"status": "error", "message": "Invalid folder"}), 400

    # sanitize filename
    safe_name = os.path.basename(filename)
    path = os.path.join(folder, safe_name)

    if not os.path.exists(path):
        return jsonify({"status": "error", "message": "File not found"}), 404

    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return jsonify({"status": "ok", "filename": safe_name, "content": content})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"CodeRail Web Interface starting on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
