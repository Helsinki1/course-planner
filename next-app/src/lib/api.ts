import { Course, ProfessorRatings, SelectedCourse, TimeSlot } from '@/types/course';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function searchCourses(query: string): Promise<Course[]> {
  const response = await fetch(`${API_BASE_URL}/api/courses/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to search courses');
  }

  return response.json();
}

export async function getProfessorRatings(names: string[]): Promise<ProfessorRatings> {
  if (names.length === 0) {
    return {};
  }

  const response = await fetch(`${API_BASE_URL}/api/professors/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ names }),
  });

  if (!response.ok) {
    throw new Error('Failed to get professor ratings');
  }

  return response.json();
}

// Selected Courses API
export async function getSelectedCourses(userId: string): Promise<SelectedCourse[]> {
  const response = await fetch(`${API_BASE_URL}/api/courses/selected?user_id=${userId}`);

  if (!response.ok) {
    throw new Error('Failed to get selected courses');
  }

  const data = await response.json();
  // Parse section_data from JSON string
  return data.map((course: { section_data: string } & Omit<SelectedCourse, 'section_data'>) => ({
    ...course,
    section_data: typeof course.section_data === 'string' 
      ? JSON.parse(course.section_data) 
      : course.section_data,
  }));
}

export async function addSelectedCourse(
  userId: string,
  courseId: string,
  courseName: string,
  sectionIndex: number,
  sectionData: TimeSlot,
  credits: number
): Promise<SelectedCourse[]> {
  const response = await fetch(`${API_BASE_URL}/api/courses/selected`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId,
      course_name: courseName,
      section_index: sectionIndex,
      section_data: sectionData,
      credits,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add selected course');
  }

  return response.json();
}

export async function removeSelectedCourse(
  userId: string,
  courseId: string,
  sectionIndex?: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/courses/selected`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId,
      section_index: sectionIndex,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove selected course');
  }
}

// Taken Courses API
export async function checkCourseTaken(userId: string, courseId: string): Promise<boolean> {
  const response = await fetch(
    `${API_BASE_URL}/api/courses/taken/check?user_id=${userId}&course_id=${courseId}`
  );

  if (!response.ok) {
    throw new Error('Failed to check course taken status');
  }

  const data = await response.json();
  return data.taken;
}

export async function markCourseTaken(
  userId: string,
  courseId: string,
  courseName: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/courses/taken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId,
      course_name: courseName,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark course as taken');
  }
}

export async function unmarkCourseTaken(userId: string, courseId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/courses/taken`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to unmark course as taken');
  }
}
