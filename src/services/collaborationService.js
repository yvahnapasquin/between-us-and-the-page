import { supabase } from './supabase';


/* =========================================================
   GET MY COLLABORATION SPACES
========================================================= */

export async function getMyCollaborationSpaces() {

  const {
    data,
    error,
  } = await supabase

    .from('collaboration_space_members')

    .select(`
      space_id,
      role,
      collaboration_spaces (
        id,
        name,
        description,
        owner_id,
        created_at
      )
    `)

    .order(
      'created_at',
      {
        ascending: false,
        foreignTable: 'collaboration_spaces',
      }
    );


  if (error) {
    throw error;
  }


  return (data || [])
    .map((item) => ({
      ...item.collaboration_spaces,
      my_role: item.role,
    }))
    .filter(Boolean);
}


/* =========================================================
   CREATE COLLABORATION SPACE
========================================================= */

export async function createCollaborationSpace(
  name,
  description
) {

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_collaboration_space',
    {
      p_name:
        name.trim(),

      p_description:
        description?.trim() || null,
    }
  );


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   DELETE COLLABORATION SPACE
========================================================= */

export async function deleteCollaborationSpace(
  spaceId
) {

  const {
    data,
    error,
  } = await supabase
    .from('collaboration_spaces')
    .delete()
    .eq('id', spaceId);


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   LEAVE COLLABORATION SPACE
========================================================= */

export async function leaveCollaborationSpace(
  spaceId
) {

  const {
    data,
    error,
  } = await supabase
    .from('collaboration_space_members')
    .delete()
    .eq('space_id', spaceId);


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   GET MEMBERS
========================================================= */

export async function getCollaborationMembers(spaceId) {

  const { data: members, error: membersError } =
    await supabase
      .from('collaboration_space_members')
      .select(`
        space_id,
        user_id,
        role,
        joined_at
      `)
      .eq('space_id', spaceId)
      .order('joined_at', {
        ascending: true,
      });


  if (membersError) {
    throw membersError;
  }


  if (!members || members.length === 0) {
    return [];
  }


  const userIds =
    members.map(
      (member) => member.user_id
    );


  const { data: profiles, error: profilesError } =
    await supabase
      .from('profiles')
      .select(`
        id,
        friend_id,
        email
      `)
      .in('id', userIds);


  if (profilesError) {
    throw profilesError;
  }


  const profileMap =
    new Map(
      (profiles || []).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );


  return members.map((member) => ({
    ...member,
    profile:
      profileMap.get(member.user_id) || null,
  }));

}


/* =========================================================
   ADD MEMBER USING FRIEND ID
========================================================= */

export async function addCollaborationMember(
  spaceId,
  friendId
) {

  const {
    data,
    error,
  } = await supabase.rpc(
    'add_collaboration_member_by_friend_id',
    {
      p_space_id:
        spaceId,

      p_friend_id:
        friendId
          .trim()
          .toUpperCase(),
    }
  );


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   REMOVE MEMBER
========================================================= */

export async function removeCollaborationMember(
  spaceId,
  userId
) {

  const {
    data,
    error,
  } = await supabase.rpc(
    'remove_collaboration_member',
    {
      p_space_id:
        spaceId,

      p_user_id:
        userId,
    }
  );


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   GET COLLABORATIVE BOOKS
========================================================= */

export async function getCollaborationBooks(
  spaceId
) {

  const {
    data,
    error,
  } = await supabase

    .from('collaboration_books')

    .select(`
      id,
      space_id,
      journal_id,
      created_by,
      created_at,
      journals (
        *
      )
    `)

    .eq(
      'space_id',
      spaceId
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


  return (data || [])
    .map((book) => ({
      ...book.journals,

      collaboration_book_id:
        book.id,

      created_by:
        book.created_by,
    }))
    .filter(Boolean);
}


/* =========================================================
   CREATE COLLABORATIVE BOOK
========================================================= */

export async function createCollaborationBook({
  spaceId,
  title,
  description,
  authorName,
  journalDate,
  coverColor,
  coverMaterial,
  spineColor,
}) {

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_collaboration_book',
    {
      p_space_id:
        spaceId,

      p_title:
        title?.trim() || null,

      p_description:
        description?.trim() || null,

      p_author_name:
        authorName?.trim() || null,

      p_journal_date:
        journalDate || null,

      p_cover_color:
        coverColor || null,

      p_cover_material:
        coverMaterial || null,

      p_spine_color:
        spineColor || null,
    }
  );


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   REMOVE BOOK FROM SHARED LIBRARY
========================================================= */

export async function removeCollaborationBook(
  spaceId,
  journalId
) {

  const {
    data,
    error,
  } = await supabase.rpc(
    'remove_collaboration_book',
    {
      p_space_id:
        spaceId,

      p_journal_id:
        journalId,
    }
  );


  if (error) {
    throw error;
  }


  return data;
}