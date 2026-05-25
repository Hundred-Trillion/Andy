import cadquery as cq

try:
    box = cq.Workplane("XY").box(10, 10, 10)
    print(dir(box.val()))
    print("Does exportStl exist?", hasattr(box.val(), 'exportStl'))
except Exception as e:
    print("Error:", e)
