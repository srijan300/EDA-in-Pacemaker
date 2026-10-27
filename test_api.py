import urllib.request
import urllib.error
import json

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=YOUR_API_KEY"

payload = {
    "systemInstruction": {
        "parts": [{"text": "Hello"}]
    },
    "tools": [
        {
            "functionDeclarations": [
                {
                    "name": "get_heart_rate_data",
                    "description": "Get data",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "days": {
                                "type": "INTEGER",
                                "description": "days"
                            }
                        }
                    }
                }
            ]
        }
    ],
    "contents": [
        {"role": "user", "parts": [{"text": "What is my heart rate data?"}]}
    ]
}

req = urllib.request.Request(
    GEMINI_URL,
    data=json.dumps(payload).encode("utf-8"),
    method="POST",
    headers={"content-type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("SUCCESS")
        print(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("ERROR", e.code)
    print(e.read().decode("utf-8"))
except Exception as e:
    print("OTHER ERROR", e)
