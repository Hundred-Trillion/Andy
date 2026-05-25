import asyncio
from app.cad.generator import generate_cad
from app.cad.exporter import export_model

async def test_generation():
    components = [
        {
            "id": "part_1",
            "type": "create_tube",
            "parameters": {"outer_diameter": 50, "inner_diameter": 44, "length": 200},
            "position": [0, 0, 0],
            "rotation": [0, 0, 0]
        },
        {
            "id": "part_2",
            "type": "create_nose_cone",
            "parameters": {"diameter": 50, "length": 100, "shape": "conical"},
            "position": [0, 0, 200],
            "rotation": [0, 0, 0]
        }
    ]
    try:
        result, metadata = generate_cad(components)
        export_model(result, "test_rocket")
        print("SUCCESS! Metadata:", metadata)
        print("Components mutated:", components)
    except Exception as e:
        print("ERROR:", str(e))

if __name__ == "__main__":
    asyncio.run(test_generation())
