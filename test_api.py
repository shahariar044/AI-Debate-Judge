import httpx
import asyncio
import os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8005/api")

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{API_BASE_URL}/analyze-debate", json={
            "topic": "AI in exams",
            "for_argument": "AI tools improve student learning.",
            "against_argument": "AI tools reduce student learning.",
            "provider": "gemini"
        }, timeout=120)
        print("Gemini result:", res.status_code, res.json())
        
        res = await client.post(f"{API_BASE_URL}/analyze-debate", json={
            "topic": "AI in exams",
            "for_argument": "AI tools improve student learning.",
            "against_argument": "AI tools reduce student learning.",
            "provider": "groq"
        }, timeout=120)
        print("Groq result:", res.status_code, res.json())

asyncio.run(test())
