"""
CULPA.info Playwright Scraper v2
Uses headless Playwright to scrape professor data from CULPA.info
Improved with better error handling and timeouts
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
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout


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
            workload["num_homeworks"] = 12
    
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


async def scrape_professors():
    """Main scraping function using Playwright"""
    print("Starting CULPA.info professor scraper v2...", flush=True)
    
    # Load professor URLs
    with open("/home/davidx/Downloads/course-planner/web-scraping/professor_urls.json", "r") as f:
        prof_list = json.load(f)
    
    print(f"Loaded {len(prof_list)} professor URLs", flush=True)
    
    # Load existing progress if any
    progress_file = "/home/davidx/Downloads/course-planner/scraping_progress.json"
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            progress = json.load(f)
        all_professors = progress.get("professor_data", {})
        scraped_ids = set(progress.get("scraped_ids", []))
        print(f"Resuming from previous progress: {len(scraped_ids)} already scraped", flush=True)
    else:
        all_professors = {}
        scraped_ids = set()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        page.set_default_timeout(15000)  # 15 second timeout
        
        errors = 0
        for i, prof in enumerate(prof_list):
            prof_id = prof["id"]
            
            # Skip if already scraped
            if prof_id in scraped_ids:
                continue
            
            try:
                # Navigate with timeout
                await page.goto(prof["url"], wait_until="domcontentloaded", timeout=10000)
                await asyncio.sleep(1)  # Wait for React to render
                
                # Try to click "Load More" a few times (with timeout)
                for _ in range(3):
                    try:
                        load_more = page.locator("button:has-text('Load More')")
                        if await load_more.count() > 0:
                            await load_more.click(timeout=2000)
                            await asyncio.sleep(0.3)
                        else:
                            break
                    except:
                        break
                
                html_content = await page.content()
                prof_data = parse_professor_html(html_content)
                
                if prof_data and prof_data["last_name"]:
                    key = f"{prof_data['first_name']}_{prof_data['last_name']}"
                    all_professors[key] = prof_data
                
                scraped_ids.add(prof_id)
                errors = 0  # Reset error counter on success
                
            except PlaywrightTimeout:
                print(f"  Timeout on professor {prof['name']} ({prof_id})", flush=True)
                errors += 1
            except Exception as e:
                print(f"  Error on professor {prof['name']} ({prof_id}): {type(e).__name__}", flush=True)
                errors += 1
            
            # Print progress every 50 professors
            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(prof_list)}] Scraped {len(all_professors)} professors ({len(scraped_ids)} processed)", flush=True)
                
                # Save progress
                with open(progress_file, "w") as f:
                    json.dump({
                        "scraped_ids": list(scraped_ids),
                        "professor_data": all_professors
                    }, f)
            
            # If too many consecutive errors, restart browser
            if errors >= 5:
                print("  Too many errors, restarting browser...", flush=True)
                await browser.close()
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                page.set_default_timeout(15000)
                errors = 0
        
        await browser.close()
    
    # Save final results
    with open("/home/davidx/Downloads/course-planner/culpa_professors.json", "w") as f:
        json.dump(all_professors, f, indent=2)
    
    # Save progress
    with open(progress_file, "w") as f:
        json.dump({
            "scraped_ids": list(scraped_ids),
            "professor_data": all_professors
        }, f)
    
    print(f"\nScraping complete!", flush=True)
    print(f"Total professors scraped: {len(all_professors)}", flush=True)
    print("Results saved to /home/davidx/Downloads/course-planner/culpa_professors.json", flush=True)
    
    return all_professors


def main():
    asyncio.run(scrape_professors())


if __name__ == "__main__":
    main()
