#!/usr/bin/env python3
"""
Parser for SEAS course data scraped from Columbia University website.
Converts text file into structured JSON format.
"""

import re
import json
from typing import Optional


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
    # Find all day abbreviations in the string
    for abbrev, full in day_map.items():
        if abbrev in day_string:
            days.append(full)
    
    # Sort days by weekday order
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.sort(key=lambda d: day_order.index(d))
    
    return days


def parse_time_location_line(line: str) -> tuple[list[str], str, str]:
    """
    Parse a line containing day, time, and location.
    Examples:
        "Tu 4:10pm - 6:40pm415 SCHAPIRO CEPSER"
        "Mo We 11:40am - 12:55pm310 FAYERWEATHER"
    Returns: (days, time_range, location)
    """
    # Pattern to match days, time, and location
    # Days: Mo, Tu, We, Th, Fr, Sa, Su (can be multiple)
    # Time: HH:MMam/pm - HH:MMam/pm
    # Location: everything after
    
    time_pattern = r'(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)'
    time_match = re.search(time_pattern, line)
    
    if not time_match:
        return [], '', ''
    
    # Extract time
    start_time = time_match.group(1)
    end_time = time_match.group(2)
    time_range = f"{start_time}-{end_time}"
    
    # Everything before the time is days
    day_part = line[:time_match.start()].strip()
    days = parse_days(day_part)
    
    # Everything after the time is location
    location = line[time_match.end():].strip()
    
    return days, time_range, location


def parse_enrollment(enrollment_str: str) -> tuple[int, int]:
    """Parse enrollment string like '14 / 40' into (enrolled, capacity)."""
    match = re.search(r'(\d+)\s*/\s*(\d+)', enrollment_str)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 0, 0


def parse_credits(credits_str: str) -> int:
    """Parse credits string. May be '3' or '1 to 3' - return max value."""
    credits_str = credits_str.strip()
    # Handle range like "1 to 3"
    range_match = re.search(r'(\d+)\s+to\s+(\d+)', credits_str)
    if range_match:
        return int(range_match.group(2))  # Return max credits
    # Handle single number
    single_match = re.search(r'(\d+)', credits_str)
    if single_match:
        return int(single_match.group(1))
    return 0


def parse_seas_courses(filepath: str) -> list[dict]:
    """Parse the SEAS courses text file and return structured data."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    courses = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for course ID pattern (e.g., AERO4101E, COMS3157W, APMA2001E)
        # Course IDs typically follow a course name and precede "N section(s)"
        course_id_pattern = r'^([A-Z]{4}\d{4}[A-Z]?)$'
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
            sections_match = re.match(r'^(\d+)\s+sections?$', sections_line)
            
            if not sections_match:
                continue
            
            # Parse description - everything until we hit the section header
            i += 1
            description_lines = []
            while i < len(lines):
                line = lines[i]
                # Section header starts with "Section\tTitle\tCall Number..."
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
                
                # Check if we've hit a new course (another course ID pattern)
                if re.match(course_id_pattern, line):
                    break
                
                # Check for section number (001, 002, R01, V01, C01, etc.)
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
                    
                    # Parse the section details
                    i += 1
                    section_end = False
                    in_details = False
                    
                    while i < len(lines) and not section_end:
                        section_line = lines[i]
                        stripped = section_line.strip()
                        
                        # Check for time/location pattern
                        if re.search(r'\d{1,2}:\d{2}[ap]m', stripped) and not stripped.startswith('Jan') and not stripped.startswith('Feb'):
                            days, time_range, location = parse_time_location_line(stripped)
                            if days and time_range:
                                # If we already have time info, this might be a second meeting time
                                if section_data['time'] and section_data['days']:
                                    # Add the previous section data and start new
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
                        
                        # Check for enrollment pattern "X / Y"
                        enrollment_match = re.match(r'^(\d+)\s*/\s*(\d+)$', stripped)
                        if enrollment_match:
                            enrolled, capacity = int(enrollment_match.group(1)), int(enrollment_match.group(2))
                            section_data['enrollment'] = enrolled
                            section_data['capacity'] = capacity
                        
                        # Check for credits pattern
                        credits_match = re.match(r'^(?:Standard|Pass/Fail|Ungraded)\s+(\d+(?:\s+to\s+\d+)?)\s*$', stripped)
                        if credits_match:
                            current_credits = parse_credits(credits_match.group(1))
                        
                        # Also check standalone credits after grading mode
                        if re.match(r'^(In-Person|On-Line Only|Hybrid)\s+', stripped):
                            parts = stripped.split('\t')
                            for part in parts:
                                part = part.strip()
                                if re.match(r'^(Standard|Pass/Fail|Ungraded)$', part):
                                    continue
                                credits_found = parse_credits(part)
                                if credits_found > 0:
                                    current_credits = credits_found
                        
                        # Check for instructor
                        if stripped.startswith('Instructor'):
                            i += 1
                            if i < len(lines):
                                instructor_line = lines[i].strip()
                                # Extract name from "Name (netid) primary"
                                instructor_match = re.match(r'^(.+?)\s*\([^)]+\)', instructor_line)
                                if instructor_match:
                                    section_data['professor'] = instructor_match.group(1).strip()
                        
                        # Check if we've hit a new section or course
                        if re.match(r'^[A-Z]?\d{2,3}$', stripped):
                            section_end = True
                            i -= 1  # Back up to process this section
                            break
                        
                        if re.match(course_id_pattern, stripped):
                            section_end = True
                            i -= 1
                            break
                        
                        # Check for new course name pattern (multiple words, followed by course ID)
                        if i + 1 < len(lines):
                            next_line = lines[i + 1].strip()
                            if re.match(course_id_pattern, next_line) and not stripped.startswith(('Instructor', 'Fee', 'Session', 'Department', 'School', 'Subject', 'Class Identifier')):
                                if stripped and not re.search(r'\d{1,2}:\d{2}[ap]m', stripped) and 'primary' not in stripped:
                                    section_end = True
                                    i -= 1
                                    break
                        
                        i += 1
                    
                    # Add section data if we have meaningful info
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
                    'credits': current_credits if current_credits > 0 else 3,
                    'times': times
                }
                courses.append(course)
        else:
            i += 1
    
    return courses


def main():
    import sys
    
    input_file = 'seas-courses.txt'
    output_file = 'seas-courses.json'
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    print(f"Parsing {input_file}...")
    courses = parse_seas_courses(input_file)
    
    print(f"Found {len(courses)} courses")
    
    # Write to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    
    print(f"Output written to {output_file}")
    
    # Print a sample
    if courses:
        print("\nSample course:")
        print(json.dumps(courses[0], indent=2))


if __name__ == '__main__':
    main()

