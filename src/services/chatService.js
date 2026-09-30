import { supabase } from './supabase';


/* =========================================================
   GET CURRENT USER
========================================================= */

async function getCurrentUser() {

  const {
    data,
    error,
  } = await supabase.auth.getUser();


  if (error) {
    throw error;
  }


  if (!data.user) {
    throw new Error(
      'You must be signed in.'
    );
  }


  return data.user;

}


/* =========================================================
   GET MY PROFILE
========================================================= */

export async function getMyProfile() {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'id, friend_id, email, pen_name'
    )
    .eq(
      'id',
      user.id
    )
    .single();


  if (error) {
    throw error;
  }


  return data;

}


/* =========================================================
   SEARCH USER BY FRIEND ID
========================================================= */

export async function searchUserByFriendId(
  friendId
) {

  const user =
    await getCurrentUser();


  const cleanId =
    friendId
      .trim()
      .toUpperCase();


  if (!cleanId) {
    return null;
  }


  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'id, friend_id, email, pen_name'
    )
    .eq(
      'friend_id',
      cleanId
    )
    .neq(
      'id',
      user.id
    )
    .maybeSingle();


  if (error) {
    throw error;
  }


  return data;

}


/* =========================================================
   SEND FRIEND REQUEST
========================================================= */

export async function sendFriendRequest(
  recipientId
) {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('friend_requests')
    .insert({
      requester_id:
        user.id,

      recipient_id:
        recipientId,

      status:
        'pending',
    })
    .select(
      'id, requester_id, recipient_id, status, created_at'
    )
    .single();


  if (error) {
    throw error;
  }


  return data;

}


/* =========================================================
   GET FRIEND REQUESTS
========================================================= */

export async function getFriendRequests() {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('friend_requests')
    .select(
      'id, requester_id, recipient_id, status, created_at'
    )
    .eq(
      'recipient_id',
      user.id
    )
    .eq(
      'status',
      'pending'
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );


  if (error) {
    throw error;
  }


  const requesterIds =
    (data || []).map(
      (request) =>
        request.requester_id
    );


  if (!requesterIds.length) {
    return [];
  }


  const {
    data: profiles,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'id, friend_id, email, pen_name'
    )
    .in(
      'id',
      requesterIds
    );


  if (profileError) {
    throw profileError;
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


  return (data || []).map(
    (request) => ({
      ...request,

      requester:
        profileMap.get(
          request.requester_id
        ) || null,
    })
  );

}


/* =========================================================
   ACCEPT / DECLINE FRIEND REQUEST
========================================================= */

export async function updateFriendRequest(
  requestId,
  status
) {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('friend_requests')
    .update({
      status,
    })
    .eq(
      'id',
      requestId
    )
    .eq(
      'recipient_id',
      user.id
    )
    .select(
      'id, requester_id, recipient_id, status, created_at'
    )
    .single();


  if (error) {
    throw error;
  }


  return data;

}


/* =========================================================
   GET FRIENDS
========================================================= */

export async function getFriends() {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('friend_requests')
    .select(
      'id, requester_id, recipient_id, status, created_at'
    )
    .eq(
      'status',
      'accepted'
    )
    .or(
      `requester_id.eq.${user.id},recipient_id.eq.${user.id}`
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );


  if (error) {
    throw error;
  }


  const friendIds =
    (data || []).map(
      (request) =>
        request.requester_id === user.id
          ? request.recipient_id
          : request.requester_id
    );


  if (!friendIds.length) {
    return [];
  }


  const {
    data: profiles,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'id, friend_id, email, pen_name'
    )
    .in(
      'id',
      friendIds
    );


  if (profileError) {
    throw profileError;
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


  return (data || [])
    .map(
      (request) => {

        const friendId =
          request.requester_id === user.id
            ? request.recipient_id
            : request.requester_id;


        return (
          profileMap.get(
            friendId
          ) || null
        );

      }
    )
    .filter(Boolean);

}


/* =========================================================
   GET MESSAGES
========================================================= */

export async function getMessages(
  friendId
) {

  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } = await supabase
    .from('messages')
    .select(
      'id, sender_id, receiver_id, content, created_at'
    )
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    );


  if (error) {
    throw error;
  }


  return data || [];

}


/* =========================================================
   SEND MESSAGE
========================================================= */

export async function sendMessage(
  friendId,
  content
) {

  const user =
    await getCurrentUser();


  const cleanContent =
    content.trim();


  if (!cleanContent) {
    return null;
  }


  const {
    data,
    error,
  } = await supabase
    .from('messages')
    .insert({
      sender_id:
        user.id,

      receiver_id:
        friendId,

      content:
        cleanContent,
    })
    .select(
      'id, sender_id, receiver_id, content, created_at'
    )
    .single();


  if (error) {
    throw error;
  }


  return data;

}


/* =========================================================
   GET CHAT NOTIFICATIONS
========================================================= */

export async function getChatNotifications() {

  const user =
    await getCurrentUser();


  /* -------------------------------------------------------
     FRIEND REQUESTS
  ------------------------------------------------------- */

  const {
    data: friendRequests,
    error: requestError,
  } = await supabase
    .from('friend_requests')
    .select(
      'id, requester_id, recipient_id, status, created_at'
    )
    .eq(
      'recipient_id',
      user.id
    )
    .eq(
      'status',
      'pending'
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );


  if (requestError) {
    throw requestError;
  }


  /* -------------------------------------------------------
     READ STATES
  ------------------------------------------------------- */

  const {
    data: readStates,
    error: readStateError,
  } = await supabase
    .from('chat_read_state')
    .select(
      'friend_id, last_read_at'
    )
    .eq(
      'user_id',
      user.id
    );


  if (readStateError) {
    throw readStateError;
  }


  const readStateMap =
    new Map(
      (readStates || []).map(
        (state) => [
          state.friend_id,
          state.last_read_at,
        ]
      )
    );


  /* -------------------------------------------------------
     UNREAD MESSAGES
  ------------------------------------------------------- */

  const {
    data: unreadMessages,
    error: messageError,
  } = await supabase
    .from('messages')
    .select(
      'id, sender_id, receiver_id, content, created_at'
    )
    .eq(
      'receiver_id',
      user.id
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );


  if (messageError) {
    throw messageError;
  }


  const filteredUnreadMessages =
    (unreadMessages || []).filter(
      (message) => {

        const lastReadAt =
          readStateMap.get(
            message.sender_id
          );


        if (!lastReadAt) {
          return true;
        }


        return (
          new Date(
            message.created_at
          ).getTime() >
          new Date(
            lastReadAt
          ).getTime()
        );

      }
    );


  /* -------------------------------------------------------
     COLLECT PROFILE IDS
  ------------------------------------------------------- */

  const profileIds = [

    ...(friendRequests || []).map(
      (request) =>
        request.requester_id
    ),

    ...filteredUnreadMessages.map(
      (message) =>
        message.sender_id
    ),

  ];


  const uniqueProfileIds =
    [
      ...new Set(
        profileIds
      ),
    ];


  let profiles = [];


  if (
    uniqueProfileIds.length
  ) {

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(
        'id, friend_id, email, pen_name'
      )
      .in(
        'id',
        uniqueProfileIds
      );


    if (error) {
      throw error;
    }


    profiles =
      data || [];

  }


  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );


  /* -------------------------------------------------------
     COMBINE NOTIFICATIONS
  ------------------------------------------------------- */

  const notifications = [

    ...(friendRequests || []).map(
      (request) => ({

        id:
          `request-${request.id}`,

        type:
          'friend_request',

        created_at:
          request.created_at,

        profile:
          profileMap.get(
            request.requester_id
          ) || null,

        requestId:
          request.id,

      })
    ),


    ...filteredUnreadMessages.map(
      (message) => ({

        id:
          `message-${message.id}`,

        type:
          'message',

        created_at:
          message.created_at,

        profile:
          profileMap.get(
            message.sender_id
          ) || null,

        friendId:
          message.sender_id,

        messageId:
          message.id,

        preview:
          message.content,

      })
    ),

  ];


  notifications.sort(
    (a, b) =>
      new Date(
        b.created_at
      ).getTime() -
      new Date(
        a.created_at
      ).getTime()
  );


  return notifications;

}


/* =========================================================
   GET NOTIFICATION COUNT
========================================================= */

export async function getNotificationCount() {

  const notifications =
    await getChatNotifications();


  return notifications.length;

}


/* =========================================================
   MARK ONE CHAT AS READ
========================================================= */

export async function markChatRead(
  friendId
) {

  const user =
    await getCurrentUser();


  const {
    error,
  } = await supabase
    .from('chat_read_state')
    .upsert(
      {
        user_id:
          user.id,

        friend_id:
          friendId,

        last_read_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          'user_id,friend_id',
      }
    );


  if (error) {
    throw error;
  }

}


/* =========================================================
   MARK MULTIPLE CHATS AS READ
========================================================= */

export async function markAllChatsRead(
  friendIds
) {

  const user =
    await getCurrentUser();


  if (!friendIds.length) {
    return;
  }


  const now =
    new Date().toISOString();


  const rows =
    friendIds.map(
      (friendId) => ({

        user_id:
          user.id,

        friend_id:
          friendId,

        last_read_at:
          now,

      })
    );


  const {
    error,
  } = await supabase
    .from('chat_read_state')
    .upsert(
      rows,
      {
        onConflict:
          'user_id,friend_id',
      }
    );


  if (error) {
    throw error;
  }

}