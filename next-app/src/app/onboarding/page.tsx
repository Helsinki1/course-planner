'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { School, Year } from '@/types/user';

const schoolOptions: { value: School; label: string }[] = [
  { value: 'columbia_college', label: 'Columbia College' },
  { value: 'seas', label: 'SEAS (Engineering)' },
  { value: 'barnard', label: 'Barnard College' },
];

const yearOptions: { value: Year; label: string }[] = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'grad_student', label: 'Graduate Student' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const [school, setSchool] = useState<School | ''>('');
  const [year, setYear] = useState<Year | ''>('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [careerInterests, setCareerInterests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to complete onboarding.');
      return;
    }

    if (!school || !year || !fieldOfStudy.trim() || !careerInterests.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('user_profiles').insert({
        id: user.id,
        email: user.email!,
        school,
        year,
        field_of_study: fieldOfStudy.trim(),
        career_interests: careerInterests.trim(),
      });

      if (insertError) {
        throw insertError;
      }

      await refreshProfile();
      router.push('/search');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-card-hover)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  };

  const labelStyle = {
    color: 'var(--text-primary)',
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-lg p-8 rounded-lg border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>

        <h1
          className="relative left-3 text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Complete Your Profile
        </h1>

        <div className="h-3" style={{ backgroundColor: 'var(--bg-card)' }}></div>

        <p
          className="relative left-3 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Tell us a bit about yourself to personalize your experience.
        </p>

        <div className="h-8" style={{ backgroundColor: 'var(--bg-card)' }}></div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* School Selection */}
          <div>
            <label
              htmlFor="school"
              className="relative left-2 block text-sm font-medium"
              style={labelStyle}
            >
              Which school are you in?
            </label>
            <div className="h-2" style={{ backgroundColor: 'var(--bg-card)' }}></div>
            <select
              id="school"
              value={school}
              onChange={(e) => setSchool(e.target.value as School)}
              className="rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--text-course-code)]"
              style={{
                ...inputStyle,
                width: '100%',
                height: '46px',
                padding: '0 16px',
              }}
            >
              <option value="">Select your school</option>
              {schoolOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>

          {/* Year Selection */}
          <div>
            <label
              htmlFor="year"
              className="relative left-2 block text-sm font-medium"
              style={labelStyle}
            >
              What year are you?
            </label>
            <div className="h-2" style={{ backgroundColor: 'var(--bg-card)' }}></div>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value as Year)}
              className="rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--text-course-code)]"
              style={{
                ...inputStyle,
                width: '100%',
                height: '46px',
                padding: '0 16px',
              }}
            >
              <option value="">Select your year</option>
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>

          {/* Field of Study */}
          <div>
            <label
              htmlFor="fieldOfStudy"
              className="relative left-2 block text-sm font-medium"
              style={labelStyle}
            >
              What is your field of study or intended major?
            </label>
            <div className="h-2" style={{ backgroundColor: 'var(--bg-card)' }}></div>
            <input
              type="text"
              id="fieldOfStudy"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="e.g., Computer Science, Economics, English"
              className="rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--text-course-code)]"
              style={{
                ...inputStyle,
                width: '100%',
                height: '46px',
                padding: '0 16px',
              }}
            />
          </div>

          <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>

          {/* Career Interests */}
          <div>
            <label
              htmlFor="careerInterests"
              className="relative left-2 block text-sm font-medium"
              style={labelStyle}
            >
              What are your career interests?
            </label>
            <div className="h-2" style={{ backgroundColor: 'var(--bg-card)' }}></div>
            <textarea
              id="careerInterests"
              value={careerInterests}
              onChange={(e) => setCareerInterests(e.target.value)}
              placeholder="e.g., Software Engineering, Investment Banking, Graduate School"
              rows={3}
              className="rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--text-course-code)] resize-none"
              style={{
                ...inputStyle,
                width: '100%',
                padding: '12px 16px',
              }}
            />
          </div>

          <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>

          {/* Error Message */}
          {error && (
            <>
              <div
                className="p-3 rounded-lg text-center text-sm"
                style={{
                  backgroundColor: 'rgba(248, 81, 73, 0.1)',
                  color: '#f85149',
                }}
              >
                {error}
              </div>
              <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative left-1/5 rounded-lg font-medium transition-colors duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              width: '55%',
              height: '46px',
              backgroundColor: 'var(--accent-green)',
              color: 'var(--bg-primary)',
            }}
          >
            {isSubmitting ? 'Saving...' : 'Complete Setup'}
          </button>

          <div className="h-6" style={{ backgroundColor: 'var(--bg-card)' }}></div>
        </form>
      </div>
    </main>
  );
}

