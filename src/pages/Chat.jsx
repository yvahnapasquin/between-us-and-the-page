import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  getChatNotifications,
  getFriendRequests,
  getFriends,
  getMessages,
  getMyProfile,
  markAllChatsRead,
  searchUserByFriendId,
  sendFriendRequest,
  sendMessage,
  updateFriendRequest,
} from '../services/chatService';


export default function Chat() {

  const {
    user,
  } = useAuth();


  const [
    profile,
    setProfile,
  ] = useState(null);


  const [
    friends,
    setFriends,
  ] = useState([]);


  const [
    requests,
    setRequests,
  ] = useState([]);


  const [
    selectedFriend,
    setSelectedFriend,
  ] = useState(null);


  const [
    messages,
    setMessages,
  ] = useState([]);


  const messagesContainerRef = useRef(null);


  const shouldScrollToBottomRef = useRef(false);


  const [
    friendIdInput,
    setFriendIdInput,
  ] = useState('');


  const [
    searchResult,
    setSearchResult,
  ] = useState(null);


  const [
    messageInput,
    setMessageInput,
  ] = useState('');


  const [
    notifications,
    setNotifications,
  ] = useState([]);


  const [
    showNotifications,
    setShowNotifications,
  ] = useState(true);


  /* =======================================================
     COLLAPSIBLE FRIEND PANELS
  ======================================================= */

  const [
    openPanel,
    setOpenPanel,
  ] = useState(null);


  /* =======================================================
     STATES
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    searching,
    setSearching,
  ] = useState(false);


  const [
    sendingRequest,
    setSendingRequest,
  ] = useState(false);


  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  const [
    notice,
    setNotice,
  ] = useState('');


  function getFriendlyChatError(
    err,
    fallback
  ) {

    const message =
      err?.message || '';

    if (
      err?.code === '23503' ||
      message.toLowerCase().includes('foreign key')
    ) {
      return 'That user or friend is no longer available.';
    }

    if (
      err?.code === '42501' ||
      message.toLowerCase().includes('row-level security')
    ) {
      return 'You do not have permission to perform that action.';
    }

    if (
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch')
    ) {
      return 'Could not connect right now. Please check your connection and try again.';
    }

    return message || fallback;

  }


  function formatMessageDate(dateValue) {

    const date = new Date(dateValue);
    const now = new Date();

    const startOfDay = (value) =>
      new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );

    const dayDifference =
      Math.round(
        (startOfDay(now).getTime() -
          startOfDay(date).getTime()) /
          (24 * 60 * 60 * 1000)
      );

    if (dayDifference === 0) {
      return 'Today';
    }

    if (dayDifference === 1) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  }


  /* =======================================================
     LOAD CHAT DATA
  ======================================================= */

  async function loadData() {

    try {

      setLoading(true);

      setError('');


      const [
        myProfile,
        myFriends,
        myRequests,
        myNotifications,
      ] = await Promise.all([

        getMyProfile(),

        getFriends(),

        getFriendRequests(),

        getChatNotifications(),

      ]);


      setProfile(
        myProfile
      );


      setFriends(
        myFriends
      );


      setRequests(
        myRequests
      );


      setNotifications(
        myNotifications
      );


      setShowNotifications(
        myNotifications.length > 0
      );


      const notificationFriendIds = [

        ...new Set(

          myNotifications
            .filter(
              (notification) =>
                notification.type ===
                'message'
            )
            .map(
              (notification) =>
                notification.friendId
            )

        ),

      ];


      if (
        notificationFriendIds.length
      ) {

        await markAllChatsRead(
          notificationFriendIds
        );

      }

    } catch (err) {

      console.error(
        err
      );


      setError(
        getFriendlyChatError(
          err,
          'Could not load chat.'
        )
      );

    } finally {

      setLoading(false);

    }

  }


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    if (user) {

      loadData();

    }

  }, [user]);


  /* =======================================================
     LOAD MESSAGES WHEN A FRIEND IS SELECTED
  ======================================================= */

  useEffect(() => {

    let cancelled =
      false;


    async function loadMessages() {

      if (!selectedFriend) {

        setMessages([]);

        return;

      }


      try {

        const data =
          await getMessages(
            selectedFriend.id
          );


        if (!cancelled) {

          setMessages(
            data
          );

        }

      } catch (err) {

        console.error(
          err
        );


        if (!cancelled) {

          setError(
            getFriendlyChatError(
              err,
              'Could not load messages.'
            )
          );

        }

      }

    }


    loadMessages();


    const interval =
      window.setInterval(
        loadMessages,
        3000
      );


    return () => {

      cancelled = true;

      window.clearInterval(
        interval
      );

    };

  }, [selectedFriend]);


  /* =======================================================
     KEEP CHAT VIEW AT THE BOTTOM WHEN NEEDED
  ======================================================= */

  useEffect(() => {

    if (!selectedFriend) {

      return;

    }

    shouldScrollToBottomRef.current = true;

  }, [selectedFriend]);


  useEffect(() => {

    const container =
      messagesContainerRef.current;


    if (
      !container ||
      !shouldScrollToBottomRef.current
    ) {

      return;

    }


    container.scrollTop =
      container.scrollHeight;

    shouldScrollToBottomRef.current = false;

  }, [messages]);


  /* =======================================================
     SEARCH USER
  ======================================================= */

  async function handleSearch(
    event
  ) {

    event.preventDefault();


    try {

      setSearching(true);

      setError('');

      setNotice('');

      setSearchResult(null);


      const result =
        await searchUserByFriendId(
          friendIdInput
        );


      if (!result) {

        setNotice(
          'No user was found with that ID.'
        );

        return;

      }


      setSearchResult(
        result
      );

    } catch (err) {

      console.error(
        err
      );


      setError(
        getFriendlyChatError(
          err,
          'Could not search for that user.'
        )
      );

    } finally {

      setSearching(false);

    }

  }


  /* =======================================================
     SEND FRIEND REQUEST
  ======================================================= */

  async function handleAddFriend() {

    if (!searchResult) {

      return;

    }


    try {

      setSendingRequest(true);

      setError('');

      setNotice('');


      await sendFriendRequest(
        searchResult.id
      );


      setNotice(
        'Friend request sent.'
      );


      setSearchResult(
        null
      );


      setFriendIdInput('');

    } catch (err) {

      console.error(
        err
      );


      if (
        err?.code ===
        '23505'
      ) {

        setError(
          'A friend request already exists between you and this user.'
        );

      } else {

        setError(
          err?.message ||
          'Could not send the friend request.'
        );

      }

    } finally {

      setSendingRequest(false);

    }

  }


  /* =======================================================
     ACCEPT / DECLINE REQUEST
  ======================================================= */

  async function handleRequest(
    requestId,
    status
  ) {

    try {

      setError('');


      await updateFriendRequest(
        requestId,
        status
      );


      await loadData();

    } catch (err) {

      console.error(
        err
      );


      setError(
        getFriendlyChatError(
          err,
          'Could not update the friend request.'
        )
      );

    }

  }


  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async function handleSendMessage(
    event
  ) {

    event.preventDefault();


    if (
      !selectedFriend ||
      !messageInput.trim()
    ) {

      return;

    }


    try {

      setSendingMessage(
        true
      );

      setError('');


      const message =
        await sendMessage(
          selectedFriend.id,
          messageInput
        );


      if (message) {

        shouldScrollToBottomRef.current = true;

        setMessages(
          (current) => [
            ...current,
            message,
          ]
        );

      }


      setMessageInput('');

    } catch (err) {

      shouldScrollToBottomRef.current = false;

      console.error(
        err
      );


      setError(
        getFriendlyChatError(
          err,
          'Could not send the message.'
        )
      );

    } finally {

      setSendingMessage(
        false
      );

    }

  }


  /* =======================================================
     TOGGLE PANEL
  ======================================================= */

  function togglePanel(
    panel
  ) {

    setOpenPanel(
      (current) =>
        current === panel
          ? null
          : panel
    );

  }


  /* =======================================================
     SELECT FRIEND
  ======================================================= */

  function handleSelectFriend(
    friend
  ) {

    setSelectedFriend(
      friend
    );

  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (

      <div
        className="
          mx-auto
          max-w-5xl
          px-4
          py-10
          sm:px-6
          sm:py-16
        "
      >

        <p
          className="
            font-mono
            text-xs
            uppercase
            tracking-[0.18em]
            text-ink-soft
          "
        >
          Loading chat…
        </p>

      </div>

    );

  }


  return (

    <div
      className="
        mx-auto
        max-w-5xl
        px-4
        py-6
        sm:px-6
        sm:py-10
      "
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        className="
          mb-8
          flex
          flex-col
          items-stretch
          justify-between
          gap-5
          sm:flex-row
          sm:items-start
          sm:gap-6
        "
      >

        <div>

          <p
            className="
              font-mono
              text-xs
              uppercase
              tracking-[0.18em]
              text-ink-soft
            "
          >
            Messages
          </p>


          <h1
            className="
              mt-2
              font-display
              text-3xl
            "
          >
            Chat
          </h1>


          <p
            className="
              mt-2
              max-w-2xl
              font-body
              text-sm
              leading-6
              text-ink-soft
            "
          >
            Add friends using their unique
            user ID, then message them here.
          </p>

        </div>


        {/* =================================================
            MY USER ID
        ================================================= */}

        {profile && (

          <div
            className="
              w-full
              max-w-none
              shrink-0
              rounded-xl
              border
              border-ink/15
              bg-paper/70
              p-4
              sm:max-w-sm
            "
          >

            <p
              className="
                font-mono
                text-[11px]
                uppercase
                tracking-[0.16em]
                text-ink-soft
              "
            >
              Your user ID
            </p>


            <div
              className="
                mt-2
              "
            >

              <p
                className="
                  break-all
                  font-mono
                  text-lg
                  tracking-[0.12em]
                  text-ink
                "
              >
                {profile.friend_id}
              </p>


              <p
                className="
                  mt-1
                  font-body
                  text-xs
                  text-ink-soft
                "
              >
                Share this ID with friends
                so they can find you.
              </p>

            </div>

          </div>

        )}

      </div>


      {/* ===================================================
          NOTIFICATIONS
      =================================================== */}

      {notifications.length > 0 && (

        <div
          className="
            mb-6
            rounded-xl
            border
            border-ink/15
            bg-paper/70
            p-4
          "
        >

          <button
            type="button"
            onClick={() =>
              setShowNotifications(
                (current) =>
                  !current
              )
            }
            className="
              flex
              w-full
              items-center
              justify-between
              gap-4
              text-left
            "
          >

            <div>

              <p
                className="
                  font-mono
                  text-[11px]
                  uppercase
                  tracking-[0.16em]
                  text-ink-soft
                "
              >
                Notifications
              </p>


              <h2
                className="
                  mt-1
                  font-display
                  text-xl
                "
              >
                {notifications.length}
                {' '}
                new notification
                {notifications.length === 1
                  ? ''
                  : 's'}
              </h2>

            </div>


            <span
              className="
                font-mono
                text-xs
                text-ink-soft
              "
            >
              {showNotifications
                ? 'Hide'
                : 'Show'}
            </span>

          </button>


          {showNotifications && (

            <div
              className="
                mt-4
                space-y-2
              "
            >

              {notifications.map(
                (notification) => {

                  const source =
                    notification
                      .profile
                      ?.friend_id ||
                    'Unknown user';


                  return (

                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() => {

                        if (
                          notification.type ===
                          'message'
                        ) {

                          const friend =
                            friends.find(
                              (item) =>
                                item.id ===
                                notification.friendId
                            );


                          if (friend) {

                            setSelectedFriend(
                              friend
                            );


                            setOpenPanel(
                              'friends'
                            );

                          }

                        }

                      }}
                      className="
                        w-full
                        rounded-lg
                        border
                        border-ink/10
                        p-3
                        text-left
                        transition
                        hover:border-ink/30
                      "
                    >

                      <div
                        className="
                          flex
                          flex-col
                          items-start
                          justify-between
                          gap-2
                          sm:flex-row
                          sm:items-start
                          sm:gap-4
                        "
                      >

                        <div
                          className="
                            min-w-0
                            w-full
                            sm:w-auto
                          "
                        >

                          <p
                            className="
                              font-mono
                              text-sm
                            "
                          >

                            {notification.type ===
                            'friend_request'
                              ? 'Friend request'
                              : 'New message'}

                          </p>


                          <p
                            className="
                              mt-1
                              text-sm
                              text-ink-soft
                            "
                          >

                            From{' '}

                            <span
                              className="
                                font-mono
                                text-ink
                              "
                            >
                              {source}
                            </span>

                          </p>


                          {notification.type ===
                            'message' &&
                            notification.preview && (

                              <p
                                className="
                                  mt-1
                                  truncate
                                  text-xs
                                  text-ink-soft
                                "
                              >
                                {
                                  notification.preview
                                }
                              </p>

                            )}

                        </div>


                        <span
                          className="
                            shrink-0
                            font-mono
                            text-[10px]
                            text-ink-soft
                          "
                        >
                          {new Date(
                            notification.created_at
                          ).toLocaleString()}
                        </span>

                      </div>

                    </button>

                  );

                }
              )}

            </div>

          )}

        </div>

      )}


      {/* ===================================================
          ERROR / NOTICE
      =================================================== */}

      {(error || notice) && (

        <div
          className="
            mb-6
            rounded-lg
            border
            border-ink/15
            bg-paper/70
            px-4
            py-3
          "
        >

          {error && (

            <p
              className="
                text-sm
                text-red-900/75
              "
            >
              {error}
            </p>

          )}


          {!error && notice && (

            <p
              className="
                text-sm
                text-ink-soft
              "
            >
              {notice}
            </p>

          )}

        </div>

      )}


      {/* ===================================================
          FRIEND CONTROLS
      =================================================== */}

      <section
        className="
          mb-6
        "
      >

        {/* =================================================
            THREE CARDS
        ================================================= */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
            sm:gap-3
          "
        >

          {/* ===============================================
              ADD FRIEND
          =============================================== */}

          <button
            type="button"
            onClick={() =>
              togglePanel('add')
            }
            className={`
              min-w-0
              rounded-xl
              border
              px-2
              py-3
              text-center
              transition
              sm:px-4
              sm:py-4
              ${
                openPanel === 'add'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/15 bg-paper/70 hover:border-ink/30'
              }
            `}
          >

            <p
              className="
                break-words
                font-mono
                text-[10px]
                uppercase
                leading-4
                tracking-[0.08em]
                sm:text-xs
                sm:tracking-[0.12em]
              "
            >
              Add a friend
            </p>

          </button>


          {/* ===============================================
              FRIEND REQUESTS
          =============================================== */}

          <button
            type="button"
            onClick={() =>
              togglePanel('requests')
            }
            className={`
              min-w-0
              rounded-xl
              border
              px-2
              py-3
              text-center
              transition
              sm:px-4
              sm:py-4
              ${
                openPanel === 'requests'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/15 bg-paper/70 hover:border-ink/30'
              }
            `}
          >

            <div
              className="
                flex
                items-center
                justify-center
                gap-1.5
                sm:gap-2
              "
            >

              <p
                className="
                  break-words
                  font-mono
                  text-[10px]
                  uppercase
                  leading-4
                  tracking-[0.08em]
                  sm:text-xs
                  sm:tracking-[0.12em]
                "
              >
                Friend requests
              </p>


              <span
                className={`
                  shrink-0
                  font-mono
                  text-[10px]
                  ${
                    openPanel === 'requests'
                      ? 'text-paper/70'
                      : 'text-ink-soft'
                  }
                `}
              >
                {requests.length}
              </span>

            </div>

          </button>


          {/* ===============================================
              FRIENDS
          =============================================== */}

          <button
            type="button"
            onClick={() =>
              togglePanel('friends')
            }
            className={`
              min-w-0
              rounded-xl
              border
              px-2
              py-3
              text-center
              transition
              sm:px-4
              sm:py-4
              ${
                openPanel === 'friends'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/15 bg-paper/70 hover:border-ink/30'
              }
            `}
          >

            <div
              className="
                flex
                items-center
                justify-center
                gap-1.5
                sm:gap-2
              "
            >

              <p
                className="
                  break-words
                  font-mono
                  text-[10px]
                  uppercase
                  leading-4
                  tracking-[0.08em]
                  sm:text-xs
                  sm:tracking-[0.12em]
                "
              >
                Friends
              </p>


              <span
                className={`
                  shrink-0
                  font-mono
                  text-[10px]
                  ${
                    openPanel === 'friends'
                      ? 'text-paper/70'
                      : 'text-ink-soft'
                  }
                `}
              >
                {friends.length}
              </span>

            </div>

          </button>

        </div>


        {/* =================================================
            ADD FRIEND CONTENT
        ================================================= */}

        {openPanel === 'add' && (

          <div
            className="
              mt-3
              rounded-xl
              border
              border-ink/15
              bg-paper/70
              p-4
              sm:p-5
            "
          >

            <h2
              className="
                font-display
                text-xl
              "
            >
              Add a friend
            </h2>


            <form
              onSubmit={
                handleSearch
              }
              className="
                mt-4
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >

              <input
                value={
                  friendIdInput
                }
                onChange={(event) =>
                  setFriendIdInput(
                    event.target.value
                      .toUpperCase()
                  )
                }
                placeholder="Enter user ID"
                className="
                  min-w-0
                  flex-1
                  rounded-md
                  border
                  border-ink/20
                  bg-paper
                  px-3
                  py-2
                  font-mono
                  text-sm
                  outline-none
                  focus:border-ink/50
                "
                maxLength={12}
              />


              <button
                type="submit"
                disabled={
                  searching ||
                  !friendIdInput.trim()
                }
                className="
                  shrink-0
                  rounded-md
                  border
                  border-ink
                  bg-ink
                  px-5
                  py-2
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-paper
                  transition
                  hover:opacity-85
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {searching
                  ? 'Searching…'
                  : 'Search'}
              </button>

            </form>


            {searchResult && (

              <div
                className="
                  mt-4
                  rounded-lg
                  border
                  border-ink/15
                  p-3
                  sm:max-w-md
                "
              >

                <p
                  className="
                    font-mono
                    text-sm
                    tracking-wide
                  "
                >
                  {searchResult.friend_id}
                </p>


                <p
                  className="
                    mt-1
                    break-all
                    text-xs
                    text-ink-soft
                  "
                >
                  {searchResult.email}
                </p>


                <button
                  type="button"
                  onClick={
                    handleAddFriend
                  }
                  disabled={
                    sendingRequest
                  }
                  className="
                    mt-3
                    w-full
                    rounded-md
                    border
                    border-ink/20
                    px-3
                    py-2
                    font-mono
                    text-xs
                    uppercase
                    tracking-wide
                    transition
                    hover:bg-ink
                    hover:text-paper
                    disabled:opacity-50
                  "
                >
                  {sendingRequest
                    ? 'Sending…'
                    : 'Add friend'}
                </button>

              </div>

            )}

          </div>

        )}


        {/* =================================================
            FRIEND REQUESTS CONTENT
        ================================================= */}

        {openPanel === 'requests' && (

          <div
            className="
              mt-3
              rounded-xl
              border
              border-ink/15
              bg-paper/70
              p-4
              sm:p-5
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <h2
                className="
                  font-display
                  text-xl
                "
              >
                Friend requests
              </h2>


              <span
                className="
                  font-mono
                  text-xs
                  text-ink-soft
                "
              >
                {requests.length}
              </span>

            </div>


            <div
              className="
                mt-4
                grid
                gap-3
                sm:grid-cols-2
              "
            >

              {!requests.length && (

                <p
                  className="
                    text-sm
                    text-ink-soft
                    sm:col-span-2
                  "
                >
                  No pending requests.
                </p>

              )}


              {requests.map(
                (request) => (

                  <div
                    key={
                      request.id
                    }
                    className="
                      rounded-lg
                      border
                      border-ink/10
                      p-3
                    "
                  >

                    <p
                      className="
                        font-mono
                        text-sm
                      "
                    >
                      {
                        request.requester
                          ?.friend_id
                      }
                    </p>


                    <p
                      className="
                        mt-1
                        break-all
                        text-xs
                        text-ink-soft
                      "
                    >
                      {
                        request.requester
                          ?.email
                      }
                    </p>


                    <div
                      className="
                        mt-3
                        flex
                        gap-2
                      "
                    >

                      <button
                        type="button"
                        onClick={() =>
                          handleRequest(
                            request.id,
                            'accepted'
                          )
                        }
                        className="
                          flex-1
                          rounded-md
                          border
                          border-ink
                          bg-ink
                          px-2
                          py-1.5
                          font-mono
                          text-[11px]
                          uppercase
                          tracking-wide
                          text-paper
                        "
                      >
                        Accept
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          handleRequest(
                            request.id,
                            'rejected'
                          )
                        }
                        className="
                          flex-1
                          rounded-md
                          border
                          border-ink/20
                          px-2
                          py-1.5
                          font-mono
                          text-[11px]
                          uppercase
                          tracking-wide
                        "
                      >
                        Decline
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        {/* =================================================
            FRIENDS CONTENT
        ================================================= */}

        {openPanel === 'friends' && (

          <div
            className="
              mt-3
              rounded-xl
              border
              border-ink/15
              bg-paper/70
              p-4
              sm:p-5
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <h2
                className="
                  font-display
                  text-xl
                "
              >
                Friends
              </h2>


              <span
                className="
                  font-mono
                  text-xs
                  text-ink-soft
                "
              >
                {friends.length}
              </span>

            </div>


            <div
              className="
                mt-4
                grid
                gap-2
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >

              {!friends.length && (

                <p
                  className="
                    text-sm
                    text-ink-soft
                    sm:col-span-2
                    lg:col-span-3
                  "
                >
                  Add someone using their
                  user ID to start chatting.
                </p>

              )}


              {friends.map(
                (friend) => (

                  <button
                    key={
                      friend.id
                    }
                    type="button"
                    onClick={() =>
                      handleSelectFriend(
                        friend
                      )
                    }
                    className={`
                      w-full
                      rounded-lg
                      border
                      px-3
                      py-3
                      text-left
                      transition
                      ${
                        selectedFriend?.id ===
                        friend.id
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink/10 hover:border-ink/30'
                      }
                    `}
                  >

                    <p
                      className="
                        font-mono
                        text-sm
                      "
                    >
                      {friend.friend_id}
                    </p>


                    <p
                      className={`
                        mt-1
                        break-all
                        text-xs
                        ${
                          selectedFriend?.id ===
                          friend.id
                            ? 'text-paper/70'
                            : 'text-ink-soft'
                        }
                      `}
                    >
                      {friend.email}
                    </p>

                  </button>

                )
              )}

            </div>

          </div>

        )}

      </section>


      {/* ===================================================
          CHAT WINDOW
          
          ONLY APPEARS AFTER A FRIEND IS SELECTED
      =================================================== */}

      {selectedFriend && (

        <section
          className="
            flex
            min-h-[460px]
            flex-col
            rounded-xl
            border
            border-ink/15
            bg-paper/70
            lg:min-h-[520px]
          "
        >

          {/* =================================================
              CHAT HEADER
          ================================================= */}

          <div
            className="
              border-b
              border-ink/10
              px-5
              py-4
            "
          >

            <p
              className="
                font-mono
                text-xs
                uppercase
                tracking-[0.16em]
                text-ink-soft
              "
            >
              Chatting with
            </p>


            <h2
              className="
                mt-1
                font-display
                text-xl
              "
            >
              {selectedFriend.friend_id}
            </h2>


            <p
              className="
                mt-1
                break-all
                text-xs
                text-ink-soft
              "
            >
              {selectedFriend.email}
            </p>

          </div>


          {/* =================================================
              MESSAGES
          ================================================= */}

          <div
            ref={messagesContainerRef}
            className="
              h-[460px]
              min-h-0
              overflow-y-auto
              p-5
              lg:h-[520px]
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >

            {!messages.length && (

              <div
                className="
                  flex
                  h-full
                  items-center
                  justify-center
                  text-center
                "
              >

                <p
                  className="
                    max-w-xs
                    text-sm
                    leading-6
                    text-ink-soft
                  "
                >
                  No messages yet.
                  Send the first message
                  below.
                </p>

              </div>

            )}


            {messages.map(
              (message, index) => {

                const mine =
                  message.sender_id ===
                  user.id;

                const previousMessage =
                  messages[index - 1];

                const hasTimeGap =
                  previousMessage &&
                  new Date(
                    message.created_at
                  ).getTime() -
                    new Date(
                      previousMessage.created_at
                    ).getTime() >=
                    5 * 60 * 1000;

                const currentDate =
                  formatMessageDate(
                    message.created_at
                  );

                const previousDate =
                  previousMessage
                    ? formatMessageDate(
                        previousMessage.created_at
                      )
                    : null;

                const showDate =
                  currentDate !== previousDate;

                return (

                  <div
                    key={
                      message.id
                    }
                  >

                    {showDate && (

                      <div
                        className="
                          mb-3
                          mt-1
                          flex
                          items-center
                          gap-3
                        "
                      >

                        <div
                          className="
                            h-px
                            flex-1
                            bg-ink/10
                          "
                        />

                        <span
                          className="
                            shrink-0
                            font-mono
                            text-[10px]
                            uppercase
                            tracking-[0.14em]
                            text-ink-soft
                          "
                        >
                          {currentDate}
                        </span>

                        <div
                          className="
                            h-px
                            flex-1
                            bg-ink/10
                          "
                        />

                      </div>

                    )}

                    <div
                      className={`
                        flex
                        ${
                          hasTimeGap
                            ? 'mt-7'
                            : index === 0 || showDate
                              ? 'mt-0'
                              : 'mt-0.5'
                        }
                        ${
                          mine
                            ? 'justify-end'
                            : 'justify-start'
                        }
                      `}
                    >

                      <div
                        className={`
                          max-w-[80%]
                          rounded-xl
                          px-4
                          py-2.5
                          ${
                            mine
                              ? 'bg-ink text-paper'
                              : 'border border-ink/10 bg-paper'
                          }
                        `}
                      >

                        <p
                          className="
                            whitespace-pre-wrap
                            break-words
                            text-sm
                            leading-5
                          "
                        >
                          {message.content}
                        </p>

                        <p
                          className={`
                            mt-1
                            text-[10px]
                            ${
                              mine
                                ? 'text-paper/60'
                                : 'text-ink-soft'
                            }
                          `}
                        >
                          {new Date(
                            message.created_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                );

              }
            )}

          </div>


          {/* =================================================
              SEND MESSAGE
          ================================================= */}

          <form
            onSubmit={
              handleSendMessage
            }
            className="
              border-t
              border-ink/10
              p-4
            "
          >

            <div
              className="
                flex
                gap-2
              "
            >

              <input
                value={
                  messageInput
                }
                onChange={(event) =>
                  setMessageInput(
                    event.target.value
                  )
                }
                placeholder="Write a message…"
                className="
                  min-w-0
                  flex-1
                  rounded-md
                  border
                  border-ink/20
                  bg-paper
                  px-3
                  py-2
                  font-body
                  text-base
                  outline-none
                  focus:border-ink/50
                "
                maxLength={2000}
              />


              <button
                type="submit"
                disabled={
                  sendingMessage ||
                  !messageInput.trim()
                }
                className="
                  shrink-0
                  rounded-md
                  border
                  border-ink
                  bg-ink
                  px-4
                  py-2
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-paper
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {sendingMessage
                  ? '…'
                  : 'Send'}
              </button>

            </div>

          </form>

        </section>

      )}

    </div>

  );

}