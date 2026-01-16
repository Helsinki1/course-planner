import { Course, ProfessorRatings } from '@/types/course';

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
