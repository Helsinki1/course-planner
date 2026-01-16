#!/usr/bin/env python3
"""
Parser for Barnard College course data - extracts courses missed by the original parser.
The original parser only matched section counts like "1" but not "1 section" or "6 sections".
"""

import re
import json


def parse_days(day_string: str) -> list[str]:
    """Convert day abbreviations to full day names."""
    day_map = {
        'Mo': 'Monday',
        'Tu': 'Tuesday',
        'We': 'Wednesday',
        'Th': 'Thursday',
        'Fr': 'Friday',
        'Sa': 'Saturday',
        'Su': 'Sunday'
    }
    
    days = []
    for abbrev, full in day_map.items():
        if abbrev in day_string:
            days.append(full)
    
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.sort(key=lambda d: day_order.index(d))
    
    return days


def parse_time_location_line(line: str) -> tuple[list[str], str, str]:
    """Parse a line containing day, time, and location."""
    time_pattern = r'(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)'
    time_match = re.search(time_pattern, line)
    
    if not time_match:
        return [], '', ''
    
    start_time = time_match.group(1)
    end_time = time_match.group(2)
    time_range = f"{start_time}-{end_time}"
    
    day_part = line[:time_match.start()].strip()
    days = parse_days(day_part)
    
    location = line[time_match.end():].strip()
    
    return days, time_range, location


def parse_barnard_courses_all(filepath: str) -> list[dict]:
    """Parse the Barnard courses text file and return ALL courses."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    courses = []
    
    # Course ID pattern for Barnard courses (e.g., AFEN3135BC, AFRS2005BC)
    course_id_pattern = r'^([A-Z]{4}\d{4}[A-Z]{0,2})$'
    # FIXED: Match both "1" and "1 section" or "6 sections"
    sections_pattern = r'^(\d+)(\s+sections?)?$'
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        course_id_match = re.match(course_id_pattern, line)
        
        if course_id_match and i > 0:
            course_id = course_id_match.group(1)
            
            # Course name is the previous non-empty line
            course_name = ''
            for j in range(i - 1, max(i - 5, -1), -1):
                if lines[j].strip() and not lines[j].strip().startswith(('Instructor', 'Fee', 'Session')):
                    course_name = lines[j].strip()
                    break
            
            # Next line should be section count
            i += 1
            if i >= len(lines):
                break
                
            sections_line = lines[i].strip()
            # FIXED: Accept both "1" and "1 section" formats
            if not re.match(sections_pattern, sections_line):
                i += 1
                continue
            
            # Parse description - everything until we hit the section header
            i += 1
            description_lines = []
            while i < len(lines):
                line = lines[i]
                if line.startswith('Section\t') or 'Call Number' in line:
                    break
                if line.strip():
                    description_lines.append(line.strip())
                i += 1
            
            description = ' '.join(description_lines).strip()
            
            # Skip the section header line
            i += 1
            
            # Parse sections
            times = []
            current_credits = 0
            
            while i < len(lines):
                line = lines[i].strip()
                
                # Check if we've hit a new course
                if re.match(course_id_pattern, line):
                    break
                
                # Check for section number
                section_match = re.match(r'^([A-Z]?\d{2,3})$', line)
                
                if section_match:
                    section_data = {
                        'days': [],
                        'time': '',
                        'professor': '',
                        'location': '',
                        'capacity': 0,
                        'enrollment': 0
                    }
                    
                    i += 1
                    section_end = False
                    
                    while i < len(lines) and not section_end:
                        section_line = lines[i]
                        stripped = section_line.strip()
                        
                        # Check for time/location pattern
                        if re.search(r'\d{1,2}:\d{2}[ap]m', stripped) and not stripped.startswith('Jan') and not stripped.startswith('Feb'):
                            days, time_range, location = parse_time_location_line(stripped)
                            if days and time_range:
                                if section_data['time'] and section_data['days']:
                                    if section_data['time']:
                                        times.append(section_data.copy())
                                    section_data = {
                                        'days': days,
                                        'time': time_range,
                                        'professor': section_data.get('professor', ''),
                                        'location': location,
                                        'capacity': 0,
                                        'enrollment': 0
                                    }
                                else:
                                    section_data['days'] = days
                                    section_data['time'] = time_range
                                    section_data['location'] = location
                        
                        # Check for enrollment pattern
                        enrollment_match = re.match(r'^(\d+)\s*/\s*(\d+)$', stripped)
                        if enrollment_match:
                            section_data['enrollment'] = int(enrollment_match.group(1))
                            section_data['capacity'] = int(enrollment_match.group(2))
                        
                        # Check for credits in the instruction/grading line
                        if 'Standard' in stripped or 'Pass/Fail' in stripped or 'Ungraded' in stripped:
                            # Look for credits - can be decimal like 2.5
                            credits_match = re.search(r'\b([1-6](?:\.\d)?)\s*$', stripped)
                            if credits_match:
                                current_credits = float(credits_match.group(1))
                        
                        # Check for instructor
                        if stripped.startswith('Instructor'):
                            i += 1
                            if i < len(lines):
                                instructor_line = lines[i].strip()
                                instructor_match = re.match(r'^(.+?)\s*\([^)]+\)', instructor_line)
                                if instructor_match:
                                    section_data['professor'] = instructor_match.group(1).strip()
                        
                        # Check if we've hit a new section or course
                        if re.match(r'^[A-Z]?\d{2,3}$', stripped):
                            section_end = True
                            i -= 1
                            break
                        
                        if re.match(course_id_pattern, stripped):
                            section_end = True
                            i -= 1
                            break
                        
                        # Check for new course name pattern
                        if i + 1 < len(lines):
                            next_line = lines[i + 1].strip()
                            if re.match(course_id_pattern, next_line) and not stripped.startswith(('Instructor', 'Fee', 'Session', 'Department', 'School', 'Subject', 'Class Identifier')):
                                if stripped and not re.search(r'\d{1,2}:\d{2}[ap]m', stripped) and 'primary' not in stripped:
                                    section_end = True
                                    i -= 1
                                    break
                        
                        i += 1
                    
                    if section_data['time'] or section_data['professor']:
                        times.append(section_data)
                else:
                    i += 1
            
            # Create course entry
            if course_name and course_id:
                course = {
                    'id': course_id,
                    'name': course_name,
                    'description': description,
                    'credits': int(current_credits) if current_credits == int(current_credits) else current_credits,
                    'times': times,
                    'school': 'Barnard College'
                }
                courses.append(course)
        else:
            i += 1
    
    return courses


def main():
    input_file = 'web-scraping/scraped-courses/barnard-courses.txt'
    existing_file = 'barnard-courses.json'
    output_file = 'barnard-courses-2.json'
    
    print(f"Parsing {input_file}...")
    all_courses = parse_barnard_courses_all(input_file)
    print(f"Found {len(all_courses)} total courses")
    
    # Load existing courses
    with open(existing_file, 'r', encoding='utf-8') as f:
        existing_courses = json.load(f)
    
    existing_ids = {c['id'] for c in existing_courses}
    print(f"Existing courses in {existing_file}: {len(existing_ids)}")
    
    # Filter to only new courses
    new_courses = [c for c in all_courses if c['id'] not in existing_ids]
    print(f"New courses to add: {len(new_courses)}")
    
    # Save new courses
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_courses, f, indent=2, ensure_ascii=False)
    
    print(f"Output written to {output_file}")
    
    if new_courses:
        print("\nSample new course:")
        print(json.dumps(new_courses[0], indent=2))


if __name__ == '__main__':
    main()

