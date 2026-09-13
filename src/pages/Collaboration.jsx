import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import JournalCard from '../components/JournalCard';
import Loading from '../components/Loading';
import {
  addCollaborationMember,
  createCollaborationBook,
  createCollaborationSpace,
  getCollaborationBooks,
  getCollaborationMembers,
  getMyCollaborationSpaces,
  removeCollaborationBook,
  removeCollaborationMember,
} from '../services/collaborationService';

export default function Collaboration() {
  const { user } = useAuth();
  const { spaceId } = useParams();
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [friendId, setFriendId] = useState('');

  const [bookTitle, setBookTitle] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookDate, setBookDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId || null);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) || null,
    [spaces, selectedSpaceId]
  );

  const uniqueSpaces = useMemo(() => {
    const seen = new Set();

    return spaces.filter((space) => {
      if (!space?.id || seen.has(space.id)) {
        return false;
      }

      seen.add(space.id);
      return true;
    });
  }, [spaces]);

  const isOwner = selectedSpace?.owner_id === user?.id;

  async function loadSpaces() {
    try {
      setError('');
      const data = await getMyCollaborationSpaces();
      setSpaces(data);

      if (!selectedSpaceId && data.length) {
        setSelectedSpaceId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not load collaboration spaces.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSpaceData(id) {
    if (!id) {
      setMembers([]);
      setBooks([]);
      return;
    }

    try {
      setSpaceLoading(true);
      setError('');

      const [memberData, bookData] = await Promise.all([
        getCollaborationMembers(id),
        getCollaborationBooks(id),
      ]);

      setMembers(memberData);
      setBooks(bookData);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not load this shared space.');
    } finally {
      setSpaceLoading(false);
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  useEffect(() => {
    if (spaceId) {
      setSelectedSpaceId(spaceId);
    }
  }, [spaceId]);

  useEffect(() => {
    loadSpaceData(selectedSpaceId);
  }, [selectedSpaceId]);

  function openSpace(id) {
    setSelectedSpaceId(id);
    navigate(`/collaboration/${id}`);
  }

  function openAllSpaces() {
    setSelectedSpaceId(null);
    navigate('/collaboration');
  }

  async function handleCreateSpace(e) {
    e.preventDefault();

    if (!spaceName.trim()) return;

    try {
      setSaving(true);
      setError('');

      const newSpaceId = await createCollaborationSpace(
        spaceName,
        spaceDescription
      );

      setSpaceName('');
      setSpaceDescription('');
      setShowCreateSpace(false);
      setNotice('Shared space created.');

      await loadSpaces();
      openSpace(newSpaceId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not create the shared space.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();

    if (!selectedSpaceId || !friendId.trim()) return;

    try {
      setSaving(true);
      setError('');

      await addCollaborationMember(
        selectedSpaceId,
        friendId
      );

      setFriendId('');
      setNotice('Friend added to this shared space.');

      await loadSpaceData(selectedSpaceId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not add that friend.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateBook(e) {
    e.preventDefault();

    if (!selectedSpaceId || !bookTitle.trim()) return;

    try {
      setSaving(true);
      setError('');

      await createCollaborationBook({
        spaceId: selectedSpaceId,
        title: bookTitle,
        description: bookDescription,
        authorName: bookAuthor,
        journalDate: bookDate,
      });

      setBookTitle('');
      setBookDescription('');
      setBookAuthor('');
      setBookDate('');
      setShowCreateBook(false);
      setNotice('Book added to the shared library.');

      await loadSpaceData(selectedSpaceId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not create the collaborative book.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBook(journalId) {
    if (!selectedSpaceId) return;

    setConfirmation({
      type: 'book',
      journalId,
    });
  }

  async function confirmRemoveBook() {
    if (!selectedSpaceId || !confirmation?.journalId) return;

    const journalId = confirmation.journalId;
    setConfirmation(null);

    try {
      setSaving(true);

      await removeCollaborationBook(
        selectedSpaceId,
        journalId
      );

      setNotice('Book removed from the shared library.');

      await loadSpaceData(selectedSpaceId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not remove the book.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!selectedSpaceId || memberId === user?.id) {
      return;
    }

    setConfirmation({
      type: 'member',
      memberId,
    });
  }

  async function confirmRemoveMember() {
    if (!selectedSpaceId || !confirmation?.memberId) return;

    const memberId = confirmation.memberId;
    setConfirmation(null);

    try {
      setSaving(true);

      await removeCollaborationMember(
        selectedSpaceId,
        memberId
      );

      setNotice('Member removed from the shared space.');

      await loadSpaceData(selectedSpaceId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not remove the member.');
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return <Loading label="Opening collaboration" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Collaboration
          </p>

          <h1 className="font-display text-3xl italic text-ink sm:text-4xl">
            Shared spaces
          </h1>

          <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-ink-soft">
            Create a private little library with friends. Everyone in a space can
            work on its collaborative books.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateSpace(true)}
          className="rounded-lg bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-wide text-paper transition hover:opacity-90"
        >
          + New shared space
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-ink/15 bg-paper px-4 py-3 font-mono text-xs text-ink">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-5 rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 font-mono text-xs text-ink">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
          <div className="mb-2 flex items-center justify-between px-2 py-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
              Your spaces
            </span>

            <span className="font-mono text-[10px] text-ink-soft/60">
              {uniqueSpaces.length}
            </span>
          </div>

          {!uniqueSpaces.length ? (
            <div className="px-2 py-8 text-center font-body text-sm text-ink-soft">
              No shared spaces yet.
            </div>
          ) : (
            <div className="space-y-1">
              {uniqueSpaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => openSpace(space.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ${
                    selectedSpaceId === space.id
                      ? 'bg-ink text-paper'
                      : 'hover:bg-ink/5'
                  }`}
                >
                  <div className="truncate font-display text-base">
                    {space.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {!selectedSpace ? (
          <section className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/40 p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-ink/10 bg-paper">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
                </svg>
              </div>

              <h2 className="font-display text-2xl italic">
                A library you build together
              </h2>

              <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
                Pick a shared space from the left, or create one and invite your friends.
              </p>
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-6 rounded-2xl border border-ink/10 bg-paper/70 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <button
                    type="button"
                    onClick={openAllSpaces}
                    className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft hover:text-ink"
                  >
                    ← All spaces
                  </button>

                  <h2 className="font-display text-3xl italic">
                    {selectedSpace.name}
                  </h2>

                  {selectedSpace.description && (
                    <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-ink-soft">
                      {selectedSpace.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMembers((value) => !value)}
                    className="rounded-lg border border-ink/15 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft hover:bg-ink/5"
                  >
                    Members · {members.length}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCreateBook(true)}
                    className="rounded-lg bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-paper hover:opacity-90"
                  >
                    + Create book
                  </button>
                </div>
              </div>

              {showMembers && (
                <div className="mt-5 border-t border-ink/10 pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                      People in this space
                    </h3>

                    {isOwner && (
                      <span className="font-mono text-[9px] text-ink-soft">
                        You own this space
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between rounded-xl border border-ink/10 px-3 py-3"
                      >
                        <div>
                          <div className="font-mono text-xs text-ink">
                            {member.profile?.friend_id || 'Unknown ID'}
                            {member.user_id === user?.id ? ' · You' : ''}
                          </div>

                          <div className="mt-1 font-body text-xs text-ink-soft">
                            {member.profile?.email || ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                            {member.role}
                          </span>

                          {isOwner && member.user_id !== user?.id && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="font-mono text-[9px] uppercase tracking-wide text-ink-soft hover:text-ink"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isOwner && (
                    <form
                      onSubmit={handleAddMember}
                      className="mt-4 flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        value={friendId}
                        onChange={(e) =>
                          setFriendId(e.target.value.toUpperCase())
                        }
                        placeholder="Friend ID"
                        className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-transparent px-3 py-2.5 font-mono text-xs uppercase outline-none focus:border-ink/40"
                      />

                      <button
                        type="submit"
                        disabled={saving || !friendId.trim()}
                        className="rounded-lg border border-ink/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-ink disabled:opacity-40"
                      >
                        Add friend
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                  Shared library
                </p>

                <p className="mt-1 font-body text-sm text-ink-soft">
                  {books.length} {books.length === 1 ? 'book' : 'books'} · everyone can contribute
                </p>
              </div>
            </div>

            {spaceLoading ? (
              <div className="py-20">
                <Loading label="Loading shared library" />
              </div>
            ) : books.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {books.map((book) => (
                  <div key={book.id} className="group">
                    <JournalCard
                      journal={book}
                      navigationState={{
                        fromCollaboration: selectedSpaceId,
                      }}
                    />

                    {isOwner && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleRemoveBook(book.id)}
                        className="mt-2 font-mono text-[9px] uppercase tracking-wide text-ink-soft opacity-0 transition group-hover:opacity-100 hover:text-ink"
                      >
                        Remove from library
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-paper/40 px-6 py-16 text-center">
                <h3 className="font-display text-2xl italic">
                  The shelf is empty
                </h3>

                <p className="mx-auto mt-2 max-w-md font-body text-sm leading-6 text-ink-soft">
                  Create the first book and start writing together.
                </p>

                <button
                  type="button"
                  onClick={() => setShowCreateBook(true)}
                  className="mt-5 rounded-lg bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-paper"
                >
                  Create first book
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {showCreateSpace && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSpace}
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
          >
            <h2 className="font-display text-2xl italic">
              Create a shared space
            </h2>

            <p className="mt-1 font-body text-sm text-ink-soft">
              This becomes a private library for you and the friends you invite.
            </p>

            <div className="mt-5 space-y-3">
              <input
                autoFocus
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="Space name"
                className="w-full rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />

              <textarea
                value={spaceDescription}
                onChange={(e) => setSpaceDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full resize-none rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateSpace(false)}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !spaceName.trim()}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-paper disabled:opacity-40"
              >
                {saving ? 'Creating…' : 'Create space'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCreateBook && selectedSpace && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateBook}
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
          >
            <h2 className="font-display text-2xl italic">
              Create a collaborative book
            </h2>

            <p className="mt-1 font-body text-sm text-ink-soft">
              Everyone in {selectedSpace.name} will be able to edit it.
            </p>

            <div className="mt-5 space-y-3">
              <input
                autoFocus
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Book title"
                className="w-full rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />

              <input
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Author (optional)"
                className="w-full rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />

              <input
                type="date"
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="w-full rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />

              <textarea
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full resize-none rounded-lg border border-ink/15 bg-transparent px-3 py-3 font-body text-sm outline-none focus:border-ink/40"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateBook(false)}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !bookTitle.trim()}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-paper disabled:opacity-40"
              >
                {saving ? 'Creating…' : 'Create book'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmation && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          onClick={() => setConfirmation(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collaboration-confirmation-title"
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="collaboration-confirmation-title"
              className="font-display text-2xl italic"
            >
              {confirmation.type === 'book'
                ? 'Remove this book?'
                : 'Remove this member?'}
            </h2>

            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              {confirmation.type === 'book'
                ? 'Remove this book from the shared library?'
                : 'Remove this member from the shared space?'}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmation.type === 'book'
                    ? confirmRemoveBook
                    : confirmRemoveMember
                }
                disabled={saving}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-paper disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}