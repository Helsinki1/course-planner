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
