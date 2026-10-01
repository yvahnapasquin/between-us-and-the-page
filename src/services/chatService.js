
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
    throw new Error('You must be signed in.');
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
    .from('chat_profiles')
    .select(
      'id, friend_id, pen_name'
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
    .from('chat_profiles')
    .select(
      'id, friend_id, pen_name'
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
      requester_id: user.id,
      recipient_id: recipientId,
      status: 'pending',
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
        ascending: false,
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
    .from('chat_profiles')
    .select(
      'id, friend_id, pen_name'
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
   ---------------------------------------------------------
   Sorts friends by latest conversation activity.
   Friends with no messages are sorted by friendship
   creation date, so newly accepted friends appear
   near the top.
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
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  const friendships = data || [];

  const friendIds = [
    ...new Set(
      friendships.map((request) =>
        request.requester_id === user.id
          ? request.recipient_id
          : request.requester_id
      )
    ),
  ];

  if (!friendIds.length) {
    return [];
  }

  const [
    profilesResult,
    messagesResult,
  ] = await Promise.all([
    supabase
      .from('chat_profiles')
      .select('id, friend_id, pen_name')
      .in('id', friendIds),

    supabase
      .from('messages')
      .select('sender_id, receiver_id, created_at')
      .or(
        `sender_id.eq.${user.id},receiver_id.eq.${user.id}`
      )
      .order('created_at', { ascending: false }),
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  const profileMap = new Map(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      profile,
    ])
  );

  // Messages are ordered newest-first, so the first
  // message encountered for each friend is the latest.
  const latestMessageByFriend = new Map();

  for (const message of messagesResult.data || []) {
    const friendId =
      message.sender_id === user.id
        ? message.receiver_id
        : message.sender_id;

    if (
      friendIds.includes(friendId) &&
      !latestMessageByFriend.has(friendId)
    ) {
      latestMessageByFriend.set(
        friendId,
        message.created_at
      );
    }
  }

  return friendships
    .map((request) => {
      const friendId =
        request.requester_id === user.id
          ? request.recipient_id
          : request.requester_id;

      const profile = profileMap.get(friendId);

      if (!profile) {
        return null;
      }

      return {
        ...profile,
        friendship_created_at: request.created_at,
        last_message_at:
          latestMessageByFriend.get(friendId) || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aActivity = Math.max(
        new Date(a.last_message_at || 0).getTime(),
        new Date(a.friendship_created_at).getTime()
      );

      const bActivity = Math.max(
        new Date(b.last_message_at || 0).getTime(),
        new Date(b.friendship_created_at).getTime()
      );

      return bActivity - aActivity;
    });
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
        ascending: true,
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
      sender_id: user.id,
      receiver_id: friendId,
      content: cleanContent,
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
   GET CHAT READ STATES
========================================================= */

async function getChatReadStates(
  userId,
  friendIds
) {
  if (!friendIds.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('chat_read_state')
    .select(
      'friend_id, last_read_at'
    )
    .eq(
      'user_id',
      userId
    )
    .in(
      'friend_id',
      friendIds
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   GET CHAT NOTIFICATIONS
========================================================= */

export async function getChatNotifications() {
  const user =
    await getCurrentUser();

  const [
    friendRequestsResult,
    messagesResult,
  ] = await Promise.all([
    supabase
      .from('friend_requests')
      .select(
        'id, requester_id, created_at'
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
          ascending: false,
        }
      ),

    supabase
      .from('messages')
      .select(
        'id, sender_id, content, created_at'
      )
      .eq(
        'receiver_id',
        user.id
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      ),
  ]);

  if (friendRequestsResult.error) {
    throw friendRequestsResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  const requests =
    friendRequestsResult.data || [];

  const messages =
    messagesResult.data || [];

  const messageSenderIds = [
    ...new Set(
      messages.map(
        (message) =>
          message.sender_id
      )
    ),
  ];

  const readStates =
    await getChatReadStates(
      user.id,
      messageSenderIds
    );

  const readMap =
    new Map(
      readStates.map(
        (state) => [
          state.friend_id,
          state.last_read_at,
        ]
      )
    );

  const unreadMessages =
    messages.filter(
      (message) => {

        const lastReadAt =
          readMap.get(
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

  const profileIds = [
    ...new Set([
      ...requests.map(
        (request) =>
          request.requester_id
      ),
      ...unreadMessages.map(
        (message) =>
          message.sender_id
      ),
    ]),
  ];

  let profiles = [];

  if (profileIds.length) {

    const {
      data,
      error,
    } = await supabase
      .from('chat_profiles')
      .select(
        'id, friend_id, pen_name'
      )
      .in(
        'id',
        profileIds
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

  const notifications = [

    ...requests.map(
      (request) => ({
        id:
          `friend-request-${request.id}`,

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

    ...unreadMessages.map(
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

        messageId:
          message.id,

        message:
          message.content,
      })
    ),
  ];

  return notifications.sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
}


/* =========================================================
   GET NOTIFICATION COUNT
   ---------------------------------------------------------
   Kept as a separate export because Navbar.jsx uses this
   function for the notification badge.
========================================================= */

export async function getNotificationCount() {
  const notifications =
    await getChatNotifications();

  return notifications.length;
}


/* =========================================================
   MARK CHAT AS READ
========================================================= */

export async function markChatAsRead(
  friendId
) {
  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('chat_read_state')
    .upsert(
      {
        user_id: user.id,
        friend_id: friendId,
        last_read_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          'user_id,friend_id',
      }
    )
    .select(
      'user_id, friend_id, last_read_at'
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   MARK ALL CHATS AS READ
========================================================= */

export async function markAllChatsRead() {
  const user =
    await getCurrentUser();

  const {
    data: friends,
    error: friendsError,
  } = await supabase
    .from('friend_requests')
    .select(
      'requester_id, recipient_id'
    )
    .eq(
      'status',
      'accepted'
    )
    .or(
      `requester_id.eq.${user.id},recipient_id.eq.${user.id}`
    );

  if (friendsError) {
    throw friendsError;
  }

  const friendIds =
    (friends || []).map(
      (request) =>
        request.requester_id === user.id
          ? request.recipient_id
          : request.requester_id
    );

  if (!friendIds.length) {
    return [];
  }

  const now =
    new Date().toISOString();

  const rows =
    friendIds.map(
      (friendId) => ({
        user_id: user.id,
        friend_id: friendId,
        last_read_at: now,
      })
    );

  const {
    data,
    error,
  } = await supabase
    .from('chat_read_state')
    .upsert(
      rows,
      {
        onConflict:
          'user_id,friend_id',
      }
    )
    .select(
      'user_id, friend_id, last_read_at'
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   UNFRIEND
   ---------------------------------------------------------
   The database function verifies that the current user is one
   of the two people in the accepted friendship before removing
   it. Chat read-state rows for the friendship are removed too.
========================================================= */

export async function unfriendFriend(
  friendId
) {
  const user =
    await getCurrentUser();

  if (friendId === user.id) {
    throw new Error(
      'You cannot unfriend yourself.'
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'unfriend_friend',
    {
      p_friend_id:
        friendId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   DELETE CONVERSATION
   ---------------------------------------------------------
   Permanently removes messages between the current user and
   the selected friend. The database function verifies that
   the current user is one of the two participants.
========================================================= */

export async function deleteConversation(
  friendId
) {
  const user =
    await getCurrentUser();

  if (friendId === user.id) {
    throw new Error(
      'Invalid conversation.'
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'delete_chat_conversation',
    {
      p_friend_id:
        friendId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}