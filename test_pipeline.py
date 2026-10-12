import urllib.request, json, os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8005/api")

payload = json.dumps({
    "topic": "AI tools should be allowed in university exams in Bangladesh",
    "for_argument": "Allowing AI tools in university exams will better prepare graduates for the digital economy. Companies like BJIT and Pathao need AI-literate workers. Students using AI tools produce 40% more comprehensive work according to MIT research. This levels the playing field for rural students who lack access to premium coaching centers.",
    "against_argument": "AI tools in exams undermine academic integrity and make grades meaningless as measures of competence. Students must demonstrate independent thinking. In medicine and law, practitioners cannot rely on AI in emergencies. Expensive AI subscriptions will disadvantage poor students, creating new inequalities in Bangladeshi education."
}).encode()

req = urllib.request.Request(
    f"{API_BASE_URL}/analyze-debate",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
r = urllib.request.urlopen(req, timeout=180)
data = json.loads(r.read())
print("Result ID:", data["id"])
print("Status:", data["status"])

r2 = urllib.request.urlopen(f"{API_BASE_URL}/results/" + data["id"], timeout=30)
full = json.loads(r2.read())
print("Winner:", full["explanation"]["winner"])
print("FOR score:", full["for_score"]["score"])
print("AGAINST score:", full["against_score"]["score"])
print("FOR fallacies:", len(full["for_fallacies"]))
print("AGAINST fallacies:", len(full["against_fallacies"]))
print("FOR causal chains:", len(full["for_causal"]["causal_chains"]))
print("Graph nodes (FOR):", len(full["causal_graph_for"]["nodes"]))
print("Improvements:", len(full["explanation"]["improvements"]))
print("Counterfactual:", full["explanation"]["counterfactual"][:120])
print("SUCCESS - Full pipeline working!")
