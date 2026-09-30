import { useEffect, useState } from 'react';

import {
  getMyJournals,
  getSharedJournals,
} from '../services/journalService';

import { supabase } from '../services/supabase';

import AdminPanel from './AdminPanel';

import { useAuth } from '../context/AuthContext';

import { useNavigate } from 'react-router-dom';


export default function UserProfileSidebar({
  open,
  onClose,
  user,
  onSignOut,
}) {

  const [
    journalCount,
    setJournalCount,
  ] = useState(0);

  const [
    sharedJournalCount,
    setSharedJournalCount,
  ] = useState(0);

  const [
    penName,
    setPenName,
  ] = useState('');

  const [
    savingPenName,
    setSavingPenName,
  ] = useState(false);

  const [
    saveMessage,
    setSaveMessage,
  ] = useState('');

  const [
    loadingCounts,
    setLoadingCounts,
  ] = useState(false);

  const { isAdmin } = useAuth();

  const [
    adminPanelOpen,
    setAdminPanelOpen,
  ] = useState(false);

  const navigate =
    useNavigate();


  /* =======================================================
     LOAD PEN NAME
  ======================================================= */

  useEffect(() => {

    if (!user) {
      return;
    }

    setPenName(
      user.user_metadata?.pen_name || ''
    );

  }, [user]);


  /* =======================================================
     LOAD JOURNAL COUNTS
  ======================================================= */

  useEffect(() => {

    if (!open || !user) {
      return;
    }

    let cancelled = false;


    async function loadCounts() {

      setLoadingCounts(true);

      try {

        const [
          journals,
          sharedJournals,
        ] = await Promise.all([
          getMyJournals(),
          getSharedJournals(),
        ]);


        if (cancelled) {
          return;
        }


        setJournalCount(
          journals?.length || 0
        );

        setSharedJournalCount(
          sharedJournals?.length || 0
        );

      } catch (error) {

        if (cancelled) {
          return;
        }

        console.error(
          'Failed to load profile counts:',
          error
        );

        setJournalCount(0);
        setSharedJournalCount(0);

      } finally {

        if (!cancelled) {
          setLoadingCounts(false);
        }

      }

    }


    loadCounts();


    return () => {
      cancelled = true;
    };

  }, [open, user]);


  /* =======================================================
     CLOSE WITH ESCAPE
  ======================================================= */

  useEffect(() => {

    if (!open) {
      return;
    }


    function handleEscape(event) {

      if (event.key === 'Escape') {
        onClose();
      }

    }


    document.addEventListener(
      'keydown',
      handleEscape
    );


    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };

  }, [open, onClose]);


  /* =======================================================
     PREVENT PAGE SCROLL WHILE SIDEBAR IS OPEN
  ======================================================= */

  useEffect(() => {

    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';


    return () => {

      document.body.style.overflow =
        originalOverflow;

    };

  }, [open]);


  /* =======================================================
     SAVE PEN NAME
  ======================================================= */

  async function handleSavePenName() {

    setSavingPenName(true);
    setSaveMessage('');


    try {

      const trimmedPenName =
        penName.trim();


      const { error } =
        await supabase.auth.updateUser({
          data: {
            pen_name:
              trimmedPenName || null,
          },
        });


      if (error) {
        throw error;
      }


      const { error: profileError } =
        await supabase
          .from('profiles')
          .update({
            pen_name:
              trimmedPenName || null,
          })
          .eq(
            'id',
            user.id
          );


      if (profileError) {
        throw profileError;
      }


      setPenName(trimmedPenName);
      setSaveMessage('Saved');

    } catch (error) {

      console.error(
        'Failed to save pen name:',
        error
      );

      setSaveMessage(
        'Could not save'
      );

    } finally {

      setSavingPenName(false);

    }

  }


  return (
    <>

      <AdminPanel
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />

      {/* =====================================================
          SIDEBAR OVERLAY
      ===================================================== */}

      <div
        className={`
          fixed
          inset-0
          z-[9998]
          bg-black/20
          backdrop-blur-[1px]
          transition-opacity
          duration-300
          ${
            open
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }
        `}
        onClick={onClose}
        aria-hidden="true"
      />


      {/* =====================================================
          PROFILE SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed
          right-0
          top-0
          z-[9999]
          flex
          h-dvh
          w-[min(360px,88vw)]
          flex-col
          border-l
          border-ink/15
          bg-paper
          shadow-2xl
          transition-transform
          duration-300
          ease-out
          ${
            open
              ? 'translate-x-0'
              : 'translate-x-full'
          }
        `}
        aria-label="User profile"
        aria-hidden={!open}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-ink/10
            px-5
            py-5
          "
        >

          <div>

            <p
              className="
                font-mono
                text-[11px]
                uppercase
                tracking-[0.2em]
                text-ink/50
              "
            >
              Your profile
            </p>

            <h2
              className="
                mt-1
                font-display
                text-2xl
                italic
                text-ink
              "
            >
              About you
            </h2>

            {/* REGISTERED EMAIL */}

            <p
              className="
                mt-2
                break-all
                font-mono
                text-xs
                text-ink/55
              "
            >
              {user?.email || 'No email available'}
            </p>

          </div>


          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-ink/15
              text-ink/70
              transition
              hover:bg-ink/5
              hover:text-ink
            "
            aria-label="Close profile"
            title="Close profile"
          >

            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >

              <path d="M6 6l12 12" />

              <path d="M18 6L6 18" />

            </svg>

          </button>

        </div>


        {/* =================================================
            PROFILE CONTENT
        ================================================= */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-5
            py-6
          "
        >

          {/* =================================================
              PEN NAME
          ================================================= */}

          <section>

            <label
              htmlFor="profile-pen-name"
              className="
                font-mono
                text-xs
                uppercase
                tracking-[0.15em]
                text-ink/55
              "
            >
              Pen name
            </label>


            <div
              className="
                mt-2
                flex
                gap-2
              "
            >

              <input
                id="profile-pen-name"
                type="text"
                value={penName}
                onChange={(event) => {

                  setPenName(
                    event.target.value
                  );

                  setSaveMessage('');

                }}
                onKeyDown={(event) => {

                  if (event.key === 'Enter') {
                    handleSavePenName();
                  }

                }}
                placeholder="Write under a name..."
                maxLength={60}
                className="
                  min-w-0
                  flex-1
                  rounded-lg
                  border
                  border-ink/15
                  bg-white/50
                  px-3
                  py-2.5
                  font-mono
                  text-sm
                  text-ink
                  outline-none
                  transition
                  placeholder:text-ink/30
                  focus:border-ink/35
                  focus:bg-white/70
                "
              />


              <button
                type="button"
                onClick={handleSavePenName}
                disabled={savingPenName}
                className="
                  rounded-lg
                  border
                  border-ink/20
                  px-3
                  py-2
                  font-mono
                  text-xs
                  text-ink
                  transition
                  hover:bg-ink
                  hover:text-paper
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {savingPenName
                  ? '...'
                  : 'Save'}
              </button>

            </div>


            {saveMessage && (

              <p
                className="
                  mt-2
                  font-mono
                  text-[11px]
                  text-ink/50
                "
              >
                {saveMessage}
              </p>

            )}

          </section>


          <div
            className="
              my-7
              border-t
              border-ink/10
            "
          />


          {/* =================================================
              COLLABORATION
          ================================================= */}

          <section>

            <button
              type="button"
              onClick={() => {

                onClose();

                navigate('/collaboration');

              }}
              className="
                flex
                w-full
                items-center
                justify-between
                rounded-xl
                border
                border-ink/10
                bg-white/30
                px-4
                py-4
                text-left
                transition
                hover:border-ink/20
                hover:bg-white/50
              "
            >

              <div>

                <p
                  className="
                    font-display
                    text-lg
                    text-ink
                  "
                >
                  Collaboration
                </p>

                <p
                  className="
                    mt-0.5
                    font-mono
                    text-[11px]
                    text-ink/45
                  "
                >
                  Create and work on shared books
                </p>

              </div>


              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-ink/50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <path d="M9 18l6-6-6-6" />

              </svg>

            </button>

          </section>


          <div
            className="
              my-7
              border-t
              border-ink/10
            "
          />


          {/* =================================================
              ADMIN PANEL
          ================================================= */}

          {isAdmin && (

            <section>

              <button
                type="button"
                onClick={() => setAdminPanelOpen(true)}
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-ink/10
                  bg-white/30
                  px-4
                  py-4
                  text-left
                  transition
                  hover:border-ink/20
                  hover:bg-white/50
                "
              >

                <div>

                  <p
                    className="
                      font-display
                      text-lg
                      text-ink
                    "
                  >
                    Admin panel
                  </p>

                  <p
                    className="
                      mt-0.5
                      font-mono
                      text-[11px]
                      text-ink/45
                    "
                  >
                    Manage who can feature journals
                  </p>

                </div>


                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-ink/50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >

                  <path d="M9 18l6-6-6-6" />

                </svg>

              </button>

            </section>

          )}


          {/* =================================================
              LIBRARY COUNTS
          ================================================= */}

          <section
            className={isAdmin ? 'mt-8' : ''}
          >

            <p
              className="
                font-mono
                text-xs
                uppercase
                tracking-[0.15em]
                text-ink/55
              "
            >
              Your library
            </p>


            <div
              className="
                mt-4
                space-y-3
              "
            >

              {/* MY NOTEBOOKS */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-ink/10
                  bg-white/30
                  px-4
                  py-4
                "
              >

                <div>

                  <p
                    className="
                      font-display
                      text-lg
                      text-ink
                    "
                  >
                    My notebooks
                  </p>

                  <p
                    className="
                      mt-0.5
                      font-mono
                      text-[11px]
                      text-ink/45
                    "
                  >
                    Notebooks you created
                  </p>

                </div>


                <span
                  className="
                    font-display
                    text-3xl
                    text-ink
                  "
                >
                  {loadingCounts
                    ? '—'
                    : journalCount}
                </span>

              </div>


              {/* SHARED NOTEBOOKS */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-ink/10
                  bg-white/30
                  px-4
                  py-4
                "
              >

                <div>

                  <p
                    className="
                      font-display
                      text-lg
                      text-ink
                    "
                  >
                    Shared notebooks
                  </p>

                  <p
                    className="
                      mt-0.5
                      font-mono
                      text-[11px]
                      text-ink/45
                    "
                  >
                    Notebooks shared with you
                  </p>

                </div>


                <span
                  className="
                    font-display
                    text-3xl
                    text-ink
                  "
                >
                  {loadingCounts
                    ? '—'
                    : sharedJournalCount}
                </span>

              </div>

            </div>

          </section>

        </div>


        {/* =================================================
            SIGN OUT
        ================================================= */}

        <div
          className="
            border-t
            border-ink/10
            px-5
            py-5
          "
        >

          <button
            type="button"
            onClick={onSignOut}
            className="
              w-full
              rounded-lg
              bg-ink
              px-4
              py-3
              text-left
              font-mono
              text-xs
              uppercase
              tracking-[0.12em]
              text-paper
              shadow-sm
              transition
              hover:bg-black
              hover:shadow-md
            "
          >
            Sign out
          </button>

        </div>

      </aside>

    </>
  );
}