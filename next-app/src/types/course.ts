export interface TimeSlot {
  days: string[];
  time: string;
  professor: string;
  location: string;
  capacity: number;
  enrollment: number;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  credits: number;
  times: TimeSlot[];
  school: string;
}

export interface ProfessorRatings {
  [name: string]: number | null;
}

export interface SelectedCourse {
  id?: string;
  user_id: string;
  course_id: string;
  course_name: string;
  section_index: number;
  section_data: TimeSlot;
  credits: number;
  created_at?: string;
}

export interface TakenCourse {
  id?: string;
  user_id: string;
  course_id: string;
  course_name: string;
  created_at?: string;
}
