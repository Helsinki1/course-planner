'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SelectedCoursesPanel from '@/components/SelectedCoursesPanel';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendFriendInvite,
  getSentInvites,
  getReceivedInvites,
  getFriends,
  acceptInvite,
  declineInvite,
  FriendInvite,
  Friend,
} from '@/lib/api';

export default function FriendsPage() {
  const router = useRouter();
  const { setPendingQuery } = useSearch();
  const { user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [sentInvites, setSentInvites] = useState<FriendInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<FriendInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const handleSearch = (query: string) => {
    setPendingQuery(query);
    router.push('/search');
  };

  // Get user's first and last name from Google metadata
  const getUserName = useCallback(() => {
    if (!user) return { firstName: 'Someone', lastName: '' };
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const parts = fullName.split(' ');
    const firstName = parts[0] || user.email?.split('@')[0] || 'Someone';
    const lastName = parts.slice(1).join(' ') || '';
    return { firstName, lastName };
  }, [user]);

  // Fetch all friend data
  const fetchFriendData = useCallback(async () => {
    if (!user) return;

    setIsLoadingData(true);
    try {
      const [sent, received, friendsList] = await Promise.all([
        getSentInvites(user.id),
        getReceivedInvites(user.email || ''),
        getFriends(user.id),
      ]);
      setSentInvites(sent);
      setReceivedInvites(received);
      setFriends(friendsList);
    } catch (error) {
      console.error('Failed to fetch friend data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriendData();
    }
  }, [user, fetchFriendData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const { firstName, lastName } = getUserName();
      await sendFriendInvite(user.id, firstName, lastName, email.trim());
      setSubmitSuccess(`Invitation sent to ${email}`);
      setEmail('');
      fetchFriendData();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    if (!user) return;
    try {
      await acceptInvite(inviteId, user.id);
      fetchFriendData();
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await declineInvite(inviteId);
      fetchFriendData();
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <>
        <Navbar onSearch={handleSearch} isLoading={false} />
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar onSearch={handleSearch} isLoading={false} />
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
        >
          <div
            className="rounded-lg border p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Sign in to view friends
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              You need to be logged in to invite friends and view your connections.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar onSearch={handleSearch} isLoading={false} />
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
      >
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 relative left-16 top-5">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Invite Form */}
            <div
              className="rounded-lg border p-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <h1
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Invite a Friend
              </h1>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Share your course schedule with friends by sending them an invitation.
              </p>

              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter friend's email address"
                  className="flex-1 px-4 py-2 rounded-lg border outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-6 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--text-course-name)',
                    color: '#000',
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Invite'}
                </button>
              </form>

              {submitError && (
                <p className="mt-3 text-sm" style={{ color: '#f85149' }}>
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="mt-3 text-sm" style={{ color: 'var(--accent-green)' }}>
                  {submitSuccess}
                </p>
              )}
            </div>

            {/* Received Invitations */}
            <div
              className="rounded-lg border p-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <h2
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Received Invitations
              </h2>

              {isLoadingData ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
              ) : receivedInvites.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  No pending invitations from others.
                </p>
              ) : (
                <div className="space-y-3">
                  {receivedInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {invite.sender_first_name} {invite.sender_last_name}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Invited you on {formatDate(invite.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(invite.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: 'var(--accent-green)',
                            color: '#000',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(invite.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invites (Sent) */}
            <div
              className="rounded-lg border p-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <h2
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Pending Invites
              </h2>

              {isLoadingData ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
              ) : sentInvites.filter((i) => i.status === 'pending').length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  No pending invites sent.
                </p>
              ) : (
                <div className="space-y-3">
                  {sentInvites
                    .filter((invite) => invite.status === 'pending')
                    .map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                      >
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {invite.recipient_email}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Sent on {formatDate(invite.created_at)}
                          </p>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--accent-yellow)',
                            color: '#000',
                          }}
                        >
                          Pending
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Friends List */}
            <div
              className="rounded-lg border p-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Friends
                </h2>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-course-code)',
                  }}
                >
                  {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
                </span>
              </div>

              {isLoadingData ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
              ) : friends.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  No friends yet. Send an invite to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                          style={{
                            backgroundColor: 'var(--text-course-code)',
                            color: '#000',
                          }}
                        >
                          {friend.email.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {friend.email}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--accent-green)',
                          color: '#000',
                        }}
                      >
                        Connected
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <SelectedCoursesPanel />
      </div>
    </>
  );
}
