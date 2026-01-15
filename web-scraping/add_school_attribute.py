import json

# Define the files and their corresponding school names
files_and_schools = [
    ("barnard-courses.json", "Barnard College"),
    ("cc-courses.json", "Columbia College"),
    ("seas-courses.json", "School of Engineering and Applied Sciences (SEAS)")
]

for filename, school in files_and_schools:
    # Read the JSON file
    with open(filename, 'r', encoding='utf-8') as f:
        courses = json.load(f)
    
    # Add the "school" attribute to each course
    for course in courses:
        course["school"] = school
    
    # Write back to the file
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    
    print(f"Updated {filename} with school='{school}' - {len(courses)} courses modified")

print("\nDone! All files have been updated.")

