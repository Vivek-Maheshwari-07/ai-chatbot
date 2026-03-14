import os
import traceback
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Strip whitespace/carriage returns — guards against Windows-style \r\n in .env
GEMINI_API_KEY = (os.getenv("GOOGLE_API_KEY") or "").strip()

# ---------------------------------------------------------------------------
# Preferred models in priority order.
# Matches your confirmed-working list from test_output.txt.
# ---------------------------------------------------------------------------
PREFERRED_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
]

SYSTEM_PROMPT = (
    "You are a helpful, friendly, and concise personal AI assistant. "
    "You answer general questions, hold normal conversations, "
    "and assist with basic information clearly."
)

model = None

try:
    if not GEMINI_API_KEY:
        print("WARNING: GOOGLE_API_KEY not found or empty in environment / .env file.")
    else:
        genai.configure(api_key=GEMINI_API_KEY)

        # Build a list of available model names
        available = [
            m.name for m in genai.list_models()
            if "generateContent" in m.supported_generation_methods
        ]
        print(f"Available models ({len(available)}): {available[:6]} ...")

        # Pick the highest-priority available model
        selected = None
        for preferred in PREFERRED_MODELS:
            match = next((m for m in available if preferred in m), None)
            if match:
                selected = match
                break
        if not selected and available:
            selected = available[0]   # last-resort fallback

        if selected:
            # ----------------------------------------------------------------
            # BUG FIX 1 — system_instruction was added in v0.5.0.
            # On v0.4.0 passing it to GenerativeModel raises TypeError,
            # the except block silently sets model=None, and every chat
            # call returns the generic error message.
            #
            # Fix: skip system_instruction in the constructor entirely.
            # Inject the system prompt as the first conversation turn instead
            # (see get_gemini_response). This works on ALL library versions.
            # ----------------------------------------------------------------
            model = genai.GenerativeModel(model_name=selected)
            print(f"Gemini model configured successfully: {selected}")
        else:
            print("WARNING: No suitable Gemini model found. Check your API key.")

except Exception as e:
    print(f"ERROR initialising Gemini: {e}")
    traceback.print_exc()
    model = None


def get_gemini_response(user_message: str) -> str:
    """Send a message to Gemini and return the text reply."""

    if not GEMINI_API_KEY:
        return "Please set your GOOGLE_API_KEY in the .env file."

    if model is None:
        return (
            "The AI model is not configured correctly. "
            "Check your API key and restart the server."
        )

    if not user_message or not user_message.strip():
        return "I didn't receive any message."

    try:
        # ----------------------------------------------------------------
        # BUG FIX 2 — system_instruction workaround.
        # Inject the system persona as the opening exchange in chat history.
        # This is fully compatible with google-generativeai 0.4.0+.
        # ----------------------------------------------------------------
        chat = model.start_chat(history=[
            {
                "role": "user",
                "parts": [SYSTEM_PROMPT],
            },
            {
                "role": "model",
                "parts": ["Understood! I'm ready to help as your personal AI assistant."],
            },
        ])

        response = chat.send_message(user_message)

        # ----------------------------------------------------------------
        # BUG FIX 3 — response.text is a convenience property added in
        # v0.5.x. On v0.4.0 it may not exist or may raise AttributeError.
        #
        # Fix: try response.text first, fall back to the raw accessor path
        # that works on every version of the library.
        # ----------------------------------------------------------------
        if hasattr(response, "text") and response.text:
            return response.text

        # Fallback: traverse candidates → parts manually
        return response.candidates[0].content.parts[0].text

    except Exception as e:
        # ----------------------------------------------------------------
        # BUG FIX 4 — always print the full exception + traceback so the
        # real error is visible in the terminal during development.
        # ----------------------------------------------------------------
        print(f"[Gemini ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        return (
            "I'm sorry, I encountered an error generating a response. "
            "Check the terminal for details."
        )