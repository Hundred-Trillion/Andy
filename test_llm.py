from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://localhost:8080/v1",
    api_key="empty",
    model="qwen9b",
    temperature=0.2,
    max_tokens=2000,
)

resp = llm.invoke("You are a CAD engineer. Reply with ONLY valid JSON representing a single box. Format: [{\"id\": \"part1\", \"type\": \"box\", \"parameters\": {\"length\": 10, \"width\": 10, \"height\": 10}, \"position\": [0,0,0], \"rotation\": [0,0,0]}]")
print("RAW CONTENT:", repr(resp.content))
