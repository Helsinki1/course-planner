'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { SelectedCourse, TimeSlot } from '@/types/course';
import { getSelectedCourses, addSelectedCourse, removeSelectedCourse } from '@/lib/api';
import { useAuth } from './AuthContext';

interface SelectedCoursesContextType {
  selectedCourses: SelectedCourse[];
  isLoading: boolean;
  highlightedCourseId: string | null;
  addCourse: (
    courseId: string,
    courseName: string,
    sectionIndex: number,
    sectionData: TimeSlot,
    credits: number
  ) => Promise<void>;
  removeCourse: (courseId: string, sectionIndex?: number) => Promise<void>;
  refreshCourses: () => Promise<void>;
  setHighlightedCourseId: (courseId: string | null) => void;
  isCourseSelected: (courseId: string, sectionIndex: number) => boolean;
}

const SelectedCoursesContext = createContext<SelectedCoursesContextType | undefined>(undefined);

export function SelectedCoursesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(null);

  const refreshCourses = useCallback(async () => {
    if (!user) {
      setSelectedCourses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const courses = await getSelectedCourses(user.id);
      setSelectedCourses(courses);
    } catch (error) {
      console.error('Failed to fetch selected courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  const addCourse = async (
    courseId: string,
    courseName: string,
    sectionIndex: number,
    sectionData: TimeSlot,
    credits: number
  ) => {
    if (!user) return;

    try {
      await addSelectedCourse(user.id, courseId, courseName, sectionIndex, sectionData, credits);
      await refreshCourses();
    } catch (error) {
      console.error('Failed to add course:', error);
      throw error;
    }
  };

  const removeCourse = async (courseId: string, sectionIndex?: number) => {
    if (!user) return;

    try {
      await removeSelectedCourse(user.id, courseId, sectionIndex);
      await refreshCourses();
    } catch (error) {
      console.error('Failed to remove course:', error);
      throw error;
    }
  };

  const isCourseSelected = (courseId: string, sectionIndex: number): boolean => {
    return selectedCourses.some(
      (course) => course.course_id === courseId && course.section_index === sectionIndex
    );
  };

  return (
    <SelectedCoursesContext.Provider
      value={{
        selectedCourses,
        isLoading,
        highlightedCourseId,
        addCourse,
        removeCourse,
        refreshCourses,
        setHighlightedCourseId,
        isCourseSelected,
      }}
    >
      {children}
    </SelectedCoursesContext.Provider>
  );
}

export function useSelectedCourses() {
  const context = useContext(SelectedCoursesContext);
  if (context === undefined) {
    throw new Error('useSelectedCourses must be used within a SelectedCoursesProvider');
  }
  return context;
}
