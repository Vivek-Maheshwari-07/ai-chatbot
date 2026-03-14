from flask import Flask, render_template, request, jsonify
from chatbot import get_gemini_response

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("command", "")
    
    if not user_message:
        return jsonify({"response": "I didn't receive any message."})
        
    bot_response = get_gemini_response(user_message)
    return jsonify({"response": bot_response})

if __name__ == "__main__":
    print("Starting AI Assistant Web Server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
