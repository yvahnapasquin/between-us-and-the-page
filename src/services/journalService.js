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
   ---------------------------------------------------------
   Sample journals are public, view-only journals that the
   owner has chosen to feature in Explore.
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


  /*
    A journal must always have an authenticated owner.
    The owner ID comes from Supabase auth, not from form input.
  */

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


  /*
    These are the only materials currently supported
    by NotebookCover.jsx.
  */

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
     -------------------------------------------------------
     The client-side checkbox is not treated as a security
     boundary.

     When isSample is requested, the current user is checked
     through the Supabase admin RPC.
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

      /*
        Title is optional.
      */

      title:
        cleanTitle ||
        null,


      /*
        Description is optional.
      */

      description:
        cleanDescription ||
        null,


      /*
        Author is optional.
      */

      author_name:
        cleanAuthorName ||
        null,


      /*
        Date is optional.
        No automatic date is used.
      */

      journal_date:
        cleanJournalDate ||
        null,


      /*
        Images are uploaded after
        the journal is created.
      */

      cover_image_url:
        null,

      cover_back_image_url:
        null,


      /*
        Front cover color.
      */

      cover_color:
        cleanCoverColor,


      /*
        Book texture/material.
      */

      cover_material:
        cleanCoverMaterial,


      /*
        Spine color.
      */

      spine_color:
        cleanSpineColor,


      /*
        Featured/sample state.
      */

      is_sample:
        wantsSample,


      /*
        Sample journals receive a public
        share token immediately.
      */

      public_share_token:
        wantsSample
          ? crypto.randomUUID()
          : null,


      /*
        IMPORTANT:
        The owner ID always comes from the
        authenticated Supabase user.
      */

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
   ---------------------------------------------------------
   Raw database/auth/storage errors should not be shown
   directly to the user.
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


  /*
    These validation messages are generated by
    this service and are safe to show.
  */

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
   ---------------------------------------------------------
   side:
   - front
   - back
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


  /*
    Make the filename safe.
  */

  const safeFileName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );


  const path =
    `${journalId}/${side}_${Date.now()}_${safeFileName}`;


  /*
    Upload the image.
  */

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


  /*
    Get the public URL.
  */

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
   ---------------------------------------------------------
   Kept for compatibility with existing code.
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
   ---------------------------------------------------------
   Used by the view-only public sharing link.
========================================================= */

export async function getPublicJournal(
  shareToken
) {

  // Register the authenticated user as a viewer first.
  // Anonymous public viewing still works because the RPC
  // simply returns null when no user is signed in.
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


  return data.journal;
}


/* =========================================================
   GET PUBLIC POEMS BY SHARE TOKEN
   ---------------------------------------------------------
   Used by the view-only public sharing link.
========================================================= */

export async function getPublicPoems(
  shareToken
) {

  // Also register here so the viewer is recorded even if this
  // function is called without getPublicJournal first.
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