import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPublicJournal } from '../services/journalService';
import { recordPublicShareView } from '../services/shareService';
import { supabase } from '../services/supabase';
import { useAsync } from '../hooks/useAsync';
import Loading from '../components/Loading';
import Button from '../components/Button';

export default function PublicShareLanding() {
  const { shareToken } = useParams();
  const navigate = useNavigate();

  const [senderPenName, setSenderPenName] = useState('');


  useEffect(() => {

    if (!shareToken) {
      return;
    }

    recordPublicShareView(shareToken).catch(() => {
      // The journal should still open even if analytics are unavailable.
    });

  }, [shareToken]);


  /* =======================================================
     LOAD SHARER'S PEN NAME
     -------------------------------------------------------
     Gets the pen name belonging to the owner of the
     shared journal. This is separate from the journal's
     author_name because the sender should be identified
     using their account pen name.
  ======================================================= */

  useEffect(() => {

    if (!shareToken) {
      return;
    }

    let cancelled = false;


    async function loadSenderPenName() {

      const {
        data,
        error,
      } = await supabase.rpc(
        'get_public_journal_sender_pen_name',
        {
          p_share_token:
            shareToken,
        }
      );


      if (cancelled) {
        return;
      }


      if (error) {

        console.error(
          'Failed to load shared-book sender pen name:',
          error
        );

        return;
      }


      setSenderPenName(
        typeof data === 'string'
          ? data.trim()
          : ''
      );

    }


    loadSenderPenName();


    return () => {
      cancelled = true;
    };

  }, [shareToken]);


  const {
    data: journal,
    loading,
    error,
  } = useAsync(
    () => getPublicJournal(shareToken),
    [shareToken]
  );


  if (loading) {
    return <Loading label="Opening shared book" />;
  }


  if (error || !journal) {

    return (
      <section className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">

        <div className="page-card w-full max-w-lg bg-paper p-8 text-center">

          <h1 className="mb-3 font-display text-2xl">
            This shared book is unavailable
          </h1>


          <p className="mb-6 text-sm text-ink-soft">
            The link may be invalid or the book may no longer be available.
          </p>


          <Button onClick={() => navigate('/')}>
            Go home
          </Button>

        </div>

      </section>
    );

  }


  /*
    The shared-book sender should use the account's pen name.

    The journal author name is kept as a fallback so existing
    shared links still display a name if the account does not
    have a pen name saved.
  */

  const senderName =
    senderPenName ||
    journal.author_name?.trim() ||
    'Someone';


  return (
    <section className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">

      <div className="page-card w-full max-w-xl bg-paper p-8 text-center sm:p-12">


        {/* =================================================
            SHARED BOOK ICON
        ================================================= */}

        <div className="mb-6 flex justify-center">

          <div
            className="
              flex
              h-24
              w-24
              items-center
              justify-center
              rounded-full
              border
              border-ink/15
              bg-white/40
            "
          >

            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 text-ink"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >

              {/* Left page */}

              <path
                d="M10 13.5C17.5 11.5 25 13 32 17V53C25 49 17.5 47.5 10 49.5V13.5Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />


              {/* Right page */}

              <path
                d="M54 13.5C46.5 11.5 39 13 32 17V53C39 49 46.5 47.5 54 49.5V13.5Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />


              {/* Center spine */}

              <path
                d="M32 17V53"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />


              {/* Page lines */}

              <path
                d="M15.5 21C20 20.5 24.5 21.5 28 23.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.55"
              />


              <path
                d="M15.5 27C20 26.5 24.5 27.5 28 29.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.55"
              />


              <path
                d="M48.5 21C44 20.5 39.5 21.5 36 23.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.55"
              />


              <path
                d="M48.5 27C44 26.5 39.5 27.5 36 29.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.55"
              />

            </svg>

          </div>

        </div>


        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          A book was shared with you
        </p>


        <h1 className="mb-8 font-display text-3xl leading-tight sm:text-4xl">
          {senderName} shared a book with you
        </h1>


        <Button
          onClick={() => navigate(`/shared/${shareToken}/book`)}
        >
          Open the book →
        </Button>


      </div>

    </section>
  );
}