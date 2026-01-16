'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SelectedCoursesPanel from '@/components/SelectedCoursesPanel';
import { useSelectedCourses } from '@/contexts/SelectedCoursesContext';
import { useSearch } from '@/contexts/SearchContext';
import { SelectedCourse } from '@/types/course';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

// Map day abbreviations and full names to calendar day headers
const DAY_MAP: Record<string, string> = {
  // Abbreviations
  'Su': 'SUN',
  'M': 'MON',
  'Mo': 'MON',
  'T': 'TUE',
  'Tu': 'TUE',
  'W': 'WED',
  'We': 'WED',
  'Th': 'THU',
  'R': 'THU',
  'F': 'FRI',
  'Fr': 'FRI',
  'Sa': 'SAT',
  'S': 'SAT',
  // Full day names
  'Sunday': 'SUN',
  'Monday': 'MON',
  'Tuesday': 'TUE',
  'Wednesday': 'WED',
  'Thursday': 'THU',
  'Friday': 'FRI',
  'Saturday': 'SAT',
};

interface CalendarEvent {
  course: SelectedCourse;
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

function parseTime(timeStr: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  // Parse time strings like "10:10am - 12:40pm" or "2:40pm - 3:55pm"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return null;

  let startHour = parseInt(match[1]);
  const startMinute = parseInt(match[2]);
  const startPeriod = match[3].toLowerCase();
  let endHour = parseInt(match[4]);
  const endMinute = parseInt(match[5]);
  const endPeriod = match[6].toLowerCase();

  // Convert to 24-hour format
  if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
  if (startPeriod === 'am' && startHour === 12) startHour = 0;
  if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
  if (endPeriod === 'am' && endHour === 12) endHour = 0;

  return { startHour, startMinute, endHour, endMinute };
}

function parseDays(daysArray: string[]): string[] {
  const result: string[] = [];
  for (const day of daysArray) {
    const mapped = DAY_MAP[day];
    if (mapped) {
      result.push(mapped);
    }
  }
  return result;
}

export default function CalendarPage() {
  const router = useRouter();
  const { selectedCourses, setHighlightedCourseId } = useSelectedCourses();
  const { setPendingQuery } = useSearch();

  // Convert selected courses to calendar events
  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    
    for (const course of selectedCourses) {
      const section = course.section_data;
      if (!section.time || !section.days) continue;

      const timeInfo = parseTime(section.time);
      if (!timeInfo) continue;

      const days = parseDays(section.days);
      for (const day of days) {
        result.push({
          course,
          day,
          ...timeInfo,
        });
      }
    }
    
    return result;
  }, [selectedCourses]);

  const handleEventClick = (course: SelectedCourse) => {
    setHighlightedCourseId(course.course_id);
  };

  // Set pending query and navigate to search page
  const handleSearch = (query: string) => {
    setPendingQuery(query);
    router.push('/search');
  };

  return (
    <>
      <Navbar onSearch={handleSearch} isLoading={false} />
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
      >
        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="p-2" style={{ backgroundColor: 'var(--bg-card)' }} />
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium border-l"
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b"
                  style={{ borderColor: 'var(--border-color)', height: '60px' }}
                >
                  {/* Time label */}
                  <div
                    className="p-2 text-sm text-right pr-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  {/* Day columns */}
                  {DAYS.map((day) => (
                    <div
                      key={`${hour}-${day}`}
                      className="border-l relative"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                  ))}
                </div>
              ))}

              {/* Events overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {events.map((event, index) => {
                  const dayIndex = DAYS.indexOf(event.day);
                  if (dayIndex === -1) return null;

                  // Calculate position
                  const startOffset = (event.startHour - 7) * 60 + event.startMinute;
                  const endOffset = (event.endHour - 7) * 60 + event.endMinute;
                  const duration = endOffset - startOffset;

                  // Calculate left position (skip first column which is time labels)
                  const colWidth = 100 / 8; // 8 columns total
                  const left = `${colWidth * (dayIndex + 1)}%`;
                  const width = `${colWidth}%`;
                  const top = `${startOffset}px`;
                  const height = `${duration}px`;

                  return (
                    <div
                      key={`${event.course.course_id}-${event.day}-${index}`}
                      className="absolute pointer-events-auto cursor-pointer rounded overflow-hidden border-l-4 p-1"
                      style={{
                        left,
                        width,
                        top,
                        height,
                        backgroundColor: 'rgba(88, 166, 255, 0.3)',
                        borderLeftColor: 'var(--text-course-code)',
                      }}
                      onClick={() => handleEventClick(event.course)}
                    >
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--text-course-code)' }}>
                        {event.course.course_id}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-course-name)' }}>
                        {event.course.course_name}
                      </div>
                      {duration > 40 && (
                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {event.course.section_data.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <SelectedCoursesPanel />
      </div>
    </>
  );
}
