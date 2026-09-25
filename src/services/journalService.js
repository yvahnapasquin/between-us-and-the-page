import { supabase } from './supabase';
import { registerPublicJournalViewer } from './shareService';
import { checkIsAdmin } from './adminService';


/* =========================================================
   GET MY JOURNALS
========================================================= */

export async function getMyJournals() {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData?.user) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .select('*')
    .eq('owner_id', userData.user.id)
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}


/* =========================================================
   GET SAMPLE JOURNALS
========================================================= */

export async function getSampleJournals() {
  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .select('*')
    .eq(
      'is_sample',
      true
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   GET SHARED JOURNALS
========================================================= */

export async function getSharedJournals() {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData?.user) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_shared_journals'
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}


/* =========================================================
   GET ONE JOURNAL
========================================================= */

export async function getJournal(
  journalId
) {
  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .select('*')
    .eq(
      'id',
      journalId
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   CREATE JOURNAL
========================================================= */

export async function createJournal({
  title,
  description,
  authorName,
  journalDate,
  coverColor,
  coverMaterial,
  spineColor,
  isSample = false,
}) {

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();


  if (userError) {
    throw userError;
  }


  if (!userData?.user?.id) {
    throw new Error(
      'You must be signed in to create a journal.'
    );
  }


  /* =======================================================
     CLEAN INPUT VALUES
  ======================================================= */

  const cleanTitle =
    typeof title === 'string'
      ? title.trim()
      : '';


  const cleanDescription =
    typeof description === 'string'
      ? description.trim()
      : '';


  const cleanAuthorName =
    typeof authorName === 'string'
      ? authorName.trim()
      : '';


  const cleanJournalDate =
    typeof journalDate === 'string'
      ? journalDate.trim()
      : '';


  const cleanCoverColor =
    typeof coverColor === 'string'
      ? coverColor.trim().toLowerCase()
      : '#c9a876';


  const cleanSpineColor =
    typeof spineColor === 'string'
      ? spineColor.trim().toLowerCase()
      : '#8a6f47';


  const cleanCoverMaterial =
    typeof coverMaterial === 'string'
      ? coverMaterial.trim()
      : 'kraft';


  /* =======================================================
     INPUT VALIDATION
  ======================================================= */

  if (
    cleanTitle.length > 200
  ) {
    throw new Error(
      'Journal title must be 200 characters or fewer.'
    );
  }


  if (
    cleanDescription.length > 2000
  ) {
    throw new Error(
      'Journal description must be 2,000 characters or fewer.'
    );
  }


  if (
    cleanAuthorName.length > 120
  ) {
    throw new Error(
      'Author name must be 120 characters or fewer.'
    );
  }


  if (
    cleanJournalDate &&
    !isValidJournalDate(
      cleanJournalDate
    )
  ) {
    throw new Error(
      'Please enter a valid journal date.'
    );
  }


  if (
    !isValidHexColor(
      cleanCoverColor
    )
  ) {
    throw new Error(
      'Please select a valid cover color.'
    );
  }


  if (
    !isValidHexColor(
      cleanSpineColor
    )
  ) {
    throw new Error(
      'Please select a valid spine color.'
    );
  }


  const allowedMaterials =
    new Set([
      'kraft',
      'velvet',
      'leather',
    ]);


  if (
    !allowedMaterials.has(
      cleanCoverMaterial
    )
  ) {
    throw new Error(
      'Please select a valid cover material.'
    );
  }


  /* =======================================================
     ADMIN-ONLY SAMPLE JOURNAL
  ======================================================= */

  const wantsSample =
    Boolean(isSample);


  if (wantsSample) {

    const currentUserIsAdmin =
      await checkIsAdmin();


    if (!currentUserIsAdmin) {
      throw new Error(
        'Only administrators can create featured sample journals.'
      );
    }

  }


  /* =======================================================
     INSERT JOURNAL
  ======================================================= */

  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .insert({

      title:
        cleanTitle ||
        null,

      description:
        cleanDescription ||
        null,

      author_name:
        cleanAuthorName ||
        null,

      journal_date:
        cleanJournalDate ||
        null,

      cover_image_url:
        null,

      cover_back_image_url:
        null,

      cover_color:
        cleanCoverColor,

      cover_material:
        cleanCoverMaterial,

      spine_color:
        cleanSpineColor,

      is_sample:
        wantsSample,

      public_share_token:
        wantsSample
          ? crypto.randomUUID()
          : null,

      owner_id:
        userData.user.id,

    })
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   CREATE JOURNAL VALIDATION HELPERS
========================================================= */

function isValidHexColor(
  value
) {

  return /^#[0-9a-f]{6}$/i.test(
    value
  );

}


function isValidJournalDate(
  value
) {

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }


  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );

}


/* =========================================================
   SAFE JOURNAL CREATION ERROR
========================================================= */

export function getSafeCreateJournalErrorMessage(
  error
) {

  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();


  if (
    message.includes(
      'row-level security'
    ) ||
    error?.code === '42501'
  ) {
    return (
      'You do not have permission to create this journal.'
    );
  }


  if (
    message.includes(
      'too many requests'
    ) ||
    message.includes(
      'rate limit'
    )
  ) {
    return (
      'Too many requests. Please wait a little while and try again.'
    );
  }


  if (
    message.includes(
      'failed to fetch'
    ) ||
    message.includes(
      'network'
    )
  ) {
    return (
      'Connection problem. Please check your internet connection and try again.'
    );
  }


  const safeValidationMessages = [
    'You must be signed in to create a journal.',
    'Journal title must be 200 characters or fewer.',
    'Journal description must be 2,000 characters or fewer.',
    'Author name must be 120 characters or fewer.',
    'Please enter a valid journal date.',
    'Please select a valid cover color.',
    'Please select a valid spine color.',
    'Please select a valid cover material.',
    'Only administrators can create featured sample journals.',
    'Please select an image file.',
    'Image must be smaller than 10 MB.',
    'No cover image selected.',
    'Could not generate public cover image URL.',
  ];


  const originalMessage =
    error?.message;


  if (
    typeof originalMessage === 'string' &&
    safeValidationMessages.includes(
      originalMessage
    )
  ) {
    return originalMessage;
  }


  return (
    'Could not create the journal. Please try again.'
  );

}


/* =========================================================
   UPDATE JOURNAL
========================================================= */

export async function updateJournal(
  journalId,
  updates
) {
  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .update(updates)
    .eq(
      'id',
      journalId
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   UPDATE TABLE OF CONTENTS SECTIONS
   ---------------------------------------------------------
   Persists TOC sectioning in Supabase so it is shared across
   browsers and available to users with journal access.
========================================================= */

export async function updateJournalTocSections(
  journalId,
  sections
) {
  const safeSections =
    Array.isArray(sections)
      ? sections
      : [];


  const {
    data,
    error,
  } = await supabase.rpc(
    'update_journal_toc_sections',
    {
      p_journal_id: journalId,
      p_toc_sections: safeSections,
    }
  );


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   DELETE JOURNAL
========================================================= */

export async function deleteJournal(
  journalId
) {
  const {
    error,
  } = await supabase
    .from('journals')
    .delete()
    .eq(
      'id',
      journalId
    );

  if (error) {
    throw error;
  }
}


/* =========================================================
   UPLOAD JOURNAL COVER IMAGE
========================================================= */

export async function uploadJournalCover(
  journalId,
  file,
  side = 'front'
) {

  if (!file) {
    throw new Error(
      'No cover image selected.'
    );
  }


  if (
    typeof file.type !== 'string' ||
    !file.type.startsWith(
      'image/'
    )
  ) {
    throw new Error(
      'Please select an image file.'
    );
  }


  if (
    file.size >
    10 * 1024 * 1024
  ) {
    throw new Error(
      'Image must be smaller than 10 MB.'
    );
  }


  if (
    side !== 'front' &&
    side !== 'back'
  ) {
    throw new Error(
      'Invalid cover side.'
    );
  }


  const bucket =
    'journal-covers';


  const safeFileName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );


  const path =
    `${journalId}/${side}_${Date.now()}_${safeFileName}`;


  const {
    error,
  } =
    await supabase.storage
      .from(bucket)
      .upload(
        path,
        file,
        {
          upsert: false,

          contentType:
            file.type ||
            'image/jpeg',
        }
      );


  if (error) {
    throw error;
  }


  const {
    data,
  } =
    supabase.storage
      .from(bucket)
      .getPublicUrl(
        path
      );


  if (!data?.publicUrl) {
    throw new Error(
      'Could not generate public cover image URL.'
    );
  }


  return data.publicUrl;
}


/* =========================================================
   SAVE FRONT + BACK COVER URLS
========================================================= */

export async function updateJournalCoverImages(
  journalId,
  frontImageUrl,
  backImageUrl
) {

  const updates = {};


  if (frontImageUrl) {

    updates.cover_image_url =
      frontImageUrl;

  }


  if (backImageUrl) {

    updates.cover_back_image_url =
      backImageUrl;

  }


  if (
    !Object.keys(updates).length
  ) {

    return null;

  }


  const {
    data,
    error,
  } =
    await supabase
      .from('journals')
      .update(updates)
      .eq(
        'id',
        journalId
      )
      .select()
      .single();


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   SAVE FRONT COVER URL
========================================================= */

export async function updateJournalCoverImage(
  journalId,
  imageUrl
) {

  return updateJournalCoverImages(
    journalId,
    imageUrl,
    null
  );

}


/* =========================================================
   GET PUBLIC JOURNAL BY SHARE TOKEN
========================================================= */

export async function getPublicJournal(
  shareToken
) {

  await registerPublicJournalViewer(
    shareToken
  );

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_journal',
    {
      p_share_token:
        shareToken,
    }
  );


  if (error) {
    throw error;
  }


  if (!data?.journal) {
    return null;
  }


  const {
    data: tocSections,
    error: tocSectionsError,
  } = await supabase.rpc(
    'get_public_journal_toc_sections',
    {
      p_share_token: shareToken,
    }
  );


  if (tocSectionsError) {
    throw tocSectionsError;
  }


  return {
    ...data.journal,
    toc_sections:
      Array.isArray(tocSections)
        ? tocSections
        : [],
  };
}


/* =========================================================
   GET PUBLIC POEMS BY SHARE TOKEN
========================================================= */

export async function getPublicPoems(
  shareToken
) {

  await registerPublicJournalViewer(
    shareToken
  );

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_journal',
    {
      p_share_token:
        shareToken,
    }
  );


  if (error) {
    throw error;
  }


  return data?.poems ?? [];
}


/* =========================================================
   BOOKCASE HELPERS
========================================================= */

function normalizeJournalIds(
  journalIds
) {

  if (
    !Array.isArray(
      journalIds
    )
  ) {
    return [];
  }


  return Array.from(
    new Set(
      journalIds
        .filter(
          (id) =>
            typeof id === 'string' &&
            id.trim().length > 0
        )
        .map(
          (id) =>
            id.trim()
        )
    )
  );
}


function normalizeBookcase(
  bookcase
) {

  if (!bookcase) {
    return null;
  }


  return {
    ...bookcase,

    journalIds:
      normalizeJournalIds(
        bookcase.journal_ids ??
        bookcase.journalIds
      ),
  };
}


/* =========================================================
   GET BOOKCASES
========================================================= */

export async function getBookcases() {

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();


  if (userError) {
    throw userError;
  }


  if (!userData?.user?.id) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('bookcases')
      .select(
        'id, owner_id, name, journal_ids, created_at, updated_at'
      )
      .eq(
        'owner_id',
        userData.user.id
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      );


  if (error) {
    throw error;
  }


  return (
    data ?? []
  ).map(
    normalizeBookcase
  );
}


/* =========================================================
   GET MY BOOKCASES
========================================================= */

export async function getMyBookcases() {
  return getBookcases();
}


/* =========================================================
   MIGRATE LOCAL BOOKCASES
   ---------------------------------------------------------
   Existing bookcases that were previously stored in
   localStorage are copied to Supabase.

   The migration is intentionally non-destructive:
   localStorage is NOT deleted here.
========================================================= */

export async function migrateLocalBookcases(
  localBookcases = []
) {

  if (
    !Array.isArray(
      localBookcases
    ) ||
    localBookcases.length === 0
  ) {
    return getBookcases();
  }


  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();


  if (userError) {
    throw userError;
  }


  if (!userData?.user?.id) {
    return [];
  }


  const existingBookcases =
    await getBookcases();


  const existingNames =
    new Set(
      existingBookcases.map(
        (bookcase) =>
          String(
            bookcase.name || ''
          )
            .trim()
            .toLowerCase()
      )
    );


  const results = [
    ...existingBookcases,
  ];


  for (
    const localBookcase
    of localBookcases
  ) {

    if (!localBookcase) {
      continue;
    }


    const name =
      typeof localBookcase.name === 'string'
        ? localBookcase.name.trim()
        : '';


    if (!name) {
      continue;
    }


    const normalizedName =
      name.toLowerCase();


    /*
      Prevent the migration from creating duplicate
      bookcases every time Dashboard loads.
    */

    if (
      existingNames.has(
        normalizedName
      )
    ) {
      continue;
    }


    const journalIds =
      normalizeJournalIds(
        localBookcase.journalIds ??
        localBookcase.journal_ids
      );


    const {
      data,
      error,
    } =
      await supabase
        .from('bookcases')
        .insert({
          owner_id:
            userData.user.id,

          name:
            name,

          journal_ids:
            journalIds,
        })
        .select(
          'id, owner_id, name, journal_ids, created_at, updated_at'
        )
        .single();


    if (error) {
      throw error;
    }


    const normalized =
      normalizeBookcase(
        data
      );


    if (normalized) {

      results.push(
        normalized
      );

      existingNames.add(
        normalizedName
      );

    }

  }


  return results;
}


/* =========================================================
   CREATE BOOKCASE
========================================================= */

export async function createBookcase(
  name,
  journalIds = []
) {

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();


  if (userError) {
    throw userError;
  }


  if (!userData?.user?.id) {
    throw new Error(
      'You must be signed in to create a bookcase.'
    );
  }


  const cleanName =
    typeof name === 'string'
      ? name.trim()
      : '';


  if (!cleanName) {
    throw new Error(
      'Please enter a bookcase name.'
    );
  }


  if (
    cleanName.length > 100
  ) {
    throw new Error(
      'Bookcase name must be 100 characters or fewer.'
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('bookcases')
      .insert({
        owner_id:
          userData.user.id,

        name:
          cleanName,

        journal_ids:
          normalizeJournalIds(
            journalIds
          ),
      })
      .select(
        'id, owner_id, name, journal_ids, created_at, updated_at'
      )
      .single();


  if (error) {
    throw error;
  }


  return normalizeBookcase(
    data
  );
}


/* =========================================================
   UPDATE BOOKCASE
========================================================= */

export async function updateBookcase(
  bookcaseId,
  updates = {}
) {

  if (!bookcaseId) {
    throw new Error(
      'Bookcase ID is required.'
    );
  }


  const nextUpdates = {};


  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'name'
    )
  ) {

    const cleanName =
      typeof updates.name === 'string'
        ? updates.name.trim()
        : '';


    if (!cleanName) {
      throw new Error(
        'Please enter a bookcase name.'
      );
    }


    if (
      cleanName.length > 100
    ) {
      throw new Error(
        'Bookcase name must be 100 characters or fewer.'
      );
    }


    nextUpdates.name =
      cleanName;
  }


  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'journalIds'
    )
  ) {

    nextUpdates.journal_ids =
      normalizeJournalIds(
        updates.journalIds
      );
  }


  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'journal_ids'
    )
  ) {

    nextUpdates.journal_ids =
      normalizeJournalIds(
        updates.journal_ids
      );
  }


  if (
    Object.keys(
      nextUpdates
    ).length === 0
  ) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('bookcases')
      .update(
        nextUpdates
      )
      .eq(
        'id',
        bookcaseId
      )
      .select(
        'id, owner_id, name, journal_ids, created_at, updated_at'
      )
      .single();


  if (error) {
    throw error;
  }


  return normalizeBookcase(
    data
  );
}


/* =========================================================
   ADD JOURNALS TO BOOKCASE
========================================================= */

export async function addJournalsToBookcase(
  bookcaseId,
  journalIds = []
) {

  if (!bookcaseId) {
    throw new Error(
      'Bookcase ID is required.'
    );
  }


  const {
    data: bookcase,
    error,
  } =
    await supabase
      .from('bookcases')
      .select(
        'journal_ids'
      )
      .eq(
        'id',
        bookcaseId
      )
      .single();


  if (error) {
    throw error;
  }


  const existingIds =
    normalizeJournalIds(
      bookcase?.journal_ids
    );


  const idsToAdd =
    normalizeJournalIds(
      journalIds
    );


  const nextIds =
    Array.from(
      new Set([
        ...existingIds,
        ...idsToAdd,
      ])
    );


  return updateBookcase(
    bookcaseId,
    {
      journalIds:
        nextIds,
    }
  );
}


/* =========================================================
   REMOVE JOURNAL FROM BOOKCASE
========================================================= */

export async function removeJournalFromBookcase(
  bookcaseId,
  journalId
) {

  if (!bookcaseId) {
    throw new Error(
      'Bookcase ID is required.'
    );
  }


  const {
    data: bookcase,
    error,
  } =
    await supabase
      .from('bookcases')
      .select(
        'journal_ids'
      )
      .eq(
        'id',
        bookcaseId
      )
      .single();


  if (error) {
    throw error;
  }


  const nextIds =
    normalizeJournalIds(
      bookcase?.journal_ids
    ).filter(
      (id) =>
        id !== journalId
    );


  return updateBookcase(
    bookcaseId,
    {
      journalIds:
        nextIds,
    }
  );
}


/* =========================================================
   DELETE BOOKCASE
========================================================= */

export async function deleteBookcase(
  bookcaseId
) {

  if (!bookcaseId) {
    throw new Error(
      'Bookcase ID is required.'
    );
  }


  const {
    error,
  } =
    await supabase
      .from('bookcases')
      .delete()
      .eq(
        'id',
        bookcaseId
      );


  if (error) {
    throw error;
  }
}


/* =========================================================
   SUBSCRIBE TO BOOKCASE CHANGES
   ---------------------------------------------------------
   IMPORTANT:
   This function is intentionally NOT async.

   Dashboard.jsx expects this function to immediately return
   an unsubscribe function. Making it async would return a
   Promise instead and cause:

   "unsubscribe is not a function"
========================================================= */

export function subscribeToBookcases(
  onChange
) {

  let currentUserId = null;
  let channel = null;
  let isActive = true;


  /*
    Get the current user asynchronously, but return the
    cleanup function immediately.
  */

  supabase.auth
    .getUser()
    .then(
      async ({
        data: userData,
        error: userError,
      }) => {

        if (
          !isActive
        ) {
          return;
        }


        if (userError) {

          console.error(
            'Could not get current user for bookcase realtime:',
            userError
          );

          return;
        }


        if (
          !userData?.user?.id
        ) {
          return;
        }


        currentUserId =
          userData.user.id;


        /*
          Create the realtime channel BEFORE calling
          subscribe().
        */

        channel =
          supabase
            .channel(
              `bookcases-${currentUserId}-${Date.now()}`
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'bookcases',
                filter:
                  `owner_id=eq.${currentUserId}`,
              },
              async () => {

                if (
                  !isActive
                ) {
                  return;
                }


                try {

                  const latest =
                    await getBookcases();


                  if (
                    isActive &&
                    typeof onChange ===
                      'function'
                  ) {

                    onChange(
                      latest
                    );

                  }

                } catch (
                  refreshError
                ) {

                  console.error(
                    'Could not refresh bookcases after realtime update:',
                    refreshError
                  );

                }

              }
            );


        /*
          subscribe() MUST be called only after the .on()
          callback has been registered.
        */

        channel.subscribe(
          (status) => {

            if (
              status ===
              'CHANNEL_ERROR'
            ) {

              console.error(
                'Bookcase realtime subscription failed.'
              );

            }

          }
        );

      }
    )
    .catch(
      (error) => {

        if (
          isActive
        ) {

          console.error(
            'Could not initialize bookcase realtime:',
            error
          );

        }

      }
    );


  /*
    Return the cleanup function immediately.

    This is what Dashboard.jsx expects.
  */

  return () => {

    isActive = false;


    if (
      channel
    ) {

      supabase.removeChannel(
        channel
      );

      channel = null;

    }

    currentUserId = null;

  };

}


/* =========================================================
   SUBSCRIBE TO MY BOOKCASES
========================================================= */

export function subscribeToMyBookcases(
  onChange
) {

  return subscribeToBookcases(
    onChange
  );

}