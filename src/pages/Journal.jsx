import {
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react';

import {
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  deleteJournal,
  getJournal,
  getPublicJournal,
  getPublicPoems,
} from '../services/journalService';

import {
  getMyJournalAccess,
} from '../services/shareService';

import {
  createPoem,
  getPoemsForJournal,
  updatePoemWidgetBox,
  updatePoemImageBox,
} from '../services/poemService';

import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';

import NotebookCover, {
  InsideCoverPanel,
} from '../components/NotebookCover';

import Loading from '../components/Loading';
import ShareModal from '../components/ShareModal';
import SpotifyPlayer from '../components/SpotifyPlayer';
import DraggableWidget from '../components/DraggableWidget';
import EditJournalModal from '../components/EditJournalModal';


/* =========================================================
   CONSTANTS
========================================================= */

const TURN_DURATION = 720;

const TOC_ITEMS_PER_PAGE = 6;

const POEM_FIRST_PAGE_LINES = 10;
const POEM_CONTINUATION_LINES = 12;


/* =========================================================
   POEM TEXT STYLE STORAGE
========================================================= */

const POEM_STYLE_STORAGE_KEY =
  'between-us-poem-text-styles';


const TOC_SECTION_STORAGE_KEY =
  'between-us-toc-sections';


const DEFAULT_POEM_TEXT_STYLES = {

  title: {
    fontFamily:
      'Georgia, "Times New Roman", serif',

    fontSize:
      24,

    fontWeight:
      400,

    fontStyle:
      'normal',

    textAlign:
      'left',

    letterSpacing:
      0,

    lineHeight:
      1.2,

    color:
      '#2b2a27',
  },


  date: {
    fontFamily:
      'monospace',

    fontSize:
      10,

    fontWeight:
      400,

    fontStyle:
      'normal',

    textAlign:
      'left',

    letterSpacing:
      1,

    lineHeight:
      1.4,

    color:
      '#77736b',
  },


  content: {
    fontFamily:
      'Georgia, "Times New Roman", serif',

    fontSize:
      16,

    fontWeight:
      400,

    fontStyle:
      'normal',

    textAlign:
      'left',

    letterSpacing:
      0,

    lineHeight:
      1.5,

    color:
      '#2b2a27',
  },

};


/* =========================================================
   STYLE HELPERS
========================================================= */

function getStoredPoemStyles(poemId) {

  if (
    typeof window === 'undefined'
  ) {
    return DEFAULT_POEM_TEXT_STYLES;
  }


  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          POEM_STYLE_STORAGE_KEY
        ) || '{}'
      );


    const poemStyles =
      stored[poemId];


    if (!poemStyles) {

      return DEFAULT_POEM_TEXT_STYLES;

    }


    return {

      ...DEFAULT_POEM_TEXT_STYLES,

      ...poemStyles,

      title: {
        ...DEFAULT_POEM_TEXT_STYLES.title,
        ...(poemStyles.title || {}),
      },

      date: {
        ...DEFAULT_POEM_TEXT_STYLES.date,
        ...(poemStyles.date || {}),
      },

      content: {
        ...DEFAULT_POEM_TEXT_STYLES.content,
        ...(poemStyles.content || {}),
      },

    };

  } catch {

    return DEFAULT_POEM_TEXT_STYLES;

  }

}


function saveStoredPoemStyles(
  poemId,
  styles
) {

  if (
    typeof window === 'undefined'
  ) {
    return;
  }


  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          POEM_STYLE_STORAGE_KEY
        ) || '{}'
      );


    stored[poemId] =
      styles;


    localStorage.setItem(
      POEM_STYLE_STORAGE_KEY,
      JSON.stringify(stored)
    );

  } catch {
    // Ignore localStorage errors.
  }

}


/* =========================================================
   POEM TEXT PAGINATION
========================================================= */

function wrapPoemText(
  text,
  style = DEFAULT_POEM_TEXT_STYLES.content
) {

  const source =
    String(text ?? '');


  const canvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : null;


  const context =
    canvas?.getContext('2d');


  if (context) {

    context.font =
      `${style.fontStyle || 'normal'} ` +
      `${style.fontWeight || 400} ` +
      `${style.fontSize || 16}px ` +
      `${style.fontFamily || 'Georgia'}`;

  }


  const maxWidth = 276;


  function measure(value) {

    if (!context) {

      return (
        value.length *
        Number(style.fontSize || 16) *
        0.5
      );

    }


    return context.measureText(
      value
    ).width;

  }


  const lines = [];


  const originalLines =
    source.split('\n');


  originalLines.forEach(
    (originalLine) => {

      if (
        originalLine.length === 0
      ) {

        lines.push('');

        return;

      }


      const words =
        originalLine.split(/\s+/);


      let currentLine = '';


      words.forEach(
        (word) => {

          const candidate =
            currentLine
              ? `${currentLine} ${word}`
              : word;


          if (
            measure(candidate) <=
            maxWidth
          ) {

            currentLine =
              candidate;

            return;

          }


          if (!currentLine) {

            let partial = '';


            for (
              const character of word
            ) {

              const candidatePart =
                partial + character;


              if (
                partial &&
                measure(candidatePart) >
                  maxWidth
              ) {

                lines.push(
                  partial
                );


                partial =
                  character;

              } else {

                partial =
                  candidatePart;

              }

            }


            currentLine =
              partial;


            return;

          }


          lines.push(
            currentLine
          );


          currentLine =
            word;

        }
      );


      if (currentLine) {

        lines.push(
          currentLine
        );

      }

    }
  );


  return lines;

}


/* =========================================================
   POEM PAGINATION
========================================================= */

function paginatePoem(
  poem,
  styles
) {

  const lines =
    wrapPoemText(
      poem?.content ?? '',
      styles?.content ||
        DEFAULT_POEM_TEXT_STYLES.content
    );


  if (!lines.length) {

    return [''];

  }


  const pages = [];

  let position = 0;

  let pageNumber = 0;


  while (
    position < lines.length
  ) {

    const linesPerPage =
      pageNumber === 0
        ? POEM_FIRST_PAGE_LINES
        : POEM_CONTINUATION_LINES;


    pages.push(
      lines
        .slice(
          position,
          position +
            linesPerPage
        )
        .join('\n')
    );


    position +=
      linesPerPage;


    pageNumber += 1;

  }


  return pages;

}


/* =========================================================
   TABLE OF CONTENTS PAGINATION
========================================================= */

function buildTocItems(
  poems,
  sections
) {

  const safeSections =
    Array.isArray(sections)
      ? sections
      : [];


  const items = [];


  const addSectionsAfter = (
    afterPoemIndex
  ) => {

    safeSections
      .filter(
        (section) =>
          Number(section.afterPoemIndex) ===
          afterPoemIndex
      )
      .forEach((section) => {

        items.push({
          type: 'section',
          section,
        });

      });

  };


  addSectionsAfter(-1);


  poems.forEach((poem, index) => {

    items.push({
      type: 'poem',
      poem,
      poemIndex: index,
    });


    addSectionsAfter(index);

  });


  return items;

}


function paginateToc(
  items
) {

  const pages = [];


  for (
    let index = 0;
    index < items.length;
    index += TOC_ITEMS_PER_PAGE
  ) {

    pages.push(
      items.slice(
        index,
        index +
          TOC_ITEMS_PER_PAGE
      )
    );

  }


  if (!pages.length) {

    pages.push([]);

  }


  return pages;

}


/* =========================================================
   JOURNAL
========================================================= */

export default function Journal() {

  const {
    journalId,
    shareToken,
  } = useParams();


  const isPublicView =
    Boolean(shareToken);


  const navigate =
    useNavigate();


  const location =
    useLocation();


  const searchParams =
    new URLSearchParams(
      location.search
    );


  const fromBookcaseId =
    searchParams.get(
      'fromBookcase'
    );


  const fromCollaborationId =
    searchParams.get(
      'fromCollaboration'
    );


  const {
    user,
  } = useAuth();


  /* =======================================================
     BOOK LOCATION
  ======================================================= */

  const [
    currentLocation,
    setCurrentLocation,
  ] = useState(1);


  const [
    flippedPapers,
    setFlippedPapers,
  ] = useState(
    () => new Set()
  );


  const [
    isTurning,
    setIsTurning,
  ] = useState(false);


  const turningPaperRef =
    useRef(null);


  const locationRef =
    useRef(1);


  /* =======================================================
     MODALS
  ======================================================= */

  const [
    showShare,
    setShowShare,
  ] = useState(false);


  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);


  const [
    journalOverride,
    setJournalOverride,
  ] = useState(null);


  /* =======================================================
     IMAGE WIDGET STATE
  ======================================================= */

  const [
    imageWidgets,
    setImageWidgets,
  ] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem(
          'imageWidgets'
        ) || '{}'
      );

    } catch {

      return {};

    }

  });


  /* =======================================================
     POEM TEXT STYLE STATE
  ======================================================= */

  const [
    poemTextStyles,
    setPoemTextStyles,
  ] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem(
          POEM_STYLE_STORAGE_KEY
        ) || '{}'
      );

    } catch {

      return {};

    }

  });


  /* =======================================================
     LOAD JOURNAL
  ======================================================= */

  const {
    data: journal,
    loading: journalLoading,
  } = useAsync(
    () =>
      isPublicView
        ? getPublicJournal(
            shareToken
          )
        : getJournal(
            journalId
          ),
    [journalId, shareToken, isPublicView]
  );


  const {
    data: journalAccess,
  } = useAsync(
    () =>
      isPublicView
        ? Promise.resolve(null)
        : getMyJournalAccess(journalId),
    [journalId, isPublicView]
  );


  /* =======================================================
     LOAD POEMS
  ======================================================= */

  const {
    data: poems,
    loading: poemsLoading,
  } = useAsync(
    () =>
      isPublicView
        ? getPublicPoems(
            shareToken
          )
        : getPoemsForJournal(
            journalId
          ),
    [journalId, shareToken, isPublicView]
  );


  const activeJournal =
    journalOverride ??
    journal;


  const safePoems =
    poems ?? [];


  /* =======================================================
     TABLE OF CONTENTS SECTIONS
  ======================================================= */

  const [
    tocSections,
    setTocSections,
  ] = useState([]);


  useEffect(() => {

    if (!activeJournal?.id) {
      setTocSections([]);
      return;
    }


    const storageKey =
      `${TOC_SECTION_STORAGE_KEY}-${activeJournal.id}`;


    try {

      const stored =
        JSON.parse(
          localStorage.getItem(storageKey) ||
            '[]'
        );


      setTocSections(
        Array.isArray(stored)
          ? stored
          : []
      );

    } catch {

      setTocSections([]);

    }

  }, [activeJournal?.id]);


  useEffect(() => {

    if (!activeJournal?.id) {
      return;
    }


    const storageKey =
      `${TOC_SECTION_STORAGE_KEY}-${activeJournal.id}`;


    try {

      localStorage.setItem(
        storageKey,
        JSON.stringify(tocSections)
      );

    } catch {
      // Ignore localStorage errors.
    }

  }, [
    activeJournal?.id,
    tocSections,
  ]);


  /* =======================================================
     RECENTLY OPENED JOURNALS
  ======================================================= */

  useEffect(() => {

    if (
      isPublicView ||
      !user?.id ||
      !journal?.id
    ) {
      return;
    }

    if (journal.owner_id !== user.id) {
      return;
    }

    const storageKey =
      `between-us-recently-opened-${user.id}`;

    try {
      const stored =
        JSON.parse(
          localStorage.getItem(storageKey) ||
            '[]'
        );

      const current =
        Array.isArray(stored)
          ? stored
          : [];

      const next = [
        {
          id: journal.id,
          openedAt: Date.now(),
        },
        ...current.filter(
          (item) => item?.id !== journal.id
        ),
      ].slice(0, 5);

      localStorage.setItem(
        storageKey,
        JSON.stringify(next)
      );
    } catch (error) {
      console.error(error);
    }

  }, [
    journal,
    user,
    isPublicView,
  ]);


  const isOwner =
    !isPublicView &&
    journal &&
    user &&
    journal.owner_id ===
      user.id;


  const canEdit =
    Boolean(isOwner) ||
    journalAccess?.role === 'editor';


  /* =======================================================
     KEEP LOCATION REF SYNCHRONIZED
  ======================================================= */

  locationRef.current =
    currentLocation;


  /* =======================================================
     PAGINATE TOC
  ======================================================= */

  const tocItems =
    useMemo(
      () =>
        buildTocItems(
          safePoems,
          tocSections
        ),
      [
        safePoems,
        tocSections,
      ]
    );


  const tocPages =
    useMemo(
      () =>
        paginateToc(
          tocItems
        ),
      [tocItems]
    );


  /* =======================================================
     PAGINATE ALL POEMS
  ======================================================= */

  const poemPageEntries =
    useMemo(() => {

      const entries = [];


      safePoems.forEach(
        (poem) => {

          const styles =
            poemTextStyles[poem.id] ||
            getStoredPoemStyles(
              poem.id
            );


          const pages =
            paginatePoem(
              poem,
              styles
            );


          pages.forEach(
            (
              content,
              pageIndex
            ) => {

              entries.push({

                poem,

                content,

                pageNumber:
                  pageIndex + 1,

                totalPages:
                  pages.length,

              });

            }
          );

        }
      );


      return entries;

    }, [
      safePoems,
      poemTextStyles,
    ]);


  /* =======================================================
     LOCK JOURNAL VIEWPORT
  ======================================================= */

  useEffect(() => {

    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow =
      html.style.overflow;

    const previousBodyOverflow =
      body.style.overflow;

    const previousBodyTouchAction =
      body.style.touchAction;

    html.style.overflow =
      'hidden';

    body.style.overflow =
      'hidden';

    body.style.touchAction =
      'none';

    return () => {

      html.style.overflow =
        previousHtmlOverflow;

      body.style.overflow =
        previousBodyOverflow;

      body.style.touchAction =
        previousBodyTouchAction;

    };

  }, []);


  /* =======================================================
     RETURN TO EDITED POEM
  ======================================================= */

  useEffect(() => {

    const returnToPoemId =
      location.state?.returnToPoemId;


    if (
      !returnToPoemId ||
      !poemPageEntries.length
    ) {

      return;

    }


    const poemEntryIndex =
      poemPageEntries.findIndex(
        (entry) =>
          entry.poem.id ===
            returnToPoemId &&
          entry.pageNumber === 1
      );


    if (poemEntryIndex < 0) {
      return;
    }


    const tocPaperCount =
      Math.ceil(
        tocPages.length / 2
      ) +
      (
        tocPages.length % 2 === 0
          ? 1
          : 0
      );


    const targetLocation =
      2 +
      tocPaperCount +
      poemEntryIndex;


    locationRef.current =
      targetLocation;


    setCurrentLocation(
      targetLocation
    );


    setFlippedPapers(
      new Set(
        Array.from(
          {
            length:
              targetLocation - 1,
          },
          (_, index) =>
            index + 1
        )
      )
    );


    navigate(
      location.pathname +
        location.search,
      {
        replace: true,
        state: null,
      }
    );

  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
    poemPageEntries,
    tocPages.length,
  ]);


  /* =======================================================
     COVER DATE
  ======================================================= */

  const date = '';


  /* =======================================================
     BOOK LOCATION LIMIT
  ======================================================= */

  /*
     Count the real papers that are actually rendered below.

     Rendered papers:
     - 1 front-cover paper
     - Table of Contents papers
     - poemPageEntries.length poem papers
     - 1 final inside/back-cover paper
  */

  const tocPaperCount =
    Math.ceil(
      tocPages.length / 2
    ) +
    (
      tocPages.length % 2 === 0
        ? 1
        : 0
    );


  const estimatedPaperCount =
    tocPaperCount +
    poemPageEntries.length +
    2;


  const maxLocation =
    estimatedPaperCount + 1;


  const isClosedFront =
    currentLocation === 1;


  const isClosedBack =
    currentLocation ===
    maxLocation;


  const isOpen =
    !isClosedFront &&
    !isClosedBack;


  /* =======================================================
     FRONT COVER
  ======================================================= */

  const coverFront =
    activeJournal ? (

      <NotebookCover

        title={
          activeJournal.title
        }

        description={
          activeJournal.description
        }

        date={date}

        authorName={
          activeJournal.author_name
        }

        coverColor={
          activeJournal.cover_color
        }

        coverMaterial={
          activeJournal.cover_material
        }

        spineColor={
          activeJournal.spine_color
        }

        coverImageUrl={
          activeJournal.cover_image_url
        }

        journalId={
          journalId
        }

        isOwner={
          isOwner
        }

        onEditJournal={() =>
          setShowEditModal(true)
        }

        onDeleteJournal={
          handleDeleteJournal
        }

      />

    ) : null;


  /* =======================================================
     INSIDE FRONT COVER
  ======================================================= */

  const insideCover =
    activeJournal ? (

      <InsideCoverPanel

        coverColor={
          activeJournal.cover_color
        }

        coverMaterial={
          activeJournal.cover_material
        }

      />

    ) : null;


  /* =======================================================
     TABLE OF CONTENTS SECTION ACTIONS
  ======================================================= */

  function createTocSectionId() {

    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {

      return crypto.randomUUID();

    }


    return `section-${Date.now()}-${Math.random()}`;

  }


  function addTocSection(
    afterPoemIndex = -1
  ) {

    if (!canEdit) {
      return;
    }


    const title =
      window.prompt(
        'Section name',
        'Section 1'
      );


    if (!title?.trim()) {
      return;
    }


    const nextSection = {

      id: createTocSectionId(),

      title: title.trim(),

      afterPoemIndex,

    };


    setTocSections((current) => [
      ...current,
      nextSection,
    ]);

  }


  function editTocSection(section) {

    if (!canEdit) {
      return;
    }


    const title =
      window.prompt(
        'Section name',
        section.title || ''
      );


    if (!title?.trim()) {
      return;
    }


    setTocSections((current) =>
      current.map((item) =>
        item.id === section.id
          ? {
              ...item,
              title: title.trim(),
            }
          : item
      )
    );

  }


  function deleteTocSection(sectionId) {

    if (!canEdit) {
      return;
    }


    const confirmed =
      window.confirm(
        'Remove this section from the table of contents?'
      );


    if (!confirmed) {
      return;
    }


    setTocSections((current) =>
      current.filter(
        (section) =>
          section.id !== sectionId
      )
    );

  }


  /* =======================================================
     CREATE NEW POEM
  ======================================================= */

  async function handleNewPoem() {

    if (!canEdit) {
      return;
    }

    try {

      const poem =
        await createPoem({

          journalId,

          title:
            'Untitled',

          content:
            '',

          displayOrder:
            safePoems.length,

        });


      navigate(
        `/journal/${journalId}/poem/${poem.id}`
      );

    } catch (error) {

      console.error(
        'Failed to create poem:',
        error
      );


      alert(
        'Could not create the poem.'
      );

    }

  }


  /* =======================================================
     DELETE JOURNAL
  ======================================================= */

  async function handleDeleteJournal() {

    try {

      await deleteJournal(
        journalId
      );


      navigate(
        '/dashboard'
      );

    } catch (error) {

      console.error(
        'Failed to delete journal:',
        error
      );


      alert(
        'Could not delete the journal.'
      );

    }

  }


  /* =======================================================
     SAVE IMAGE WIDGET
  ======================================================= */

  function saveImageWidget(
    poemId,
    next
  ) {

    setImageWidgets(
      (previous) => {

        const nextMap = {

          ...previous,

          [poemId]:
            next,

        };


        try {

          localStorage.setItem(
            'imageWidgets',
            JSON.stringify(
              nextMap
            )
          );

        } catch {
          // Ignore localStorage errors.
        }


        return nextMap;

      }
    );


    if (canEdit) {

      updatePoemImageBox(
        poemId,
        next
      ).catch(
        (error) => {

          console.error(
            'Failed to save image position:',
            error
          );

        }
      );

    }

  }


  /* =======================================================
     SAVE POEM TEXT STYLE
  ======================================================= */

  function savePoemTextStyle(
    poemId,
    nextStyles
  ) {

    setPoemTextStyles(
      (previous) => {

        const nextMap = {

          ...previous,

          [poemId]:
            nextStyles,

        };


        saveStoredPoemStyles(
          poemId,
          nextStyles
        );


        return nextMap;

      }
    );

  }


  /* =======================================================
     FINISH PAGE TURN
  ======================================================= */

  function finishTurn() {

    turningPaperRef.current =
      null;


    setIsTurning(
      false
    );

  }


  /* =======================================================
     TURN FORWARD
  ======================================================= */

  function turnForwardOne() {

    if (isTurning) {
      return;
    }


    const location =
      locationRef.current;


    if (
      location >=
      maxLocation
    ) {

      return;

    }


    const paperId =
      location;


    turningPaperRef.current =
      paperId;


    setIsTurning(
      true
    );


    setFlippedPapers(
      (previous) => {

        const next =
          new Set(
            previous
          );


        next.add(
          paperId
        );


        return next;

      }
    );


    const nextLocation =
      location + 1;


    locationRef.current =
      nextLocation;


    setCurrentLocation(
      nextLocation
    );


    window.setTimeout(
      finishTurn,
      TURN_DURATION
    );

  }


  /* =======================================================
     TURN BACKWARD
  ======================================================= */

  function turnBackwardOne() {

    if (isTurning) {
      return;
    }


    const location =
      locationRef.current;


    if (
      location <= 1
    ) {

      return;

    }


    const paperId =
      location - 1;


    turningPaperRef.current =
      paperId;


    setIsTurning(
      true
    );


    setFlippedPapers(
      (previous) => {

        const next =
          new Set(
            previous
          );


        next.delete(
          paperId
        );


        return next;

      }
    );


    const nextLocation =
      location - 1;


    locationRef.current =
      nextLocation;


    setCurrentLocation(
      nextLocation
    );


    window.setTimeout(
      finishTurn,
      TURN_DURATION
    );

  }


  function goNextPage() {
    turnForwardOne();
  }


  function goPreviousPage() {
    turnBackwardOne();
  }


  /* =======================================================
     BUILD PAPER LIST
  ======================================================= */

  const papers = [];


  const poemPaperLocations = [];


  /* =======================================================
     PAPER 1
  ======================================================= */

  papers.push({

    id: 1,

    front: (

      <div

        className="closed-book"

        onClick={(e) => {

          e.stopPropagation();


          if (
            isClosedFront &&
            !isTurning
          ) {

            goNextPage();

          }

        }}

      >

        {coverFront}

      </div>

    ),


    back: (

      <div className="book-left-page">

        {insideCover}

      </div>

    ),

  });


  /* =======================================================
     TABLE OF CONTENTS PAPERS
  ======================================================= */

  /*
     TOC pages are paired exactly like physical book pages:

       TOC 1 | TOC 2
       TOC 3 | TOC 4
       TOC 5 | TOC 6

     TOC page 1 is always on the RIGHT side.
     TOC page 2 is on the LEFT side.

     If the TOC has an ODD number of pages, the final TOC page
     stays on the RIGHT and the LEFT side of that same paper is
     used for POEM 1 MEDIA.

     If the TOC has an EVEN number of pages, the final TOC page
     is on the LEFT, so a separate paper is added with:

       BLANK | POEM 1 MEDIA
  */

  for (
    let tocIndex = 0;
    tocIndex < tocPages.length;
    tocIndex += 2
  ) {

    const rightTocIndex =
      tocIndex;


    const leftTocIndex =
      tocIndex + 1;


    const hasLeftToc =
      leftTocIndex < tocPages.length;


    const isLastTocPaper =
      rightTocIndex ===
      tocPages.length - 1;


    papers.push({

      id:
        papers.length + 1,


      /* RIGHT PAGE */

      front: (

        <div className="book-right-page">

          <TocPage

            journal={
              activeJournal
            }

            items={
              tocPages[rightTocIndex]
            }


            poemsLoading={
              rightTocIndex === 0
                ? poemsLoading
                : false
            }

            isOwner={
              isOwner
            }

            canEdit={
              canEdit
            }

            publicShareViews={
              activeJournal?.public_share_views ?? 0
            }

            onSelectPoem={
              goToPoem
            }

            onShare={() =>
              setShowShare(
                true
              )
            }

            onNewPoem={
              handleNewPoem
            }

            onAddSection={
              addTocSection
            }

            onEditSection={
              editTocSection
            }

            onDeleteSection={
              deleteTocSection
            }

            isContinuation={
              rightTocIndex > 0
            }

          />

        </div>

      ),


      /* LEFT PAGE */

      back:

        hasLeftToc
          ? (

            <div className="book-left-page">

              <TocPage

                journal={
                  activeJournal
                }

                items={
                  tocPages[leftTocIndex]
                }


                poemsLoading={false}

                isOwner={
                  isOwner
                }

                canEdit={
                  canEdit
                }

                publicShareViews={
                  activeJournal?.public_share_views ?? 0
                }

                onSelectPoem={
                  goToPoem
                }

                onShare={() =>
                  setShowShare(
                    true
                  )
                }

                onNewPoem={
                  handleNewPoem
                }

                onAddSection={
                  addTocSection
                }

                onEditSection={
                  editTocSection
                }

                onDeleteSection={
                  deleteTocSection
                }

                isContinuation

              />

            </div>

          )
          : isLastTocPaper &&
            poemPageEntries.length > 0
            ? (

              <PoemMediaPage

                poem={
                  poemPageEntries[0].poem
                }

                imageWidgets={
                  imageWidgets
                }

                isOwner={
                  canEdit
                }

                onSaveImage={
                  saveImageWidget
                }

              />

            )
            : (

              <div className="book-left-page">

                <div className="blank-paper-page" />

              </div>

            ),

    });

  }


  /* =======================================================
     EVEN TOC PAGE COUNT
  ======================================================= */

  if (
    tocPages.length % 2 === 0
  ) {

    papers.push({

      id:
        papers.length + 1,


      front: (

        <div className="book-right-page">

          <div className="blank-paper-page" />

        </div>

      ),


      back:

        poemPageEntries.length > 0
          ? (

            <PoemMediaPage

              poem={
                poemPageEntries[0].poem
              }

              imageWidgets={
                imageWidgets
              }

              isOwner={
                canEdit
              }

              onSaveImage={
                saveImageWidget
              }

            />

          )
          : (

            <div className="book-left-page">

              <div className="blank-paper-page" />

            </div>

          ),

    });

  }


  /* =======================================================
     POEM PAPERS
  ======================================================= */

  poemPageEntries.forEach(
    (
      entry,
      entryIndex
    ) => {

      const nextEntry =
        poemPageEntries[
          entryIndex + 1
        ];


      const paperId =
        papers.length + 1;


      if (
        entry.pageNumber === 1
      ) {

        poemPaperLocations.push({

          poemId:
            entry.poem.id,

          poemIndex:
            safePoems.findIndex(
              (item) =>
                item.id ===
                entry.poem.id
            ),

          paperLocation:
            paperId,

        });

      }


      papers.push({

        id:
          paperId,


        front: (

          <div className="book-right-page">

            <PoemPage

              poem={
                entry.poem
              }

              content={
                entry.content
              }

              journalId={
                journalId
              }

              isOwner={
                canEdit
              }

              onEditJournal={() =>
                setShowEditModal(
                  true
                )
              }

              onDeleteJournal={
                handleDeleteJournal
              }

              pageNumber={
                entry.pageNumber
              }

              totalPages={
                entry.totalPages
              }

              isFirstPage={
                entry.pageNumber === 1
              }

              textStyles={
                poemTextStyles[
                  entry.poem.id
                ] ||
                getStoredPoemStyles(
                  entry.poem.id
                )
              }

              onSaveTextStyle={
                savePoemTextStyle
              }

            />

          </div>

        ),


        back:

          nextEntry
            ? (

              <PoemMediaPage

                poem={
                  nextEntry.poem
                }

                imageWidgets={
                  imageWidgets
                }

                isOwner={
                  canEdit
                }

                onSaveImage={
                  saveImageWidget
                }

              />

            )
            : (

              <div className="book-left-page">

                <div className="blank-paper-page" />

              </div>

            ),

      });

    }
  );


  /* =======================================================
     FINAL PAPER
  ======================================================= */

  const finalPaperId =
    papers.length + 1;


  papers.push({

    id:
      finalPaperId,


    front: (

      <div className="book-right-page">

        <InsideBackCover

          journal={
            activeJournal
          }

        />

      </div>

    ),


    back: (

      <ClosedBackCover

        journal={
          activeJournal
        }

      />

    ),

  });


  const realMaxLocation =
    papers.length + 1;


  const safeMaxLocation =
    realMaxLocation;


  /* =======================================================
     GO TO POEM FROM TOC
  ======================================================= */

  function goToPoem(
    poemIndex
  ) {

    if (isTurning) {
      return;
    }


    const targetInfo =
      poemPaperLocations.find(
        (item) =>
          item.poemIndex ===
          poemIndex
      );


    if (!targetInfo) {
      return;
    }


    const target =
      targetInfo.paperLocation;


    if (
      target <=
      locationRef.current
    ) {

      return;

    }


    const turnNext =
      () => {

        const location =
          locationRef.current;


        if (
          location >=
          target
        ) {

          return;

        }


        const paperId =
          location;


        turningPaperRef.current =
          paperId;


        setIsTurning(
          true
        );


        setFlippedPapers(
          (previous) => {

            const next =
              new Set(
                previous
              );


            next.add(
              paperId
            );


            return next;

          }
        );


        const nextLocation =
          location + 1;


        locationRef.current =
          nextLocation;


        setCurrentLocation(
          nextLocation
        );


        window.setTimeout(
          () => {

            turningPaperRef.current =
              null;


            setIsTurning(
              false
            );


            if (
              locationRef.current <
              target
            ) {

              turnNext();

            }

          },
          TURN_DURATION + 50
        );

      };


    turnNext();

  }


  /* =======================================================
     BOOK CLICK HANDLER
  ======================================================= */

  function handleBookAreaClick(e) {

    if (
      !isOpen ||
      isTurning
    ) {

      return;

    }


    const interactiveElement =
      e.target.closest(
        'button, a, input, textarea, select, [role="button"], iframe'
      );


    if (
      interactiveElement
    ) {

      return;

    }


    const rect =
      e.currentTarget.getBoundingClientRect();


    const x =
      e.clientX -
      rect.left;


    if (
      x <= 65
    ) {

      goPreviousPage();

      return;

    }


    if (
      x >=
      rect.width - 65
    ) {

      goNextPage();

    }

  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (journalLoading) {

    return (

      <Loading
        label="Opening journal"
      />

    );

  }


  if (!journal) {

    return (

      <p className="p-6">

        Journal not found.

      </p>

    );

  }


  /* =======================================================
     CURRENT LOCATION LABEL
  ======================================================= */

  function getLocationLabel() {

    if (isClosedFront) {
      return 'Closed';
    }


    if (isClosedBack) {
      return 'Back Cover';
    }


    const tocPaperCount =
      Math.ceil(
        tocPages.length / 2
      );


    const extraBlankPaperAfterToc =
      tocPages.length > 0 &&
      tocPages.length % 2 === 0
        ? 1
        : 0;


    const firstPoemPaperIndex =
      1 +
      tocPaperCount +
      extraBlankPaperAfterToc;


    const firstPoemLocation =
      firstPoemPaperIndex + 1;


    const lastTocLocation =
      1 +
      tocPaperCount;


    if (
      tocPages.length > 0 &&
      currentLocation >= 2 &&
      currentLocation <= lastTocLocation
    ) {

      return 'Table of Contents';

    }


    const paperIndex =
      currentLocation - 1;


    const poemEntryIndex =
      paperIndex -
      firstPoemPaperIndex;


    if (
      poemEntryIndex >= 0 &&
      poemEntryIndex <
        poemPageEntries.length
    ) {

      const entry =
        poemPageEntries[
          poemEntryIndex
        ];


      if (entry) {

        const totalBookPages =
          poemPageEntries.length + 1;


        const bookPageNumber =
          poemEntryIndex + 2;


        return (
          `Page ${bookPageNumber} ` +
          `of ${totalBookPages}`
        );

      }

    }


    if (
      currentLocation ===
      safeMaxLocation - 1
    ) {

      return 'End';

    }


    return 'Page';

  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div

      className="journal-page"

    >

      {/* ===================================================
          BACK TO BOOKCASE
      =================================================== */}

      {fromBookcaseId &&
        !fromCollaborationId &&
        !isPublicView && (

          <button

            type="button"

            className="bookcase-page-back"

            onClick={() =>
              navigate(
                `/bookcase/${fromBookcaseId}`
              )
            }

          >

            ← Back to your bookcase

          </button>

        )}


      {/* ===================================================
          BACK TO COLLABORATION
      =================================================== */}

      {fromCollaborationId &&
        !isPublicView && (

          <button

            type="button"

            className="bookcase-page-back"

            onClick={() =>
              navigate(
                `/collaboration/${fromCollaborationId}`
              )
            }

          >

            ← Back to your collaboration

          </button>

        )}


      {/* ===================================================
          CONTROLS
      =================================================== */}

      <div className="book-controls">

        <button

          disabled={
            currentLocation <= 1 ||
            isTurning
          }

          onClick={
            goPreviousPage
          }

        >

          ← PREVIOUS

        </button>


        <span>

          {getLocationLabel()}

        </span>


        <button

          disabled={
            currentLocation >=
              safeMaxLocation ||
            isTurning
          }

          onClick={
            goNextPage
          }

        >

          {
            isClosedFront
              ? 'OPEN →'
              : 'NEXT →'
          }

        </button>

      </div>


      {/* ===================================================
          BOOK
      =================================================== */}

      <div

        className={`
        book-stack-wrapper
        ${isClosedFront ? 'book-wrapper-closed-front' : ''}
        ${isClosedBack ? 'book-wrapper-closed-back' : ''}
        ${isOpen ? 'book-wrapper-open' : ''}
      `}

        onClick={
          handleBookAreaClick
        }

      >

        <div

          className={`
          bs-book
          ${isClosedFront ? 'book-closed-front' : ''}
          ${isClosedBack ? 'book-closed-back' : ''}
          ${isOpen ? 'book-open' : ''}
        `}

        >

          {papers.map(
            (
              paper,
              index
            ) => {

              const isFlipped =
                flippedPapers.has(
                  paper.id
                );


              const total =
                papers.length;


              const isTurningThisPaper =
                turningPaperRef.current ===
                paper.id;


              let zIndex;


              if (
                isTurningThisPaper
              ) {

                zIndex =
                  total + 100;

              } else if (
                isFlipped
              ) {

                zIndex =
                  index + 1;

              } else {

                zIndex =
                  total - index;

              }


              return (

                <div

                  key={
                    paper.id
                  }

                  className={`
                    bs-paper
                    ${
                      isFlipped
                        ? 'flipped'
                        : ''
                    }
                  `}

                  style={{
                    zIndex,
                  }}

                >

                  {/* FRONT */}

                  <div className="bs-front">

                    <div className="bs-front-content">

                      {paper.front}

                    </div>

                  </div>


                  {/* BACK */}

                  <div className="bs-back">

                    <div className="bs-back-content">

                      {paper.back}

                    </div>

                  </div>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* ===================================================
          MOBILE PAGE NAVIGATION
      =================================================== */}

      <div className="mobile-book-navigation">

        <button

          disabled={
            currentLocation <= 1 ||
            isTurning
          }

          onClick={
            goPreviousPage
          }

        >

          ← PREVIOUS

        </button>


        <button

          disabled={
            currentLocation >=
              safeMaxLocation ||
            isTurning
          }

          onClick={
            goNextPage
          }

        >

          {
            isClosedFront
              ? 'OPEN →'
              : 'NEXT →'
          }

        </button>

      </div>


      {/* ===================================================
          SHARE MODAL
      =================================================== */}

      {showShare && (

        <ShareModal

          journalId={
            journalId
          }

          onClose={() =>
            setShowShare(
              false
            )
          }

        />

      )}


      {/* ===================================================
          EDIT JOURNAL MODAL
      =================================================== */}

      {showEditModal && (

        <EditJournalModal

          journal={
            activeJournal
          }

          onClose={() =>
            setShowEditModal(
              false
            )
          }

          onSaved={(updated) =>
            setJournalOverride(
              updated
            )
          }

        />

      )}

    </div>

  );

}


/* =========================================================
   POEM MEDIA PAGE
========================================================= */

function PoemMediaPage({
  poem,
  imageWidgets,
  isOwner,
  onSaveImage,
}) {

  const containerRef =
    useRef(null);


  const savedImageWidget =
    imageWidgets[
      poem.id
    ] ??
    poem.image_widget_box ??
    null;


  const imageWidget =
    savedImageWidget
      ? {
          x: savedImageWidget.x ?? 20,
          y: savedImageWidget.y ?? 20,
          w: savedImageWidget.w ?? 220,
          h: savedImageWidget.h ?? 220,
          url: savedImageWidget.url,
        }
      : null;


  const imageUrl =
    imageWidget?.url ||
    poem.image_url ||
    '';


  const hasImage =
    Boolean(
      imageUrl
    );


  const hasSpotify =
    Boolean(
      poem.spotify_url
    );


  return (

    <div className="book-left-page">

      <div

        className="page-back"

        ref={
          containerRef
        }

      >

        <div

          className="page-back-inner"

          style={{
            position:
              'relative',
          }}

        >

          {/* IMAGE */}

          {hasImage && (

            <DraggableWidget

              key={
                `${poem.id}-image`
              }

              containerRef={
                containerRef
              }

              editable={
                isOwner
              }

              initial={
                {
                  ...(imageWidget ?? {}),

                  url:
                    imageUrl,
                }
              }

              onSave={(box) => {

                onSaveImage(
                  poem.id,
                  {
                    ...box,

                    url:
                      imageUrl,
                  }
                );

              }}

            >

              <img

                src={
                  imageUrl
                }

                alt="Poem page"

                draggable="false"

                style={{

                  width:
                    '100%',

                  height:
                    '100%',

                  objectFit:
                    'cover',

                  display:
                    'block',

                }}

              />

            </DraggableWidget>

          )}


          {/* SPOTIFY */}

          {hasSpotify && (

            <DraggableWidget

              key={
                `${poem.id}-spotify`
              }

              containerRef={
                containerRef
              }

              editable={
                isOwner
              }

              initial={
                poem.spotify_widget_box ??
                {
                  x: 20,

                  y:
                    hasImage
                      ? 300
                      : 20,

                  w: 320,

                  h: 150,

                }
              }

              onSave={(box) => {

                updatePoemWidgetBox(
                  poem.id,
                  box
                ).catch(
                  (error) => {

                    console.error(
                      'Failed to save Spotify position:',
                      error
                    );

                  }
                );

              }}

            >

              <SpotifyPlayer

                spotifyUrl={
                  poem.spotify_url
                }

                active

              />

            </DraggableWidget>

          )}


          {/* EMPTY MEDIA PAGE */}

          {!hasImage &&
            !hasSpotify && (

              <p className="empty-left-page">

                No song, link, or picture
                added to this page yet.

              </p>

            )}

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   TABLE OF CONTENTS
========================================================= */

function TocPage({
  journal,
  items,
  poemsLoading,
  isOwner,
  canEdit = false,
  publicShareViews = 0,
  onSelectPoem,
  onShare,
  onNewPoem,
  onAddSection,
  onEditSection,
  onDeleteSection,
  isContinuation = false,
}) {

  return (

    <div className="page-inner">

      {/* HEADER */}

      <div className="toc-header">

        <div>

          <h2>

            {journal.title}

          </h2>


          <p className="page-label">

            TABLE OF CONTENTS

          </p>

        </div>


        {!isContinuation &&
          (isOwner || canEdit) && (

            <div className="toc-actions">

              {isOwner && (<>

                {/* VIEW COUNT */}

                <div

                  className="flex items-center gap-1 font-mono text-xs text-ink-soft"

                  aria-label={`${publicShareViews} total views`}

                  title={`${publicShareViews} total views from the view-only link`}

                >

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >

                    <path
                      d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="2.5"
                    />

                  </svg>

                  <span>
                    {publicShareViews}
                  </span>

                </div>


                {/* SHARE */}

                <button

                  type="button"

                  className="toc-icon-button"

                  onClick={
                    onShare
                  }

                  aria-label="Share journal"

                  title="Share journal"

                >

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >

                    <circle
                      cx="18"
                      cy="5"
                      r="2"
                    />

                    <circle
                      cx="6"
                      cy="12"
                      r="2"
                    />

                    <circle
                      cx="18"
                      cy="19"
                      r="2"
                    />

                    <line
                      x1="8"
                      y1="11"
                      x2="16"
                      y2="6"
                    />

                    <line
                      x1="8"
                      y1="13"
                      x2="16"
                      y2="18"
                    />

                  </svg>

                </button>

              </>)}


              {/* ADD SECTION */}

              {canEdit && (

                <button

                  type="button"

                  className="toc-icon-button"

                  onClick={() =>
                    onAddSection(-1)
                  }

                  aria-label="Add section"

                  title="Add section at the beginning"

                >

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >

                    <path
                      d="M4 6h16M4 12h10M4 18h16"
                    />

                    <path
                      d="M18 10v6M15 13h6"
                    />

                  </svg>

                </button>

              )}


              {/* NEW POEM */}

              {canEdit && (

                <button

                  type="button"

                  className="
                    toc-icon-button
                    toc-plus-button
                  "

                  onClick={
                    onNewPoem
                  }

                  aria-label="New poem"

                  title="New poem"

                >

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >

                    <line
                      x1="12"
                      y1="5"
                      x2="12"
                      y2="19"
                    />

                    <line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    />

                  </svg>

                </button>

              )}

            </div>

          )}

      </div>


      {/* POEM LIST */}

      <div className="toc-list">

        {poemsLoading ? (

          <Loading
            label="Turning pages"
          />

        ) : items?.length ? (

          items.map((item) => {

            if (item.type === 'section') {

              return (

                <div
                  key={`section-${item.section.id}`}
                  className="toc-section-heading"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    margin: '8px 0 2px',
                    padding: '5px 0',
                    borderBottom: '1px solid rgba(43, 42, 39, 0.18)',
                  }}
                >

                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: '#77736b',
                      fontWeight: 600,
                    }}
                  >
                    {item.section.title}
                  </span>


                  {canEdit && (

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        flexShrink: 0,
                      }}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          onEditSection(item.section)
                        }
                        aria-label={`Edit ${item.section.title}`}
                        title="Edit section"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: '2px',
                          cursor: 'pointer',
                          color: '#77736b',
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDeleteSection(item.section.id)
                        }
                        aria-label={`Delete ${item.section.title}`}
                        title="Delete section"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: '2px',
                          cursor: 'pointer',
                          color: '#77736b',
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 7h16" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M6 7l1 13h10l1-13" />
                          <path d="M9 7V4h6v3" />
                        </svg>
                      </button>

                    </span>

                  )}

                </div>

              );

            }


            const poem = item.poem;


            return (

              <div
                key={poem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >

                <button

                  onClick={() =>
                    onSelectPoem(
                      item.poemIndex
                    )
                  }

                  className="toc-item"

                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                  }}

                >

                  <span>

                    {item.poemIndex + 1}

                    {' '}

                    {poem.title || 'Untitled'}

                  </span>


                  <span>

                    {poem.poem_date || ''}

                  </span>

                </button>


                {canEdit && (

                  <button
                    type="button"
                    onClick={() =>
                      onAddSection(
                        item.poemIndex
                      )
                    }
                    aria-label={`Add section after ${poem.title || 'this poem'}`}
                    title="Add section after this poem"
                    style={{
                      flexShrink: 0,
                      border: 'none',
                      background: 'transparent',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#77736b',
                      opacity: 0.7,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>

                )}

              </div>

            );

          })

        ) : (

          <p className="empty-text">

            No poems in this journal yet.

          </p>

        )}

      </div>

    </div>

  );

}


/* =========================================================
   POEM PAGE
========================================================= */

function PoemPage({
  poem,
  content,
  journalId,
  isOwner,
  onEditJournal,
  onDeleteJournal,
  pageNumber,
  totalPages,
  isFirstPage,
  textStyles,
  onSaveTextStyle,
}) {

  const navigate =
    useNavigate();


  const [
    showTextStyles,
    setShowTextStyles,
  ] = useState(false);


  const styles =
    textStyles ||
    DEFAULT_POEM_TEXT_STYLES;


  function updateStyle(
    section,
    property,
    value
  ) {

    const nextStyles = {

      ...styles,

      [section]: {

        ...styles[section],

        [property]:
          value,

      },

    };


    onSaveTextStyle(
      poem.id,
      nextStyles
    );

  }


  function resetStyles() {

    const nextStyles = {

      title: {
        ...DEFAULT_POEM_TEXT_STYLES.title,
      },

      date: {
        ...DEFAULT_POEM_TEXT_STYLES.date,
      },

      content: {
        ...DEFAULT_POEM_TEXT_STYLES.content,
      },

    };


    onSaveTextStyle(
      poem.id,
      nextStyles
    );

  }


  const toolButtonStyle = {

    width:
      '34px',

    height:
      '34px',

    border:
      '1px solid rgba(43, 42, 39, 0.18)',

    borderRadius:
      '50%',

    background:
      'rgba(255, 255, 255, 0.78)',

    color:
      '#2b2a27',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    padding:
      0,

    cursor:
      'pointer',

    boxShadow:
      '0 2px 8px rgba(0,0,0,0.08)',

  };


  const panelStyle = {

    position:
      'absolute',

    right:
      '18px',

    bottom:
      '18px',

    width:
      '300px',

    maxWidth:
      'calc(100% - 36px)',

    maxHeight:
      'calc(100% - 36px)',

    overflowY:
      'auto',

    overflowX:
      'hidden',

    boxSizing:
      'border-box',

    padding:
      '16px',

    background:
      'rgba(250, 247, 238, 0.98)',

    border:
      '1px solid rgba(43, 42, 39, 0.16)',

    borderRadius:
      '12px',

    boxShadow:
      '0 10px 30px rgba(0, 0, 0, 0.16)',

    zIndex:
      100,

    color:
      '#2b2a27',

    fontFamily:
      'Arial, Helvetica, sans-serif',

  };


  return (

    <div

      className="
        page-inner
        poem-page
      "

      style={{
        position:
          'relative',
      }}

    >

      {/* =================================================
          POEM HEADER
      ================================================= */}

      {isFirstPage ? (

        <div>

          <h2

            style={{

              fontFamily:
                styles.title.fontFamily,

              fontSize:
                `${styles.title.fontSize}px`,

              fontWeight:
                styles.title.fontWeight,

              fontStyle:
                styles.title.fontStyle,

              textAlign:
                styles.title.textAlign,

              letterSpacing:
                `${styles.title.letterSpacing}px`,

              lineHeight:
                styles.title.lineHeight,

              color:
                styles.title.color,

            }}

          >

            {
              poem.title ||
              'Untitled'
            }

          </h2>


          {poem.poem_date && (

            <p

              className="page-label"

              style={{

                fontFamily:
                  styles.date.fontFamily,

                fontSize:
                  `${styles.date.fontSize}px`,

                fontWeight:
                  styles.date.fontWeight,

                fontStyle:
                  styles.date.fontStyle,

                textAlign:
                  styles.date.textAlign,

                letterSpacing:
                  `${styles.date.letterSpacing}px`,

                lineHeight:
                  styles.date.lineHeight,

                color:
                  styles.date.color,

              }}

            >

              {
                poem.poem_date
              }

            </p>

          )}

        </div>

      ) : (

        <div>

          <p className="page-label">

            {
              poem.title ||
              'Untitled'
            }

            {' · '}

            Page {pageNumber}

            {' / '}

            {totalPages}

          </p>

        </div>

      )}


      {/* =================================================
          POEM TEXT
      ================================================= */}

      <div

        className="
          poem-text
          poem-text-continuation
        "

        style={{

          fontFamily:
            styles.content.fontFamily,

          fontSize:
            `${styles.content.fontSize}px`,

          fontWeight:
            styles.content.fontWeight,

          fontStyle:
            styles.content.fontStyle,

          textAlign:
            styles.content.textAlign,

          letterSpacing:
            `${styles.content.letterSpacing}px`,

          lineHeight:
            styles.content.lineHeight,

          color:
            styles.content.color,

          whiteSpace:
            'pre-wrap',

        }}

      >

        {content}

      </div>


      {/* =================================================
          OWNER TOOLS
      ================================================= */}

      {isOwner &&
        isFirstPage && (

          <div

            className="poem-page-tools"

            style={{

              position:
                'absolute',

              right:
                '18px',

              bottom:
                '18px',

              display:
                'flex',

              alignItems:
                'center',

              gap:
                '8px',

              zIndex:
                110,

            }}

            onClick={(e) =>
              e.stopPropagation()
            }

          >

            {/* TEXT STYLE ICON */}

            <button

              type="button"

              onClick={(e) => {

                e.stopPropagation();

                setShowTextStyles(
                  (previous) =>
                    !previous
                );

              }}

              aria-label="Text style"

              title="Text style"

              style={toolButtonStyle}

            >

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <path
                  d="M4 5h16"
                />

                <path
                  d="M12 5v14"
                />

                <path
                  d="M8 19h8"
                />

              </svg>

            </button>


            {/* PENCIL ICON */}

            <button

              type="button"

              onClick={(e) => {

                e.stopPropagation();

                navigate(
                  `/journal/${journalId}/poem/${poem.id}`
                );

              }}

              aria-label="Edit poem"

              title="Edit poem"

              style={toolButtonStyle}

            >

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <path
                  d="
                    M12 20h9
                    M16.5 3.5
                    a2.121 2.121 0 0 1 3 3
                    L8 18
                    l-4 1
                    1-4Z
                  "
                />

              </svg>

            </button>

          </div>

        )}


      {/* =================================================
          TEXT STYLE PANEL
      ================================================= */}

      {showTextStyles &&
        isOwner &&
        isFirstPage && (

          <div

            className="poem-text-style-panel"

            style={
              panelStyle
            }

            onClick={(e) =>
              e.stopPropagation()
            }

          >

            {/* PANEL HEADER */}

            <div

              className="poem-style-header"

              style={{

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'space-between',

                marginBottom:
                  '12px',

                paddingBottom:
                  '10px',

                borderBottom:
                  '1px solid rgba(43, 42, 39, 0.12)',

                fontSize:
                  '14px',

                fontWeight:
                  600,

              }}

            >

              <span>
                Text Style
              </span>


              <button

                type="button"

                onClick={() =>
                  setShowTextStyles(
                    false
                  )
                }

                aria-label="Close text styles"

                style={{

                  border:
                    'none',

                  background:
                    'transparent',

                  fontSize:
                    '22px',

                  lineHeight:
                    1,

                  color:
                    '#77736b',

                  cursor:
                    'pointer',

                  padding:
                    '2px 5px',

                }}

              >

                ×

              </button>

            </div>


            {/* TITLE */}

            <TextStyleSection

              label="Title"

              style={
                styles.title
              }

              onChange={(
                property,
                value
              ) =>
                updateStyle(
                  'title',
                  property,
                  value
                )
              }

            />


            {/* DATE */}

            <TextStyleSection

              label="Date"

              style={
                styles.date
              }

              onChange={(
                property,
                value
              ) =>
                updateStyle(
                  'date',
                  property,
                  value
                )
              }

            />


            {/* POEM */}

            <TextStyleSection

              label="Poem"

              style={
                styles.content
              }

              onChange={(
                property,
                value
              ) =>
                updateStyle(
                  'content',
                  property,
                  value
                )
              }

            />


            {/* RESET */}

            <button

              type="button"

              className="poem-style-reset"

              onClick={
                resetStyles
              }

              style={{

                width:
                  '100%',

                marginTop:
                  '4px',

                padding:
                  '9px 12px',

                border:
                  '1px solid rgba(43, 42, 39, 0.16)',

                borderRadius:
                  '7px',

                background:
                  'rgba(43, 42, 39, 0.05)',

                color:
                  '#2b2a27',

                cursor:
                  'pointer',

                fontSize:
                  '12px',

              }}

            >

              Reset styles

            </button>

          </div>

        )}

    </div>

  );

}


/* =========================================================
   TEXT STYLE SECTION
========================================================= */

function TextStyleSection({
  label,
  style,
  onChange,
}) {

  const fieldLabelStyle = {

    display:
      'flex',

    flexDirection:
      'column',

    gap:
      '4px',

    fontSize:
      '11px',

    color:
      '#5f5b53',

    minWidth:
      0,

  };


  const inputStyle = {

    width:
      '100%',

    boxSizing:
      'border-box',

    minHeight:
      '30px',

    padding:
      '5px 7px',

    border:
      '1px solid rgba(43, 42, 39, 0.18)',

    borderRadius:
      '5px',

    background:
      '#fffdf8',

    color:
      '#2b2a27',

    fontSize:
      '12px',

  };


  return (

    <div

      className="poem-style-section"

      style={{

        marginBottom:
          '14px',

      }}

    >

      {/* SECTION TITLE */}

      <div

        className="poem-style-section-title"

        style={{

          fontSize:
            '12px',

          fontWeight:
            600,

          color:
            '#2b2a27',

          marginBottom:
            '7px',

        }}

      >

        {label}

      </div>


      {/* FONT */}

      <label

        style={{

          ...fieldLabelStyle,

          marginBottom:
            '7px',

        }}

      >

        <span>
          Font
        </span>


        <select

          value={
            style.fontFamily
          }

          onChange={(e) =>
            onChange(
              'fontFamily',
              e.target.value
            )
          }

          style={
            inputStyle
          }

        >

          <option value='Georgia, "Times New Roman", serif'>
            Georgia
          </option>

          <option value='Arial, Helvetica, sans-serif'>
            Arial
          </option>

          <option value='Verdana, sans-serif'>
            Verdana
          </option>

          <option value='"Trebuchet MS", sans-serif'>
            Trebuchet
          </option>

          <option value='"Courier New", monospace'>
            Courier
          </option>

          <option value='monospace'>
            Monospace
          </option>

          <option value='serif'>
            Serif
          </option>

          <option value='sans-serif'>
            Sans Serif
          </option>

        </select>

      </label>


      {/* SIZE + WEIGHT */}

      <div

        className="poem-style-two-column"

        style={{

          display:
            'grid',

          gridTemplateColumns:
            '1fr 1fr',

          gap:
            '8px',

          marginBottom:
            '7px',

        }}

      >

        {/* SIZE */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Size
          </span>


          <input

            type="number"

            min="8"

            max="72"

            value={
              style.fontSize
            }

            onChange={(e) =>
              onChange(
                'fontSize',
                Number(
                  e.target.value
                )
              )
            }

            style={
              inputStyle
            }

          />

        </label>


        {/* WEIGHT */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Weight
          </span>


          <select

            value={
              style.fontWeight
            }

            onChange={(e) =>
              onChange(
                'fontWeight',
                Number(
                  e.target.value
                )
              )
            }

            style={
              inputStyle
            }

          >

            <option value="300">
              Light
            </option>

            <option value="400">
              Regular
            </option>

            <option value="500">
              Medium
            </option>

            <option value="600">
              Semi Bold
            </option>

            <option value="700">
              Bold
            </option>

          </select>

        </label>

      </div>


      {/* ALIGNMENT + COLOR */}

      <div

        className="poem-style-two-column"

        style={{

          display:
            'grid',

          gridTemplateColumns:
            '1fr 1fr',

          gap:
            '8px',

          marginBottom:
            '7px',

        }}

      >

        {/* ALIGNMENT */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Align
          </span>


          <select

            value={
              style.textAlign
            }

            onChange={(e) =>
              onChange(
                'textAlign',
                e.target.value
              )
            }

            style={
              inputStyle
            }

          >

            <option value="left">
              Left
            </option>

            <option value="center">
              Center
            </option>

            <option value="right">
              Right
            </option>

            <option value="justify">
              Justify
            </option>

          </select>

        </label>


        {/* COLOR */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Color
          </span>


          <input

            type="color"

            value={
              style.color
            }

            onChange={(e) =>
              onChange(
                'color',
                e.target.value
              )
            }

            style={{

              width:
                '100%',

              height:
                '30px',

              padding:
                '2px',

              border:
                '1px solid rgba(43, 42, 39, 0.18)',

              borderRadius:
                '5px',

              background:
                '#fffdf8',

              cursor:
                'pointer',

              boxSizing:
                'border-box',

            }}

          />

        </label>

      </div>


      {/* SPACING + LINE HEIGHT */}

      <div

        className="poem-style-two-column"

        style={{

          display:
            'grid',

          gridTemplateColumns:
            '1fr 1fr',

          gap:
            '8px',

          marginBottom:
            '7px',

        }}

      >

        {/* LETTER SPACING */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Spacing
          </span>


          <input

            type="number"

            min="-3"

            max="10"

            step="0.5"

            value={
              style.letterSpacing
            }

            onChange={(e) =>
              onChange(
                'letterSpacing',
                Number(
                  e.target.value
                )
              )
            }

            style={
              inputStyle
            }

          />

        </label>


        {/* LINE HEIGHT */}

        <label

          style={
            fieldLabelStyle
          }

        >

          <span>
            Line Height
          </span>


          <input

            type="number"

            min="0.8"

            max="3"

            step="0.1"

            value={
              style.lineHeight
            }

            onChange={(e) =>
              onChange(
                'lineHeight',
                Number(
                  e.target.value
                )
              )
            }

            style={
              inputStyle
            }

          />

        </label>

      </div>


      {/* ITALIC */}

      <label

        className="poem-style-checkbox"

        style={{

          display:
            'flex',

          alignItems:
            'center',

          gap:
            '7px',

          fontSize:
            '12px',

          color:
            '#4f4b44',

          cursor:
            'pointer',

          marginTop:
            '5px',

        }}

      >

        <input

          type="checkbox"

          checked={
            style.fontStyle ===
            'italic'
          }

          onChange={(e) =>
            onChange(
              'fontStyle',
              e.target.checked
                ? 'italic'
                : 'normal'
            )
          }

        />

        <span>
          Italic
        </span>

      </label>

    </div>

  );

}


/* =========================================================
   INSIDE BACK COVER
========================================================= */

function InsideBackCover({
  journal,
}) {

  const material =
    journal.cover_material ||
    'kraft';


  const materialTextures = {

    kraft:
      'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 3px)',

    velvet:
      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)',

    leather:
      'repeating-linear-gradient(135deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 6px)',

  };


  return (

    <div

      className="inside-back-cover"

      style={{

        backgroundColor:
          journal.cover_color,

        backgroundImage:
          materialTextures[
            material
          ] ||
          materialTextures.kraft,

      }}

    />

  );

}


/* =========================================================
   CLOSED BACK COVER
========================================================= */

function ClosedBackCover({
  journal,
}) {

  const material =
    journal.cover_material ||
    'kraft';


  const spineColors = {

    kraft:
      '#8a6f47',

    velvet:
      '#4d1119',

    leather:
      '#221812',

  };


  const spineColor =
    journal.spine_color ||
    spineColors[
      material
    ] ||
    spineColors.kraft;


  const textures = {

    kraft:
      'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 3px)',

    velvet:
      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)',

    leather:
      'repeating-linear-gradient(135deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 6px)',

  };


  return (

    <div

      className="closed-back-cover"

      style={{

        backgroundColor:
          journal.cover_color,

        backgroundImage:
          textures[
            material
          ] ||
          textures.kraft,

        boxShadow:
          '0 8px 18px rgba(0,0,0,0.20)',

      }}

    >

      {journal.cover_back_image_url ? (

        <img

          src={
            journal.cover_back_image_url
          }

          alt="Back cover"

          className="
            absolute
            inset-0
            z-0
            h-full
            w-full
            object-cover
          "

          draggable="false"

        />

      ) : null}


      {journal.cover_back_image_url ? (

        <div

          className="
            pointer-events-none
            absolute
            inset-0
            z-[1]
            bg-black/10
          "

        />

      ) : null}


      <div className="closed-back-cover-content relative z-10">

        <div className="closed-back-cover-title">

          {
            journal.title
          }

        </div>

      </div>


      <div

        className="back-cover-spine"

        style={{

          background:
            `linear-gradient(
              to left,
              ${spineColor},
              ${spineColor}dd 70%,
              transparent
            )`,

        }}

      >

        <div className="spine-highlight" />


        <div className="spine-lines">

          <span />
          <span />
          <span />
          <span />
          <span />
          <span />

        </div>

      </div>

    </div>

  );

}