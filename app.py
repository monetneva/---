from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from supabase import create_client, Client
import os
import requests


app = Flask(__name__)

# -----------------------------
# OpenAI Setup
# -----------------------------
openai_client = OpenAI(
    api_key= "-"
)

# -----------------------------
# Supabase Setup
# -----------------------------
SUPABASE_URL = "-"  
SUPABASE_KEY = "-"           

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -----------------------------
# ROUTES
# -----------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/fun_facts')
def fun_facts():
    return render_template('fun_facts.html')

@app.route('/vocab')
def vocab():
    return render_template('vocab.html')

@app.route('/discussion')
def discussion():
    return render_template('discussion.html')

@app.route('/similar_titles')
def similar_titles():
    return render_template('similar_titles.html')

@app.route('/avatar')
def avatar():
    return render_template('avatar.html')


# -----------------------------
# AI CONTENT GENERATION
# -----------------------------

@app.route('/generate_content', methods=['POST'])
def generate_content():
    data = request.get_json()
    title = data.get('title', '')
    chapter = data.get('chapter', '')

    if not title or not chapter:
        return jsonify({"error": "Missing title or chapter"}), 400

    try:
        # Generate English Content
        prompt_en = (
            f"For the book '{title}', chapter '{chapter}', create classroom-friendly educational content.\n\n"
            "Please generate the following sections clearly and connect with TEKS:\n"
            "- ABOUT: (Synopsos and theme, Short paragraph connecting the chapter's main idea to the real-world context. Build background knowledge.)\n"
            "- FUN FACTS: (Four or more interesting facts, starting each fact with '-' that help students understand deeper themes or hidden details, or just interesting factoids that will keep them engaged).\n"
            "- VOCAB: (Eight or more important words from the chapter. Include the word, definition, and explain any useful roots/prefixes/suffixes. Format each like 'Word: Definition (noun/verd/adj/etc).' dont number just list them)\n"
            "- DISCUSSION: (Five or more thoughtful questions  to engage/asl students. Focus on comprehension, language exploration, and making personal connections, numbered.)\n\n"
            "- SIMILAR TITLES: (List three to five book titles that are similar to this book, each with the published date, author, genre, a short synopsis and why it connects to the current book. Please include everything)\n\n"
            "Use these exact clear section headings: ABOUT, FUN FACTS, VOCAB, DISCUSSION.\n"
            "Keep the language simple and supportive like a Scholastic teacher resource guide. Don't leave out any parts of the prompt."
        )

        completion_en = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt_en}],
            temperature=0.4
        )
        content_en = completion_en.choices[0].message.content
        print("\n=== ENGLISH GENERATED ===\n", content_en)

        # Generate Spanish
        prompt_es = (
            f"Translate the following educational content into Spanish. "
            "⚡IMPORTANT: Keep the exact English section headings in Spanish — "
            "Use ACERCA DE, DATOS DIVERTIDOS, VOCABULARIO, DISCUSIÓN, and TÍTULOS SIMILARES exactly — "
            "and keep the formatting (like bullets, numbers, colons) intact!\n\n"
            f"{content_en}"
        )   


        completion_es = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt_es}],
            temperature=0.4
        )
        content_es = completion_es.choices[0].message.content
        print("\n=== SPANISH GENERATED ===\n", content_es)

        return jsonify({
            "content_en": content_en,
            "content_es": content_es
        })

    except Exception as e:
        print(f"\nERROR during content generation: {e}\n")
        return jsonify({"error": str(e)}), 500

# -----------------------------
# SUPABASE LOGGING
# -----------------------------

@app.route('/log_action', methods=['POST'])
def log_action():
    data = request.get_json()

    action_type = data.get('type')
    timestamp = data.get('timestamp')
    student_id = data.get('student_id', 'demo-student')  # fallback if no student_id passed

    try:
        supabase.table('student_actions').insert({
            "type": action_type,
            "timestamp": timestamp,
            "student_id": student_id
        }).execute()
        
        return jsonify({"status": "success"}), 200

    except Exception as e:
        print("Error logging action:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# -----------------------------
# MAIN RUN
# -----------------------------

if __name__ == '__main__':
    app.run(debug=True)

