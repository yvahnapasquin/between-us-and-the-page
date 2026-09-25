import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

export default function Bookcase({
  bookcase,
  journals,
  onDelete,
  onRename,
}) {
  const navigate = useNavigate();

  const shelfButtonRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [bookcaseWidth, setBookcaseWidth] = useState(null);

  const books = (bookcase.journalIds || [])
    .map((id) =>
      journals.find((journal) => journal.id === id)
    )
    .filter(Boolean);

  useLayoutEffect(() => {
    const element = shelfButtonRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;

      if (width > 0) {
        setBookcaseWidth(width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [books.length]);

  useEffect(() => {
    function handleWindowResize() {
      const element = shelfButtonRef.current;

      if (!element) {
        return;
      }

      const width = element.getBoundingClientRect().width;

      if (width > 0) {
        setBookcaseWidth(width);
      }
    }

    window.addEventListener(
      'resize',
      handleWindowResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleWindowResize
      );
    };
  }, []);

  return (
    <div
      className="bookcase-card"
      style={{
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <div
        className="bookcase-shelf-wrap"
        style={{
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <button
          ref={shelfButtonRef}
          type="button"
          className="bookcase-shelf-button"
          onClick={() =>
            navigate(`/bookcase/${bookcase.id}`)
          }
          aria-label={`Open ${bookcase.name}`}
        >
          <div className="bookcase-shelf">
            <div className="bookcase-spines">
              {books.length ? (
                books.map((journal) => (
                  <span
                    key={journal.id}
                    className="bookcase-spine"
                    style={{
                      '--book-spine-color':
                        journal.spine_color ||
                        journal.cover_color ||
                        '#8a6f47',
                    }}
                    title={
                      journal.title ||
                      'Untitled journal'
                    }
                  >
                    <span>
                      {journal.title || 'Untitled'}
                    </span>
                  </span>
                ))
              ) : (
                <span className="bookcase-empty">
                  Empty bookcase
                </span>
              )}
            </div>

            <div className="bookcase-shelf-line" />
          </div>
        </button>
      </div>

      <div
        className="bookcase-name-row"
        style={{
          width: bookcaseWidth
            ? `${bookcaseWidth}px`
            : '100%',
          maxWidth: bookcaseWidth
            ? `${bookcaseWidth}px`
            : '100%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            width: 0,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <h3
            className="bookcase-title"
            title={bookcase.name}
            style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {bookcase.name}
          </h3>

          <p className="bookcase-count">
            {books.length}{' '}
            {books.length === 1
              ? 'book'
              : 'books'}
          </p>
        </div>

        <div
          className="bookcase-actions relative"
          style={{
            flex: '0 0 auto',
            position: 'relative',
            zIndex: 30,
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();

              setShowMenu(
                (current) => !current
              );
            }}
            className="bookcase-action"
            aria-label="Edit bookcase"
            aria-expanded={showMenu}
            title="Edit bookcase"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4.5 19.5L5.35 15.85L15.85 5.35C16.68 4.52 18.03 4.52 18.86 5.35L18.65 5.14C19.48 5.97 19.48 7.32 18.65 8.15L8.15 18.65L4.5 19.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M14.6 6.6L17.4 9.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M4.5 19.5L8.15 18.65"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg border border-ink/10 bg-paper shadow-lg"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onRename();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}