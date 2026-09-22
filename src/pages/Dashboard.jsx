import { useEffect, useRef, useState } from 'react';
import {
  createJournal,
  deleteJournal,
  getMyJournals,
  getSharedJournals,
  uploadJournalCover,
  updateJournalCoverImages,
  getSafeCreateJournalErrorMessage,
} from '../services/journalService';
import { useAsync } from '../hooks/useAsync';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { materialOptions } from '../components/NotebookCover';
import JournalCard from '../components/JournalCard';
import Bookcase from '../components/Bookcase';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';
import CoverImageEditor, {
  createCoverImages,
} from '../components/CoverImageEditor';


const DEFAULT_COVER_SETTINGS = {
  x: 0,
  y: 0,
  zoom: 1,
};


export default function Dashboard() {

  const { isAdmin, user } = useAuth();

  const {
    data: journals,
    loading,
    refetch,
  } = useAsync(getMyJournals);


  const {
    data: sharedJournals,
    loading: sharedLoading,
    refetch: refetchSharedJournals,
  } = useAsync(getSharedJournals);


  const [
    removingSharedId,
    setRemovingSharedId,
  ] = useState(null);

  const [
    sharedJournalToRemove,
    setSharedJournalToRemove,
  ] = useState(null);


  /* =======================================================
     BOOK SELECTION + BOOKCASES
     -------------------------------------------------------
     Desktop: use the Select button.
     Mobile: selection starts with a long press on a book.
  ======================================================= */

  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);

  const [
    selectedJournalIds,
    setSelectedJournalIds,
  ] = useState([]);

  const [
    bookcases,
    setBookcases,
  ] = useState([]);

  const [
    bookcaseName,
    setBookcaseName,
  ] = useState('');

  const [
    showBookcaseForm,
    setShowBookcaseForm,
  ] = useState(false);

  const [
    bookcaseToDelete,
    setBookcaseToDelete,
  ] = useState(null);

  const [
    bookcaseToEdit,
    setBookcaseToEdit,
  ] = useState(null);

  const [
    selectedBooksToDelete,
    setSelectedBooksToDelete,
  ] = useState(false);

  const [
    deletingSelectedBooks,
    setDeletingSelectedBooks,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const bookcaseStorageKey =
    user?.id
      ? `between-us-bookcases-${user.id}`
      : null;

  useEffect(() => {

    if (!bookcaseStorageKey) {
      setBookcases([]);
      return;
    }

    try {
      const saved =
        window.localStorage.getItem(
          bookcaseStorageKey
        );

      const parsed = saved ? JSON.parse(saved) : [];

      setBookcases(
        Array.isArray(parsed) ? parsed : []
      );
    } catch (error) {
      console.error(error);
      setBookcases([]);
    }

  }, [bookcaseStorageKey]);

  function saveBookcases(nextBookcases) {
    if (!bookcaseStorageKey) {
      return;
    }

    window.localStorage.setItem(
      bookcaseStorageKey,
      JSON.stringify(nextBookcases)
    );

    setBookcases(nextBookcases);
  }

  function enterSelectionMode(journalId) {

    setSelectionMode(true);

    setSelectedJournalIds((current) =>
      current.includes(journalId)
        ? current
        : [...current, journalId]
    );

  }

  function toggleJournalSelection(journalId) {

    setSelectedJournalIds((current) => {
      if (current.includes(journalId)) {
        return current.filter((id) => id !== journalId);
      }

      return [...current, journalId];
    });

  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedJournalIds([]);
  }

  function openBookcaseForm() {
    if (!selectedJournalIds.length) {
      return;
    }

    setBookcaseName('');
    setShowBookcaseForm(true);
  }

  function createBookcase() {

    const name =
      bookcaseName.trim() ||
      'New bookcase';

    const nextBookcases = [
      ...bookcases,
      {
        id: `bookcase-${Date.now()}`,
        name,
        journalIds: [...selectedJournalIds],
      },
    ];

    saveBookcases(nextBookcases);

    setShowBookcaseForm(false);
    setBookcaseName('');
    exitSelectionMode();
  }

  function addToBookcase(bookcaseId) {

    const nextBookcases = bookcases.map((bookcase) => {
      if (bookcase.id !== bookcaseId) {
        return bookcase;
      }

      return {
        ...bookcase,
        journalIds: [
          ...new Set([
            ...(bookcase.journalIds || []),
            ...selectedJournalIds,
          ]),
        ],
      };
    });

    saveBookcases(nextBookcases);
    exitSelectionMode();
  }

  function removeFromBookcase(bookcaseId, journalId) {

    const nextBookcases = bookcases.map((bookcase) =>
      bookcase.id === bookcaseId
        ? {
            ...bookcase,
            journalIds: (bookcase.journalIds || []).filter(
              (id) => id !== journalId
            ),
          }
        : bookcase
    );

    saveBookcases(nextBookcases);
  }

  function deleteBookcase(bookcaseId) {

    const nextBookcases = bookcases.filter(
      (bookcase) => bookcase.id !== bookcaseId
    );

    saveBookcases(nextBookcases);
    setBookcaseToDelete(null);
  }

  function openBookcaseEdit(bookcase) {
    setBookcaseName(bookcase.name || '');
    setBookcaseToEdit(bookcase);
  }

  function updateBookcaseName() {
    if (!bookcaseToEdit) {
      return;
    }

    const name =
      bookcaseName.trim() ||
      'New bookcase';

    const nextBookcases = bookcases.map((bookcase) =>
      bookcase.id === bookcaseToEdit.id
        ? {
            ...bookcase,
            name,
          }
        : bookcase
    );

    saveBookcases(nextBookcases);
    setBookcaseToEdit(null);
    setBookcaseName('');
  }

  async function deleteSelectedBooks() {

    if (!selectedJournalIds.length) {
      return;
    }

    setDeletingSelectedBooks(true);

    try {
      await Promise.all(
        selectedJournalIds.map((journalId) =>
          deleteJournal(journalId)
        )
      );

      const deletedIds = new Set(
        selectedJournalIds
      );

      const nextBookcases = bookcases
        .map((bookcase) => ({
          ...bookcase,
          journalIds: (bookcase.journalIds || []).filter(
            (id) => !deletedIds.has(id)
          ),
        }))
        .filter(
          (bookcase) => bookcase.journalIds.length
        );

      saveBookcases(nextBookcases);

      setDeletingSelectedBooks(false);
      setSelectedBooksToDelete(false);
      exitSelectionMode();
      await refetch();

    } catch (error) {

      console.error(error);

      setErrorMessage(
        'Could not delete the selected books. Please try again.'
      );

      setDeletingSelectedBooks(false);
      setSelectedBooksToDelete(false);
    }
  }


  const [
    showForm,
    setShowForm,
  ] = useState(false);


  const [
    compactMobileView,
    setCompactMobileView,
  ] = useState(false);


  const [
    sharedView,
    setSharedView,
  ] = useState('editor');


  /*
    JOURNAL SEARCH + SORTING
    -------------------------------------------------------
    These controls only affect the journal library shown
    above. They do not change the journals stored in
    Supabase or the Shared with you section.
  */

  const [
    journalSearch,
    setJournalSearch,
  ] = useState('');


  const [
    showJournalSearch,
    setShowJournalSearch,
  ] = useState(false);


  const [
    journalSort,
    setJournalSort,
  ] = useState('recent');


  /*
    ADMIN ONLY

    Controls which library view the admin is currently
    looking at.

    "library"   = normal journals
    "featured"  = featured/sample journals
  */

  const [
    adminLibraryView,
    setAdminLibraryView,
  ] = useState('library');


  const [
    title,
    setTitle,
  ] = useState('');


  const [
    description,
    setDescription,
  ] = useState('');


  const [
    authorName,
    setAuthorName,
  ] = useState('');


  const [
    journalDate,
    setJournalDate,
  ] = useState('');


  /* =======================================================
     OPTION A — FEATURE AS SAMPLE JOURNAL
  ======================================================= */

  const [
    isSample,
    setIsSample,
  ] = useState(false);


  const [
    creating,
    setCreating,
  ] = useState(false);


  const [
    frontImageUrl,
    setFrontImageUrl,
  ] = useState('');


  const [
    backImageUrl,
    setBackImageUrl,
  ] = useState('');


  const [
    frontImageFile,
    setFrontImageFile,
  ] = useState(null);


  const [
    backImageFile,
    setBackImageFile,
  ] = useState(null);


  const [
    frontSettings,
    setFrontSettings,
  ] = useState(
    DEFAULT_COVER_SETTINGS
  );


  const [
    backSettings,
    setBackSettings,
  ] = useState(
    DEFAULT_COVER_SETTINGS
  );


  const [
    coverMaterial,
    setCoverMaterial,
  ] = useState('kraft');


  const [
    coverColor,
    setCoverColor,
  ] = useState('#c9a876');


  const [
    spineColor,
    setSpineColor,
  ] = useState('#8a6f47');


  /*
    Keep the current preview URLs in refs so we only revoke
    the old object URL that is actually being replaced.

    This is important because revoking both URLs whenever
    either image changes can make the other cover preview
    disappear or show a broken image.
  */

  const frontImageUrlRef =
    useRef('');

  const backImageUrlRef =
    useRef('');


  useEffect(() => {

    return () => {

      if (frontImageUrlRef.current) {

        URL.revokeObjectURL(
          frontImageUrlRef.current
        );

      }


      if (backImageUrlRef.current) {

        URL.revokeObjectURL(
          backImageUrlRef.current
        );

      }

    };

  }, []);


  /* =======================================================
     SEPARATE ADMIN JOURNAL VIEWS
     -------------------------------------------------------
     This separation is ONLY used for admins.

     Normal users continue to see all journals returned
     from getMyJournals() exactly as before.
  ======================================================= */

  const normalJournals =
    (journals ?? []).filter(
      (journal) =>
        journal.is_sample !== true
    );


  const featuredJournals =
    (journals ?? []).filter(
      (journal) =>
        journal.is_sample === true
    );


  /*
    For admins, choose the journals displayed by the
    selected library view.

    For normal users, use the original journal list.
  */

  const displayedJournals =
    isAdmin
      ? adminLibraryView === 'featured'
        ? featuredJournals
        : normalJournals
      : (journals ?? []);


  /* Journals already placed in a bookcase are hidden from Your Library. */
  const bookcasedJournalIds = new Set(
    bookcases.flatMap((bookcase) => bookcase.journalIds || [])
  );

  const libraryJournals =
    displayedJournals.filter(
      (journal) => !bookcasedJournalIds.has(journal.id)
    );


  /* =======================================================
     FILTER + SORT JOURNALS
  ======================================================= */

  const normalizedJournalSearch =
    journalSearch
      .trim()
      .toLowerCase();


  const filteredAndSortedJournals =
    [...libraryJournals]
      .filter((journal) => {

        if (!normalizedJournalSearch) {
          return true;
        }


        const searchableText = [
          journal.title,
          journal.description,
          journal.author_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


        return searchableText.includes(
          normalizedJournalSearch
        );

      })
      .sort((a, b) => {

        if (journalSort === 'az') {

          return (a.title || 'Untitled journal')
            .localeCompare(
              b.title || 'Untitled journal',
              undefined,
              { sensitivity: 'base' }
            );

        }


        if (journalSort === 'za') {

          return (b.title || 'Untitled journal')
            .localeCompare(
              a.title || 'Untitled journal',
              undefined,
              { sensitivity: 'base' }
            );

        }


        if (journalSort === 'oldest') {

          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );

        }


        if (journalSort === 'newest') {

          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );

        }


        /*
          Default: recently updated.
          Fall back to created_at for older records.
        */

        return (
          new Date(
            b.updated_at || b.created_at || 0
          ).getTime() -
          new Date(
            a.updated_at || a.created_at || 0
          ).getTime()
        );

      });


  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetForm() {

    if (frontImageUrlRef.current) {

      URL.revokeObjectURL(
        frontImageUrlRef.current
      );

      frontImageUrlRef.current = '';

    }


    if (backImageUrlRef.current) {

      URL.revokeObjectURL(
        backImageUrlRef.current
      );

      backImageUrlRef.current = '';

    }


    setTitle('');
    setDescription('');
    setAuthorName('');
    setJournalDate('');

    /* OPTION A */
    setIsSample(false);

    setFrontImageUrl('');
    setBackImageUrl('');

    setFrontImageFile(null);
    setBackImageFile(null);

    setFrontSettings(
      DEFAULT_COVER_SETTINGS
    );

    setBackSettings(
      DEFAULT_COVER_SETTINGS
    );

    setCoverMaterial('kraft');
    setCoverColor('#c9a876');

  }


  /* =======================================================
     FRONT IMAGE
  ======================================================= */

  function handleFrontImageChange(e) {

    const file =
      e.target.files?.[0] ||
      null;


    if (!file) {
      return;
    }


    if (frontImageUrlRef.current) {

      URL.revokeObjectURL(
        frontImageUrlRef.current
      );

    }


    const url =
      URL.createObjectURL(file);


    frontImageUrlRef.current =
      url;


    setFrontImageFile(file);
    setFrontImageUrl(url);


    setFrontSettings(
      DEFAULT_COVER_SETTINGS
    );

  }


  /* =======================================================
     BACK IMAGE
  ======================================================= */

  function handleBackImageChange(e) {

    const file =
      e.target.files?.[0] ||
      null;


    if (!file) {
      return;
    }


    if (backImageUrlRef.current) {

      URL.revokeObjectURL(
        backImageUrlRef.current
      );

    }


    const url =
      URL.createObjectURL(file);


    backImageUrlRef.current =
      url;


    setBackImageFile(file);
    setBackImageUrl(url);


    setBackSettings(
      DEFAULT_COVER_SETTINGS
    );

  }


  /* =======================================================
     CREATE JOURNAL
  ======================================================= */

  async function handleCreate(e) {

    e.preventDefault();

    setCreating(true);


    try {

      /*
        First create the journal record.
      */

      const journal =
        await createJournal({

          title,

          description,

          authorName,

          journalDate,

          coverMaterial,

          coverColor,

          spineColor,

          /* OPTION A */
          isSample,

        });


      /*
        Get the adjusted front/back images.
      */

      const croppedImages =
        (
          frontImageUrl ||
          backImageUrl
        )
          ? await createCoverImages()
          : {
              front: null,
              back: null,
            };


      let frontUrl = null;
      let backUrl = null;


      /*
        Upload FRONT image.
      */

      if (croppedImages.front) {

        const frontFile =
          new File(
            [
              croppedImages.front,
            ],
            frontImageFile?.name ||
              'front-cover.jpg',
            {
              type:
                'image/jpeg',
            }
          );


        frontUrl =
          await uploadJournalCover(
            journal.id,
            frontFile,
            'front'
          );

      }


      /*
        Upload BACK image.
      */

      if (croppedImages.back) {

        const backFile =
          new File(
            [
              croppedImages.back,
            ],
            backImageFile?.name ||
              'back-cover.jpg',
            {
              type:
                'image/jpeg',
            }
          );


        backUrl =
          await uploadJournalCover(
            journal.id,
            backFile,
            'back'
          );

      }


      /*
        Save the two URLs separately.
      */

      if (
        frontUrl ||
        backUrl
      ) {

        await updateJournalCoverImages(
          journal.id,
          frontUrl,
          backUrl
        );

      }


      resetForm();

      setShowForm(false);

      refetch();

    } catch (error) {

      console.error(error);

      const errorMessage =
        getSafeCreateJournalErrorMessage(error);


      setErrorMessage(
        `Could not create the journal.\n\n${errorMessage}`
      );

    } finally {

      setCreating(false);

    }

  }


  /* =======================================================
     REMOVE SHARED JOURNAL FROM MY LIBRARY
     -------------------------------------------------------
     This removes ONLY the current user's access.
     It does NOT delete the owner's journal.
  ======================================================= */

  async function handleRemoveShared(
    journalAccessId
  ) {

    setRemovingSharedId(
      journalAccessId
    );


    try {

      const {
        error,
      } = await supabase.rpc(
        'leave_shared_journal',
        {
          p_journal_access_id:
            journalAccessId,
        }
      );


      if (error) {
        throw error;
      }


      await refetchSharedJournals();

    } catch (error) {

      console.error(error);

      setErrorMessage(
        'Could not remove the shared journal. Please try again.'
      );

    } finally {

      setRemovingSharedId(
        null
      );

    }

  }


  return (

    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">

      <div className="mb-8 flex items-center justify-between">

        <h1 className="font-display text-3xl">
          My Library
        </h1>


        {/* =================================================
            ORIGINAL NEW JOURNAL BUTTON
        ================================================= */}

        <Button
          onClick={() =>
            setShowForm(
              (v) => !v
            )
          }
        >
          {showForm
            ? 'Cancel'
            : 'New journal'}
        </Button>

      </div>


      {showForm && (

        <form
          onSubmit={handleCreate}
          className="
            page-card
            mb-10
            flex
            flex-col
            gap-4
            p-6
          "
        >

          <Input
            id="title"
            label="Title (optional)"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
          />


          <Input
            id="description"
            label="Description (optional)"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
          />


          <Input
            id="author-name"
            label="By / Author (optional)"
            value={authorName}
            onChange={(e) =>
              setAuthorName(
                e.target.value
              )
            }
          />


          <Input
            id="journal-date"
            label="Date (optional)"
            type="date"
            value={journalDate}
            onChange={(e) =>
              setJournalDate(
                e.target.value
              )
            }
          />


          {/* =================================================
              OPTION A — FEATURE AS SAMPLE JOURNAL
          ================================================= */}

          {isAdmin && (

            <label
              htmlFor="sample-journal"
              className="
                flex
                cursor-pointer
                items-start
                gap-3
                rounded-lg
                border
                border-ink/10
                bg-ink/[0.02]
                p-4
                transition
                hover:border-ink/20
              "
            >

              <input
                id="sample-journal"
                type="checkbox"
                checked={isSample}
                onChange={(e) =>
                  setIsSample(
                    e.target.checked
                  )
                }
                className="
                  mt-1
                  h-4
                  w-4
                  accent-ink
                "
              />

              <span>

                <span
                  className="
                    block
                    font-mono
                    text-xs
                    uppercase
                    tracking-wide
                    text-ink
                  "
                >
                  Feature as a sample journal
                </span>

                <span
                  className="
                    mt-1
                    block
                    font-body
                    text-xs
                    leading-5
                    text-ink-soft
                  "
                >
                  This journal will appear in Explore as a
                  public, view-only sample work.
                </span>

              </span>

            </label>

          )}


          {/* =================================================
              FRONT COVER IMAGE
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-2
            "
          >

            <label
              htmlFor="front-cover"
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              Front cover image
            </label>


            <input
              id="front-cover"
              type="file"
              accept="image/*"
              onChange={
                handleFrontImageChange
              }
              className="
                input-field
              "
            />

          </div>


          {/* =================================================
              BACK COVER IMAGE
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-2
            "
          >

            <label
              htmlFor="back-cover"
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              Back cover image
            </label>


            <input
              id="back-cover"
              type="file"
              accept="image/*"
              onChange={
                handleBackImageChange
              }
              className="
                input-field
              "
            />

          </div>


          {/* =================================================
              COVER IMAGE EDITOR
          ================================================= */}

          {(
            frontImageUrl ||
            backImageUrl
          ) && (

            <CoverImageEditor

              frontImageUrl={
                frontImageUrl
              }

              backImageUrl={
                backImageUrl
              }

              frontSettings={
                frontSettings
              }

              backSettings={
                backSettings
              }

              onFrontChange={
                setFrontSettings
              }

              onBackChange={
                setBackSettings
              }

            />

          )}


          {/* =================================================
              COVER MATERIAL
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-1
            "
          >

            <label
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              Cover material
            </label>


            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              {materialOptions.map(
                (m) => (

                  <button
                    type="button"
                    key={m.value}
                    onClick={() =>
                      setCoverMaterial(
                        m.value
                      )
                    }
                    className={`
                      rounded-md
                      border
                      px-3
                      py-1.5
                      font-body
                      text-sm
                      ${
                        coverMaterial ===
                        m.value
                          ? 'border-margin bg-margin/10 text-margin'
                          : 'border-ink/15 hover:border-margin/50'
                      }
                    `}
                  >
                    {m.label}
                  </button>

                )
              )}

            </div>

          </div>


          {/* =================================================
              COVER COLOR
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-1
            "
          >

            <label
              htmlFor="cover-color"
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              Cover color
            </label>


            <input
              id="cover-color"
              type="color"
              value={coverColor}
              onChange={(e) =>
                setCoverColor(
                  e.target.value
                )
              }
              className="
                h-10
                w-16
                cursor-pointer
                rounded-md
                border
                border-ink/15
                bg-transparent
              "
            />

          </div>


          {/* =================================================
              SPINE COLOR
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-1
            "
          >

            <label
              htmlFor="spine-color"
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              Spine color
            </label>


            <input
              id="spine-color"
              type="color"
              value={spineColor}
              onChange={(e) =>
                setSpineColor(
                  e.target.value
                )
              }
              className="
                h-10
                w-16
                cursor-pointer
                rounded-md
                border
                border-ink/15
                bg-transparent
              "
            />

          </div>


          {/* =================================================
              CREATE BUTTON
          ================================================= */}

          <Button
            type="submit"
            disabled={creating}
            className="self-start"
          >
            {creating
              ? 'Creating…'
              : 'Create journal'}
          </Button>

        </form>

      )}


      {/* =====================================================
          LIBRARY / FEATURED BOOKS VIEW
          -----------------------------------------------------
          ADMIN ONLY

          Admins can switch between:
          - Your library
          - Featured books

          Normal users do not see this switch.
      ===================================================== */}

      <section className="mb-10 sm:mb-12">

        <div
          className="
            mb-3
            flex
            flex-wrap
            items-center
            justify-between
            gap-2
            sm:mb-4
            sm:gap-3
          "
        >

          <div className="flex items-center gap-2">

            <h2
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              {isAdmin
                ? adminLibraryView === 'featured'
                  ? 'Featured books'
                  : 'Your journals'
                : 'Your journals'}
            </h2>


            <span
              className="
                font-mono
                text-[10px]
                uppercase
                tracking-wide
                text-ink-soft/70
              "
            >
              · {filteredAndSortedJournals.length}{' '}
              {filteredAndSortedJournals.length === 1
                ? adminLibraryView === 'featured' && isAdmin
                  ? 'book'
                  : 'journal'
                : adminLibraryView === 'featured' && isAdmin
                  ? 'books'
                  : 'journals'}
            </span>

          </div>


          {/* =================================================
              ADMIN ONLY VIEW SWITCH
          ================================================= */}

          {isAdmin && (

            <div
              className="
                flex
                items-center
                gap-1
                rounded-full
                border
                border-ink/10
                bg-ink/5
                p-1
                font-mono
                text-[10px]
                uppercase
                tracking-wide
              "
            >

              <button
                type="button"
                onClick={() =>
                  setAdminLibraryView(
                    'library'
                  )
                }
                className={`
                  rounded-full
                  px-3
                  py-1.5
                  transition
                  ${
                    adminLibraryView ===
                    'library'
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-ink/5'
                  }
                `}
              >
                Your library
              </button>


              <button
                type="button"
                onClick={() =>
                  setAdminLibraryView(
                    'featured'
                  )
                }
                className={`
                  rounded-full
                  px-3
                  py-1.5
                  transition
                  ${
                    adminLibraryView ===
                    'featured'
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-ink/5'
                  }
                `}
              >
                Featured books
              </button>

            </div>

          )}


          {/* =================================================
              JOURNAL SEARCH + SORTING
          ================================================= */}

          <div
            className="
              flex
              w-full
              items-center
              justify-end
              gap-2
            "
          >

          {/* =================================================
              DESKTOP SELECT BUTTON
          ================================================= */}

          {(!isAdmin || adminLibraryView === 'library') && (

            <button
              type="button"
              onClick={() => {
                if (selectionMode) {
                  exitSelectionMode();
                } else {
                  setSelectionMode(true);
                }
              }}
              className="
                hidden
                h-9
                items-center
                justify-center
                rounded-md
                border
                border-ink/25
                bg-transparent
                px-3
                font-mono
                text-[10px]
                uppercase
                tracking-wide
                text-ink-soft
                transition
                hover:border-ink/40
                hover:bg-ink/5
                md:flex
              "
            >
              {selectionMode ? 'Cancel select' : 'Select'}
            </button>

          )}


          {/* =================================================
              MOBILE BOOK LAYOUT TOGGLE
              -------------------------------------------------
              Still available for the normal library view.
          ================================================= */}

          {(
            !isAdmin ||
            adminLibraryView === 'library'
          ) && (

            <button
              type="button"
              onClick={() =>
                setCompactMobileView(
                  (value) => !value
                )
              }
              className="
                flex
                h-9
                w-9
                mr-auto
                items-center
                justify-center
                rounded-md
                border
                border-ink/25
                bg-transparent
                text-ink-soft
                transition
                hover:border-ink/30
                hover:bg-ink/5
                md:hidden
              "
              aria-label={
                compactMobileView
                  ? 'Show larger journal covers'
                  : 'Show compact journal covers'
              }
              title={
                compactMobileView
                  ? 'Larger view'
                  : 'Compact view'
              }
            >

              {compactMobileView ? (

                <svg
                  viewBox="0 0 24 24"
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >

                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="1.5"
                  />

                  <path d="M4 9h16" />

                  <path d="M9 4v16" />

                </svg>

              ) : (

                <svg
                  viewBox="0 0 24 24"
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >

                  <rect
                    x="4"
                    y="3"
                    width="16"
                    height="18"
                    rx="1.5"
                  />

                  <path d="M8 3v18" />

                  <path d="M8 7h8" />

                </svg>

              )}

            </button>

          )}





            {showJournalSearch && (

              <div
                className="
                  relative
                  w-full
                  sm:w-64
                "
              >

                <svg
                  viewBox="0 0 24 24"
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    text-ink-soft
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={journalSearch}
                  onChange={(e) =>
                    setJournalSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search journals..."
                  aria-label="Search journals"
                  autoFocus
                  className="
                    h-9
                    w-full
                    rounded-md
                    border
                    border-ink/25
                    bg-transparent
                    pl-9
                    pr-3
                    font-body
                    text-sm
                    text-ink
                    outline-none
                    transition
                    placeholder:text-ink-soft
                    focus:border-ink/50
                    focus:ring-0
                  "
                />

              </div>

            )}


            <button
              type="button"
              onClick={() =>
                setShowJournalSearch(
                  (value) => !value
                )
              }
              aria-label={
                showJournalSearch
                  ? 'Close journal search'
                  : 'Search journals'
              }
              title={
                showJournalSearch
                  ? 'Close search'
                  : 'Search journals'
              }
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-md
                border
                border-ink/25
                bg-transparent
                text-ink
                transition
                hover:border-ink/45
                hover:bg-ink/5
              "
            >

              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

            </button>


            <select
              value={journalSort}
              onChange={(e) =>
                setJournalSort(
                  e.target.value
                )
              }
              aria-label="Sort journals"
              className="
                h-9
                cursor-pointer
                rounded-md
                border
                border-ink/25
                bg-transparent
                px-3
                font-body
                text-sm
                text-ink
                outline-none
                transition
                hover:border-ink/45
                focus:border-ink/50
              "
            >
              <option value="recent">Recently updated</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>


          </div>


        </div>


        {selectionMode && (

          <div
            className="
              mb-4
              flex
              flex-wrap
              items-center
              justify-between
              gap-2
              rounded-xl
              border
              border-ink/15
              bg-paper/70
              px-3
              py-2.5
              shadow-sm

          "
          >

            <span
              className="
                font-mono
                text-xs
                uppercase
                tracking-wide
                text-ink-soft
              "
            >
              {selectedJournalIds.length} selected
            </span>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={openBookcaseForm}
                disabled={!selectedJournalIds.length}
                className="rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink transition hover:border-ink/40 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                New bookcase
              </button>

              {bookcases.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addToBookcase(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={!selectedJournalIds.length}
                  className="h-8 rounded-md border border-ink/20 bg-transparent px-2 font-mono text-[10px] uppercase tracking-wide text-ink outline-none disabled:opacity-40"
                  aria-label="Add selected books to bookcase"
                >
                  <option value="">Add to bookcase</option>
                  {bookcases.map((bookcase) => (
                    <option key={bookcase.id} value={bookcase.id}>
                      {bookcase.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!selectedJournalIds.length) return;
                  setSelectedBooksToDelete(true);
                }}
                disabled={!selectedJournalIds.length || deletingSelectedBooks}
                className="rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink transition hover:border-ink/40 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete selected
              </button>

              <button
                type="button"
                onClick={exitSelectionMode}
                disabled={deletingSelectedBooks}
                className="rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft transition hover:bg-ink/5 hover:text-ink disabled:opacity-40"
              >
                Cancel
              </button>

            </div>

          </div>

        )}


        {loading ? (

          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              rounded-xl
              border
              border-ink/15
              bg-ink/[0.02]
              px-6
              py-10
              text-ink-soft
            "
          >

            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 animate-spin"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                strokeOpacity="0.25"
              />
              <path d="M21 12a9 9 0 0 0-9-9" />
            </svg>

            <span
              className="
                font-body
                text-sm
              "
            >
              Loading your journals...
            </span>

          </div>

        ) : filteredAndSortedJournals.length ? (

          <div
            className={`
              grid
              gap-4
              sm:gap-6
              sm:grid-cols-2
              md:grid-cols-3
              ${
                compactMobileView &&
                (
                  !isAdmin ||
                  adminLibraryView === 'library'
                )
                  ? 'grid-cols-3 gap-3'
                  : 'grid-cols-1'
              }
            `}
          >

            {filteredAndSortedJournals.map(
              (j) => (

                <JournalCard
                  key={j.id}
                  journal={j}
                  selectionMode={selectionMode}
                  selected={selectedJournalIds.includes(j.id)}
                  onStartSelection={enterSelectionMode}
                  onToggleSelection={toggleJournalSelection}
                  compactMobile={
                    compactMobileView &&
                    (
                      !isAdmin ||
                      adminLibraryView === 'library'
                    )
                  }
                />

              )
            )}

          </div>

        ) : (

          <div
            role="status"
            aria-live="polite"
            className="
              rounded-xl
              border
              border-ink/15
              bg-ink/[0.02]
              px-6
              py-10
              text-center
            "
          >

            <div
              className="
                mx-auto
                mb-4
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                border
                border-ink/15
                text-ink-soft
              "
            >

              {journalSearch.trim() ? (

                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

              ) : (

                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
                  <path d="M8 8h8" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>

              )}

            </div>

            <h3
              className="
                font-display
                text-xl
                text-ink
              "
            >
              {journalSearch.trim()
                ? 'No journals found'
                : isAdmin &&
                  adminLibraryView === 'featured'
                  ? 'Your featured shelf is empty'
                  : 'Your shelf is waiting for its first story'}
            </h3>

            <p
              className="
                mx-auto
                mt-2
                max-w-md
                font-body
                text-sm
                leading-6
                text-ink-soft
              "
            >
              {journalSearch.trim()
                ? 'Try a different title, description, or author name.'
                : isAdmin &&
                  adminLibraryView === 'featured'
                  ? 'Create a sample journal and feature it here for readers to discover.'
                  : 'Create your first journal and start filling it with words, memories, and ideas.'}
            </p>

            {!journalSearch.trim() && (

              <Button
                type="button"
                onClick={() =>
                  setShowForm(true)
                }
                className="mt-5"
              >
                {isAdmin &&
                adminLibraryView === 'featured'
                  ? 'Create sample journal'
                  : 'Create your first journal'}
              </Button>

            )}

          </div>

        )}

      </section>


      {/* =====================================================
          BOOKCASES
      ===================================================== */}

      {bookcases.length > 0 && (

        <section className="mb-10 sm:mb-12">

          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">

            <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              Your bookcases
            </h2>

          </div>

          <div className="bookcases-container">
            {bookcases.map((bookcase) => (
              <Bookcase
                key={bookcase.id}
                bookcase={bookcase}
                journals={journals ?? []}
                onRemoveBook={(journalId) =>
                  removeFromBookcase(bookcase.id, journalId)
                }
                onDelete={() =>
                  setBookcaseToDelete(bookcase)
                }
                onRename={() =>
                  openBookcaseEdit(bookcase)
                }
              />
            ))}
          </div>

        </section>

      )}


      {/* =====================================================
          SHARED JOURNALS
      ===================================================== */}

      <section>

        <div
          className="
            mb-3
            flex
            flex-wrap
            items-center
            justify-between
            gap-2
            sm:mb-4
            sm:gap-3
          "
        >

          <h2
            className="
              font-mono
              text-xs
              uppercase
              tracking-wide
              text-ink-soft
            "
          >
            Shared with you
          </h2>


          <div
            className="
              flex
              items-center
              gap-1
              rounded-full
              border
              border-ink/10
              bg-ink/5
              p-1
              font-mono
              text-[10px]
              uppercase
              tracking-wide
            "
          >

            <button
              type="button"
              onClick={() =>
                setSharedView('editor')
              }
              className={`
                rounded-full
                px-3
                py-1.5
                transition
                ${
                  sharedView === 'editor'
                    ? 'bg-ink text-paper'
                    : 'text-ink-soft hover:bg-ink/5'
                }
              `}
            >
              Editors
            </button>


            <button
              type="button"
              onClick={() =>
                setSharedView('viewer')
              }
              className={`
                rounded-full
                px-3
                py-1.5
                transition
                ${
                  sharedView === 'viewer'
                    ? 'bg-ink text-paper'
                    : 'text-ink-soft hover:bg-ink/5'
                }
              `}
            >
              Viewers
            </button>

          </div>

        </div>


        {sharedLoading ? (

          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              rounded-xl
              border
              border-ink/15
              bg-ink/[0.02]
              px-6
              py-10
              text-ink-soft
            "
          >

            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 animate-spin"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                strokeOpacity="0.25"
              />
              <path d="M21 12a9 9 0 0 0-9-9" />
            </svg>

            <span
              className="
                font-body
                text-sm
              "
            >
              Loading shared journals...
            </span>

          </div>

        ) : (

          (() => {

            const filteredSharedJournals =
              (sharedJournals ?? []).filter(
                (j) =>
                  (j.access_role || 'viewer') ===
                  sharedView
              );


            if (!filteredSharedJournals.length) {

              return (

                <div
                  className="
                    rounded-xl
                    border
                    border-ink/15
                    bg-ink/[0.02]
                    px-6
                    py-10
                    text-center
                  "
                >

                  <div
                    className="
                      mx-auto
                      mb-4
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-ink/15
                      text-ink-soft
                    "
                  >

                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                      <circle cx="9.5" cy="7" r="4" />
                      <path d="M17 11l2 2 4-4" />
                    </svg>

                  </div>

                  <h3
                    className="
                      font-display
                      text-xl
                      text-ink
                    "
                  >
                    {sharedView === 'editor'
                      ? 'No shared journals to edit'
                      : 'No shared journals to read'}
                  </h3>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-md
                      font-body
                      text-sm
                      leading-6
                      text-ink-soft
                    "
                  >
                    {sharedView === 'editor'
                      ? 'Journals shared with you as an editor will appear here.'
                      : 'Journals shared with you as a viewer will appear here.'}
                  </p>

                </div>

              );

            }


            return (

              <div
                className="
                  grid
                  grid-cols-1
                  gap-6
                  sm:grid-cols-2
                  md:grid-cols-3
                "
              >

                {filteredSharedJournals.map(
                  (j) => (

                    <div
                      key={j.id}
                      className="relative"
                    >

                      <JournalCard
                        journal={j}
                        readOnly={
                          sharedView === 'viewer'
                        }
                      />


                      {j.access_id && (

                        <button
                          type="button"
                          onClick={(e) => {

                            e.stopPropagation();


                            if (
                              !removingSharedId
                            ) {

                              setSharedJournalToRemove(
                                j
                              );

                            }

                          }}
                          disabled={
                            removingSharedId ===
                            j.access_id
                          }
                          className="
                            absolute
                            right-2
                            top-2
                            z-20
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-ink/15
                            bg-paper/90
                            text-ink-soft
                            shadow-sm
                            transition
                            hover:border-ink/30
                            hover:bg-paper
                            hover:text-ink
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                          aria-label="Remove from Shared with you"
                          title="Remove from Shared with you"
                        >

                          {removingSharedId ===
                          j.access_id ? (

                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4 animate-spin"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >

                              <circle
                                cx="12"
                                cy="12"
                                r="9"
                                strokeOpacity="0.25"
                              />

                              <path
                                d="M21 12a9 9 0 0 0-9-9"
                              />

                            </svg>

                          ) : (

                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >

                              <path d="M6 6l12 12" />

                              <path d="M18 6L6 18" />

                            </svg>

                          )}

                        </button>

                      )}

                    </div>

                  )
                )}

              </div>

            );

          })()

        )}

      </section>


      {showBookcaseForm && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          onClick={() => setShowBookcaseForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink">Create a bookcase</h2>
            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              Give this bookcase a name for your selected books.
            </p>

            <input
              type="text"
              value={bookcaseName}
              onChange={(e) => setBookcaseName(e.target.value)}
              placeholder="e.g. Memories"
              autoFocus
              className="mt-5 h-10 w-full rounded-md border border-ink/20 bg-transparent px-3 font-body text-sm text-ink outline-none focus:border-ink/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createBookcase();
              }}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBookcaseForm(false)}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink/30 hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createBookcase}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-paper transition hover:opacity-90"
              >
                Create bookcase
              </button>
            </div>
          </div>
        </div>

      )}


      {selectedBooksToDelete && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          onClick={() => {
            if (!deletingSelectedBooks) {
              setSelectedBooksToDelete(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink">Delete selected books?</h2>
            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              Are you sure you want to delete {selectedJournalIds.length} selected {selectedJournalIds.length === 1 ? 'book' : 'books'}? This cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedBooksToDelete(false)}
                disabled={deletingSelectedBooks}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink/30 hover:bg-ink/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelectedBooks}
                disabled={deletingSelectedBooks}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-paper transition hover:opacity-90 disabled:opacity-50"
              >
                {deletingSelectedBooks ? 'Deleting…' : 'Delete books'}
              </button>
            </div>
          </div>
        </div>

      )}


      {bookcaseToEdit && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          onClick={() => setBookcaseToEdit(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-bookcase-title"
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="edit-bookcase-title"
              className="font-display text-xl text-ink"
            >
              Edit bookcase
            </h2>

            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              Change the name of this bookcase.
            </p>

            <div className="mt-5">
              <label
                htmlFor="edit-bookcase-name"
                className="mb-2 block font-mono text-xs uppercase tracking-wide text-ink-soft"
              >
                Bookcase name
              </label>
              <input
                id="edit-bookcase-name"
                type="text"
                value={bookcaseName}
                onChange={(e) => setBookcaseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateBookcaseName();
                  }
                }}
                autoFocus
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 font-body text-sm text-ink outline-none transition focus:border-ink/30"
                placeholder="Bookcase name"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setBookcaseToEdit(null);
                  setBookcaseName('');
                }}
                className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink/30 hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateBookcaseName}
                className="rounded-lg bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-paper transition hover:opacity-90"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>

      )}


      {bookcaseToDelete && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          onClick={() => setBookcaseToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink">Delete this bookcase?</h2>
            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              The books inside will not be deleted. Only this bookcase will be removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setBookcaseToDelete(null)} className="rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-ink-soft">Cancel</button>
              <button type="button" onClick={() => deleteBookcase(bookcaseToDelete.id)} className="rounded-lg bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-paper">Delete bookcase</button>
            </div>
          </div>
        </div>

      )}


      {errorMessage && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-ink/30
            px-4
            backdrop-blur-sm
          "
          onClick={() => setErrorMessage('')}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-error-title"
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-ink/10
              bg-paper
              p-6
              shadow-xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              className="
                mb-5
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div>

                <h2
                  id="dashboard-error-title"
                  className="
                    font-display
                    text-xl
                    text-ink
                  "
                >
                  Something went wrong
                </h2>

                <p
                  className="
                    mt-2
                    whitespace-pre-line
                    font-body
                    text-sm
                    leading-6
                    text-ink-soft
                  "
                >
                  {errorMessage}
                </p>

              </div>

              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  text-ink-soft
                  transition
                  hover:bg-ink/5
                  hover:text-ink
                "
                aria-label="Close"
              >

                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>

              </button>

            </div>

            <div className="flex justify-end">

              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="
                  rounded-lg
                  bg-ink
                  px-4
                  py-2.5
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-paper
                  transition
                  hover:opacity-90
                "
              >
                Okay
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          REMOVE SHARED JOURNAL CONFIRMATION POPUP
      ===================================================== */}

      {sharedJournalToRemove && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-ink/30
            px-4
            backdrop-blur-sm
          "
          onClick={() => {

            if (!removingSharedId) {

              setSharedJournalToRemove(null);

            }

          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-shared-title"
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-ink/10
              bg-paper
              p-6
              shadow-xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              className="
                mb-5
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div>

                <h2
                  id="remove-shared-title"
                  className="
                    font-display
                    text-xl
                    text-ink
                  "
                >
                  Remove shared journal?
                </h2>


                <p
                  className="
                    mt-2
                    font-body
                    text-sm
                    leading-6
                    text-ink-soft
                  "
                >
                  Are you sure you want to remove this
                  book from Shared with you?
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSharedJournalToRemove(null)
                }
                disabled={
                  !!removingSharedId
                }
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  text-ink-soft
                  transition
                  hover:bg-ink/5
                  hover:text-ink
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label="Close"
              >

                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >

                  <path d="M6 6l12 12" />

                  <path d="M18 6L6 18" />

                </svg>

              </button>

            </div>


            <div
              className="
                mb-6
                rounded-xl
                border
                border-ink/10
                bg-ink/[0.03]
                p-4
              "
            >

              <p
                className="
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-ink-soft
              "
              >
                {sharedJournalToRemove.title ||
                  'Untitled journal'}
              </p>


              <p
                className="
                  mt-2
                  font-body
                  text-xs
                  leading-5
                  text-ink-soft
                "
              >
                This only removes your access. The
                owner's original journal and its contents
                will not be deleted.
              </p>

            </div>


            <div
              className="
                flex
                justify-end
                gap-3
              "
            >

              <button
                type="button"
                onClick={() =>
                  setSharedJournalToRemove(null)
                }
                disabled={
                  !!removingSharedId
                }
                className="
                  rounded-lg
                  border
                  border-ink/15
                  px-4
                  py-2.5
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-ink-soft
                  transition
                  hover:border-ink/30
                  hover:bg-ink/5
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={async () => {

                  if (
                    sharedJournalToRemove?.access_id
                  ) {

                    await handleRemoveShared(
                      sharedJournalToRemove.access_id
                    );

                    setSharedJournalToRemove(
                      null
                    );

                  }

                }}
                disabled={
                  !!removingSharedId
                }
                className="
                  rounded-lg
                  bg-ink
                  px-4
                  py-2.5
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-paper
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {removingSharedId
                  ? 'Removing…'
                  : 'Remove book'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}