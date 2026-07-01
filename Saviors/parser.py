import json
import re
from pathlib import Path

INPUT = "ALL.txt"
OUTPUT = "items.json"

# -------------------------
# typo fixer
# -------------------------

FIX = {
    "Sx": "5x",
    "sx": "5x"
}

# -------------------------

with open(INPUT, encoding="utf8") as f:
    raw = [x.strip() for x in f.readlines()]

lines = []

for line in raw:

    if not line:
        continue

    for a,b in FIX.items():
        line=line.replace(a,b)

    lines.append(line)

items = {}

i=0

def is_weight(txt):

    return bool(re.match(r"^[0-9.]+\s*(kg|g)$",txt,re.I))

def is_time(txt):

    return bool(re.match(r"^[0-9]+\s*s$",txt,re.I))

def is_material(txt):

    return bool(re.match(r"^[0-9]+\s*x\s+",txt,re.I))

while i<len(lines):

    name=lines[i]

    if i+1>=len(lines):
        break

    if lines[i+1]!="Recipe":
        i+=1
        continue

    i+=2

    weight=""
    description=""
    craft_time=""
    materials=[]

    if i<len(lines) and is_weight(lines[i]):
        weight=lines[i]
        i+=1

    if i<len(lines):

        if is_time(lines[i]):

            craft_time=lines[i]
            i+=1

        else:

            description=lines[i]
            i+=1

            if i<len(lines) and is_time(lines[i]):

                craft_time=lines[i]
                i+=1

    while i<len(lines):

        txt=lines[i]

        if is_material(txt):

            m=re.match(r"^([0-9]+)\s*x\s+(.+)$",txt)

            qty=int(m.group(1))

            item=m.group(2)

            materials.append({

                "item":item,

                "qty":qty

            })

            i+=1

            continue

        if txt=="Recipe":
            break

        if not is_material(txt):
            break

    recipe={

        "time":craft_time,

        "materials":materials

    }

    if name not in items:

        items[name]={

            "id":len(items)+1,

            "name":name,

            "weight":weight,

            "description":description,

            "recipes":[recipe]

        }

    else:

        if weight and not items[name]["weight"]:
            items[name]["weight"]=weight

        if description and not items[name]["description"]:
            items[name]["description"]=description

        items[name]["recipes"].append(recipe)

data=list(items.values())

Path(OUTPUT).write_text(

    json.dumps(data,indent=4,ensure_ascii=False),

    encoding="utf8"

)

print()

print("="*50)

print("PROJECT ZERO PARSER V2")

print("="*50)

print()

print(f"Items : {len(data)}")

print(f"Export : {OUTPUT}")

print()

multi=[]

for x in data:

    if len(x["recipes"])>1:

        multi.append(x["name"])

if multi:

    print("Multiple Recipes")

    for x in multi:

        print(" -",x)

print()

print("Done.")