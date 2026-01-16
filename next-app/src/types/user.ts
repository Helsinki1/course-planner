export type School = 'seas' | 'barnard' | 'columbia_college';

export type Year = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad_student';

export interface UserProfile {
  id: string;
  email: string;
  school: School;
  year: Year;
  field_of_study: string;
  career_interests: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseTaken {
  id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  created_at?: string;
}

export interface CourseSelected {
  id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  created_at?: string;
}

