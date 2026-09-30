import { supabase } from './supabase';


/* =========================================================
   GET SHARES FOR JOURNAL
   ---------------------------------------------------------
   Email is returned only through the protected database
   function after ownership is verified.
========================================================= */

export async function getSharesForJournal(
  journalId
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_journal_shares_with_emails',
    {
      p_journal_id: journalId,
    }
  );

  if (error) {
    throw error;
  }

  return (data || []).map(
    (share) => ({
      id:
        share.id,

      viewer_id:
        share.viewer_id,

      role:
        share.role,

      created_at:
        share.created_at,

      profiles: {
        email:
          share.email,
      },
    })
  );
}


/* =========================================================
   FIND USER BY EMAIL
   ---------------------------------------------------------
   The profiles table is no longer directly readable by
   authenticated users. This uses a SECURITY DEFINER RPC
   that returns only the matching user's ID.
========================================================= */

export async function findUserByEmail(
  email
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'find_profile_id_by_email',
    {
      p_email:
        email,
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id:
      data,

    email:
      email,
  };
}


/* =========================================================
   SHARE JOURNAL BY REGISTERED USER EMAIL
========================================================= */

export async function shareJournalByEmail(
  journalId,
  email,
  role = 'viewer'
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'share_journal_by_email',
    {
      p_journal_id:
        journalId,

      p_email:
        email,

      p_role:
        role,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   SHARE JOURNAL WITH REGISTERED USER
========================================================= */

export async function shareJournal(
  journalId,
  viewerId,
  role = 'viewer'
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'share_journal_with_user',
    {
      p_journal_id:
        journalId,

      p_viewer_id:
        viewerId,

      p_role:
        role,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   REMOVE SHARE
========================================================= */

export async function removeShare(
  accessId
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'remove_journal_share',
    {
      p_journal_access_id:
        accessId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   LEAVE SHARED JOURNAL
========================================================= */

export async function leaveSharedJournal(
  accessId
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'leave_shared_journal',
    {
      p_journal_access_id:
        accessId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   GET MY SHARED JOURNALS
========================================================= */

export async function getSharedJournals() {
  const {
    data,
    error,
  } = await supabase
    .from('journal_access')
    .select(`
      id,
      journal_id,
      role,
      created_at,
      journals (*)
    `)
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return (data || [])
    .map(
      (item) => ({
        ...item.journals,

        journal_access_id:
          item.id,

        access_role:
          item.role,

        shared_at:
          item.created_at,
      })
    )
    .filter(Boolean);
}


/* =========================================================
   GET MY JOURNAL ACCESS
   ---------------------------------------------------------
   Returns the current user's access record for a journal.

   Owners normally do not have a journal_access row, so this
   returns null when the current user has no shared-access
   record.
========================================================= */

export async function getMyJournalAccess(
  journalId
) {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user =
    userData?.user;

  if (!user) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('journal_access')
    .select(
      'id, journal_id, viewer_id, role, created_at'
    )
    .eq(
      'journal_id',
      journalId
    )
    .eq(
      'viewer_id',
      user.id
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   REVOKE SHARE
   ---------------------------------------------------------
   ShareModal expects this function name.

   The actual database operation is handled by removeShare()
   so there is only one implementation of the removal logic.
========================================================= */

export async function revokeShare(
  accessId
) {
  return removeShare(
    accessId
  );
}


/* =========================================================
   UPDATE SHARE ROLE
========================================================= */

export async function updateShareRole(
  accessId,
  role
) {
  if (
    role !== 'viewer' &&
    role !== 'editor'
  ) {
    throw new Error(
      'Invalid share role.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('journal_access')
    .update({
      role,
    })
    .eq(
      'id',
      accessId
    )
    .select(
      'id, journal_id, viewer_id, role, created_at'
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   GET SHARE ROLE
========================================================= */

export async function getJournalShareRole(
  journalId
) {
  const {
    data,
    error,
  } = await supabase
    .from('journal_access')
    .select(
      'id, role'
    )
    .eq(
      'journal_id',
      journalId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   GET EDITOR SHARE TOKEN
========================================================= */

export async function getOrCreateEditorShareToken(
  journalId
) {
  const {
    data: journal,
    error: fetchError,
  } = await supabase
    .from('journals')
    .select(
      'id, editor_share_token'
    )
    .eq(
      'id',
      journalId
    )
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (
    journal.editor_share_token
  ) {
    return journal.editor_share_token;
  }

  const token =
    crypto.randomUUID();

  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .update({
      editor_share_token:
        token,
    })
    .eq(
      'id',
      journalId
    )
    .select(
      'editor_share_token'
    )
    .single();

  if (error) {
    throw error;
  }

  return data.editor_share_token;
}


/* =========================================================
   ACCEPT EDITOR SHARE TOKEN
========================================================= */

export async function acceptEditorShareToken(
  editorToken
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'accept_editor_share_token',
    {
      p_editor_token:
        editorToken,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   CREATE / GET PUBLIC VIEW-ONLY SHARE TOKEN
========================================================= */

export async function getOrCreatePublicShareToken(
  journalId
) {
  const {
    data: journal,
    error: fetchError,
  } = await supabase
    .from('journals')
    .select(
      'id, public_share_token'
    )
    .eq(
      'id',
      journalId
    )
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (
    journal.public_share_token
  ) {
    return journal.public_share_token;
  }

  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .update({
      public_share_token:
        crypto.randomUUID(),
    })
    .eq(
      'id',
      journalId
    )
    .select(
      'public_share_token'
    )
    .single();

  if (error) {
    throw error;
  }

  return data.public_share_token;
}


/* =========================================================
   REGISTER AUTHENTICATED PUBLIC VIEWER
========================================================= */

export async function registerPublicJournalViewer(
  shareToken
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'register_public_journal_viewer',
    {
      p_share_token:
        shareToken,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   GET PUBLIC VIEW COUNT
========================================================= */

export async function getPublicShareViewCount(
  journalId
) {
  const {
    data,
    error,
  } = await supabase
    .from('journals')
    .select(
      'public_share_views'
    )
    .eq(
      'id',
      journalId
    )
    .single();

  if (error) {
    throw error;
  }

  return Number(
    data?.public_share_views ?? 0
  );
}


/* =========================================================
   RECORD A PUBLIC SHARE VIEW
========================================================= */

export async function recordPublicShareView(
  shareToken
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'record_public_share_view',
    {
      p_share_token:
        shareToken,
    }
  );

  if (error) {
    throw error;
  }

  return Number(
    data ?? 0
  );
}