import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMyJournals,
  getBookcases,
  updateBookcase as updateBookcaseRecord,
  subscribeToBookcases,
} from '../services/journalService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import JournalCard from '../components/JournalCard';

export default function BookcasePage() {
  const { bookcaseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: journals, loading } = useAsync(getMyJournals);
  const [bookcase, setBookcase] = useState(null);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setBookcase(null);
      return () => {
        active = false;
      };
    }

    async function loadBookcase() {
      try {
        const bookcases = await getBookcases();

        if (!active) {
          return;
        }

        const found = bookcases.find(
          (item) => item.id === bookcaseId
        );

        setBookcase(found || null);
      } catch (error) {
        console.error(error);

        if (active) {
          setBookcase(null);
        }
      }
    }

    loadBookcase();

    const unsubscribe = subscribeToBookcases(
      user.id,
      async () => {
        try {
          const bookcases = await getBookcases();

          if (!active) {
            return;
          }

          const found = bookcases.find(
            (item) => item.id === bookcaseId
          );

          setBookcase(found || null);
        } catch (error) {
          console.error(error);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [bookcaseId, user?.id]);

  const books = useMemo(() => {
    if (!bookcase) return [];

    const ids = new Set(bookcase.journalIds || []);
    return (journals || []).filter((journal) => ids.has(journal.id));
  }, [bookcase, journals]);

  async function removeFromBookcase(journalId) {
    if (!bookcase?.id) {
      return;
    }

    const nextJournalIds =
      (bookcase.journalIds || []).filter(
        (id) => id !== journalId
      );

    try {
      const updated = await updateBookcaseRecord(
        bookcase.id,
        {
          journalIds: nextJournalIds,
        }
      );

      setBookcase(updated);
    } catch (error) {
      console.error(error);
    }
  }

  if (!bookcase) {
    return (
      <div className="bookcase-page-shell">
        <div className="bookcase-page-header">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="bookcase-page-back"
          >
            ← Back to your library
          </button>
        </div>

        <div className="bookcase-page-empty">
          <h1>Bookcase not found</h1>
          <p>This bookcase may have been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookcase-page-shell">
      <div className="bookcase-page-header">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="bookcase-page-back"
        >
          ← Back to your library
        </button>

        <div className="bookcase-page-title-wrap">
          <span>Bookcase</span>
          <h1>{bookcase.name}</h1>
          <p>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </p>
        </div>
      </div>

      <section className="bookcase-page-content">
        {loading ? (
          <div className="bookcase-page-loading">
            Loading your books...
          </div>
        ) : books.length ? (
          <div className="bookcase-page-journal-grid">
            {books.map((journal) => (
              <div key={journal.id} className="bookcase-page-journal-item">
                <JournalCard
                  journal={journal}
                  readOnly={false}
                  navigationState={{
                    fromBookcaseId: bookcase.id,
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeFromBookcase(journal.id)}
                  className="bookcase-page-remove"
                >
                  Remove from bookcase
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bookcase-page-empty">
            <h2>This bookcase is empty</h2>
            <p>Books you place here will appear on this shelf.</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bookcase-page-back"
            >
              Return to your library
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
