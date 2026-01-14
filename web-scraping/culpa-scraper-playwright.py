#!/usr/bin/env python3
"""
CULPA.info Playwright Scraper
Uses headless Playwright to scrape professor data from CULPA.info
"""

import json
import re
import os
import time
import sys
import asyncio
from datetime import datetime
from collections import Counter
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright


def parse_date(date_str):
    """Parse date string and return datetime object"""
    try:
        return datetime.strptime(date_str.strip(), "%b %d, %Y")
    except ValueError:
        try:
            return datetime.strptime(date_str.strip(), "%B %d, %Y")
        except ValueError:
            return None


def parse_workload(workload_text):
    """Parse workload text to extract workload info"""
    workload = {
        "num_homeworks": None,
        "num_midterms": None,
        "num_finals": None,
        "hours_per_week": None
    }
    
    if not workload_text:
        return workload
    
    text = workload_text.lower()
    
    # Parse homeworks/problem sets/assignments
    hw_patterns = [
        r'(\d+)\s*(?:homework|hw|pset|problem set|assignment)s?',
        r'(?:homework|hw|pset|problem set|assignment)s?\s*[:\-]?\s*(\d+)',
    ]
    for pattern in hw_patterns:
        match = re.search(pattern, text)
        if match:
            workload["num_homeworks"] = int(match.group(1))
            break
    
    # Check for "weekly" homework pattern
    if workload["num_homeworks"] is None:
        if re.search(r'weekly\s*(?:homework|hw|pset|problem set|assignment)s?', text):
            workload["num_homeworks"] = 12  # Assume ~12 weeks
    
    # Parse midterms
    midterm_patterns = [
        r'(\d+)\s*midterm',
        r'midterm[s]?\s*[:\-]?\s*(\d+)',
    ]
    for pattern in midterm_patterns:
        match = re.search(pattern, text)
        if match:
            workload["num_midterms"] = int(match.group(1))
            break
    
    if re.search(r'no\s*midterm', text):
        workload["num_midterms"] = 0
    
    if workload["num_midterms"] is None and re.search(r'\bmidterm\b', text):
        workload["num_midterms"] = 1
    
    # Parse finals
    final_patterns = [
        r'(\d+)\s*final',
        r'final[s]?\s*[:\-]?\s*(\d+)',
    ]
    for pattern in final_patterns:
        match = re.search(pattern, text)
        if match:
            workload["num_finals"] = int(match.group(1))
            break
    
    if re.search(r'no\s*final', text):
        workload["num_finals"] = 0
    
    if workload["num_finals"] is None and re.search(r'\bfinal\b', text):
        workload["num_finals"] = 1
    
    # Parse exams (if midterms not found)
    if workload["num_midterms"] is None:
        exam_match = re.search(r'(\d+)\s*exam', text)
        if exam_match:
            num_exams = int(exam_match.group(1))
            if workload["num_finals"] is None:
                if num_exams >= 2:
                    workload["num_midterms"] = num_exams - 1
                    workload["num_finals"] = 1
                else:
                    workload["num_midterms"] = num_exams
    
    # Parse hours per week
    hours_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:per|a|/)\s*week',
        r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*weekly',
        r'(?:spend|spent|average|about)\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)',
        r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)',
    ]
    for pattern in hours_patterns:
        match = re.search(pattern, text)
        if match:
            if len(match.groups()) == 2 and match.group(2):
                workload["hours_per_week"] = (float(match.group(1)) + float(match.group(2))) / 2
            else:
                workload["hours_per_week"] = float(match.group(1))
            break
    
    return workload


def get_consensus_workload(workloads):
    """Get consensus workload from multiple reviews"""
    consensus = {
        "num_homeworks": None,
        "num_midterms": None,
        "num_finals": None,
        "hours_per_week": None
    }
    
    for key in ["num_homeworks", "num_midterms", "num_finals"]:
        values = [w[key] for w in workloads if w[key] is not None]
        if values:
            counter = Counter(values)
            consensus[key] = counter.most_common(1)[0][0]
    
    hours_values = [w["hours_per_week"] for w in workloads if w["hours_per_week"] is not None]
    if hours_values:
        consensus["hours_per_week"] = round(sum(hours_values) / len(hours_values), 1)
    
    return consensus


def extract_department_urls(html_content):
    """Extract department URLs from the departments page HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    dept_links = soup.find_all('a', href=re.compile(r'^/department/\d+'))
    dept_urls = []
    seen_ids = set()
    for link in dept_links:
        href = link.get('href')
        name = link.get_text(strip=True)
        if href:
            match = re.search(r'/department/(\d+)', href)
            if match:
                dept_id = match.group(1)
                if dept_id not in seen_ids:
                    seen_ids.add(dept_id)
                    dept_urls.append({
                        "id": dept_id,
                        "url": f"https://culpa.info{href}",
                        "name": name
                    })
    return dept_urls


def extract_professor_urls(html_content):
    """Extract professor URLs from a department page HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    prof_links = soup.find_all('a', href=re.compile(r'^/professor/\d+'))
    prof_data = []
    seen_ids = set()
    for link in prof_links:
        href = link.get('href')
        name = link.get_text(strip=True)
        if href:
            match = re.search(r'/professor/(\d+)', href)
            if match:
                prof_id = match.group(1)
                if prof_id not in seen_ids:
                    seen_ids.add(prof_id)
                    prof_data.append({
                        "id": prof_id,
                        "url": f"https://culpa.info/professor/{prof_id}",
                        "name": name
                    })
    return prof_data


def parse_professor_html(html_content, cutoff_year=2022):
    """Parse professor page HTML to extract data"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    professor_data = {
        "first_name": None,
        "last_name": None,
        "rating": None,
        "courses": {}
    }
    
    # Get professor name from h1 > a
    h1 = soup.find('h1')
    if h1:
        name_link = h1.find('a', href=re.compile(r'/professor/'))
        if name_link:
            full_name = name_link.get_text(strip=True)
            name_parts = full_name.split()
            if len(name_parts) >= 2:
                professor_data["first_name"] = name_parts[0].lower()
                professor_data["last_name"] = " ".join(name_parts[1:]).lower()
            elif len(name_parts) == 1:
                professor_data["first_name"] = ""
                professor_data["last_name"] = name_parts[0].lower()
    
    if not professor_data["last_name"]:
        return None
    
    # Get rating - look for h2 with just a number
    h2_elements = soup.find_all('h2')
    for h2 in h2_elements:
        text = h2.get_text(strip=True)
        if re.match(r'^\d+\.\d+$', text):
            professor_data["rating"] = float(text)
            break
    
    # Get all text content
    page_text = soup.get_text()
    
    # Find all course links
    course_links = soup.find_all('a', href=re.compile(r'/course/\d+'))
    course_names = set()
    for link in course_links:
        course_name = link.get_text(strip=True)
        if course_name and course_name.startswith('['):
            course_names.add(course_name)
    
    # Parse reviews for each course
    for course_name in course_names:
        if not course_name:
            continue
        
        escaped_name = re.escape(course_name)
        pattern = escaped_name + r'\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})(.*?)(?=' + escaped_name + r'|\Z)'
        matches = re.findall(pattern, page_text, re.DOTALL)
        
        workloads = []
        for match in matches:
            date_str = match[0]
            review_text = match[1] if len(match) > 1 else ""
            
            review_date = parse_date(date_str)
            if review_date and review_date.year >= cutoff_year:
                workload_match = re.search(r'Workload[:\s]*(.*?)(?=\d+\s*$|\Z)', review_text, re.DOTALL | re.IGNORECASE)
                workload_text = workload_match.group(1) if workload_match else review_text
                
                workload = parse_workload(workload_text)
                workloads.append(workload)
        
        if workloads:
            consensus = get_consensus_workload(workloads)
            professor_data["courses"][course_name] = [
                consensus["num_homeworks"],
                consensus["num_midterms"],
                consensus["num_finals"],
                consensus["hours_per_week"]
            ]
    
    return professor_data


async def scrape_all():
    """Main scraping function using Playwright"""
    print("Starting CULPA.info scraper with Playwright...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # Step 1: Get all department URLs
        print("Getting department URLs...")
        await page.goto("https://culpa.info/department", wait_until="networkidle")
        await asyncio.sleep(2)
        
        html_content = await page.content()
        dept_urls = extract_department_urls(html_content)
        print(f"Found {len(dept_urls)} departments")
        
        # Save department URLs
        with open("/home/davidx/Downloads/course-planner/department_list.json", "w") as f:
            json.dump(dept_urls, f, indent=2)
        
        # Step 2: Get all professor URLs from each department
        print("Getting professor URLs from each department...")
        all_prof_urls = {}
        
        for i, dept in enumerate(dept_urls):
            try:
                await page.goto(dept["url"], wait_until="networkidle")
                await asyncio.sleep(1)
                
                # Click "Load More" until all professors are loaded
                while True:
                    try:
                        load_more = page.locator("button:has-text('Load More')")
                        if await load_more.count() > 0:
                            await load_more.click()
                            await asyncio.sleep(0.5)
                        else:
                            break
                    except:
                        break
                
                html_content = await page.content()
                profs = extract_professor_urls(html_content)
                
                for prof in profs:
                    all_prof_urls[prof["id"]] = prof
                
                print(f"  [{i+1}/{len(dept_urls)}] {dept['name']}: {len(profs)} professors (total unique: {len(all_prof_urls)})")
                
            except Exception as e:
                print(f"  Error with department {dept['name']}: {e}")
                continue
        
        print(f"\nTotal unique professors: {len(all_prof_urls)}")
        
        # Save professor URLs
        with open("/home/davidx/Downloads/course-planner/professor_urls.json", "w") as f:
            json.dump(list(all_prof_urls.values()), f, indent=2)
        print("Professor URLs saved to /home/davidx/Downloads/course-planner/professor_urls.json")
        
        # Step 3: Scrape each professor
        print("\nScraping professor pages...")
        all_professors = {}
        prof_list = list(all_prof_urls.values())
        
        for i, prof in enumerate(prof_list):
            try:
                await page.goto(prof["url"], wait_until="networkidle")
                await asyncio.sleep(1)
                
                # Click "Load More" until all reviews are loaded
                while True:
                    try:
                        load_more = page.locator("button:has-text('Load More')")
                        if await load_more.count() > 0:
                            await load_more.click()
                            await asyncio.sleep(0.5)
                        else:
                            break
                    except:
                        break
                
                html_content = await page.content()
                prof_data = parse_professor_html(html_content)
                
                if prof_data and prof_data["last_name"]:
                    key = f"{prof_data['first_name']}_{prof_data['last_name']}"
                    all_professors[key] = prof_data
                
                if (i + 1) % 100 == 0:
                    print(f"  [{i+1}/{len(prof_list)}] Scraped {len(all_professors)} professors")
                    # Save intermediate results
                    with open("/home/davidx/Downloads/course-planner/culpa_professors_partial.json", "w") as f:
                        json.dump(all_professors, f, indent=2)
                
            except Exception as e:
                print(f"  Error scraping professor {prof['name']}: {e}")
                continue
        
        await browser.close()
        
        # Save final results
        with open("/home/davidx/Downloads/course-planner/culpa_professors.json", "w") as f:
            json.dump(all_professors, f, indent=2)
        
        print(f"\nScraping complete!")
        print(f"Total professors scraped: {len(all_professors)}")
        print("Results saved to /home/davidx/Downloads/course-planner/culpa_professors.json")
        
        return all_professors


def main():
    asyncio.run(scrape_all())


if __name__ == "__main__":
    main()