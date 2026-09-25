import {
  useEffect,
  useRef,
} from 'react';

import { toSpotifyEmbedUrl } from '../utils/spotify';

const SPOTIFY_IFRAME_API_SRC =
  'https://open.spotify.com/embed/iframe-api/v1';

const SPOTIFY_PLAY_EVENT =
  'between-us-spotify-play';

let spotifyApiPromise = null;

function loadSpotifyIframeApi() {
  if (
    typeof window === 'undefined'
  ) {
    return Promise.resolve(null);
  }

  if (
    window.SpotifyIframeApi
  ) {
    return Promise.resolve(
      window.SpotifyIframeApi
    );
  }

  if (
    spotifyApiPromise
  ) {
    return spotifyApiPromise;
  }

  spotifyApiPromise =
    new Promise((resolve) => {

      const previous =
        window.onSpotifyIframeApiReady;

      window.onSpotifyIframeApiReady =
        (api) => {

          window.SpotifyIframeApi =
            api;

          if (
            typeof previous ===
            'function'
          ) {
            previous(api);
          }

          resolve(api);

        };

      const existing =
        document.querySelector(
          `script[src="${SPOTIFY_IFRAME_API_SRC}"]`
        );

      if (existing) {
        return;
      }

      const script =
        document.createElement(
          'script'
        );

      script.src =
        SPOTIFY_IFRAME_API_SRC;

      script.async = true;

      document.body.appendChild(
        script
      );

    });

  return spotifyApiPromise;
}

export default function SpotifyPlayer({
  spotifyUrl,
  active = true,
}) {

  const embedUrl =
    toSpotifyEmbedUrl(
      spotifyUrl
    );

  const containerRef =
    useRef(null);

  const controllerRef =
    useRef(null);

  const isPlayingRef =
    useRef(false);

  useEffect(() => {

    let cancelled = false;

    if (
      !embedUrl ||
      !active ||
      !containerRef.current
    ) {
      return undefined;
    }

    function stopThisPlayer() {

      const controller =
        controllerRef.current;

      if (
        controller &&
        typeof controller.pause ===
          'function'
      ) {

        try {
          controller.pause();
        } catch {
          // Ignore Spotify cleanup errors.
        }

      }

      isPlayingRef.current =
        false;

    }

    function handleOtherSpotifyPlay(
      event
    ) {

      /*
        If another SpotifyPlayer started
        playing, stop this player.

        The source controller is included
        in the event so the player that
        started playback does not pause itself.
      */

      if (
        event.detail?.controller ===
        controllerRef.current
      ) {
        return;
      }

      stopThisPlayer();

    }

    window.addEventListener(
      SPOTIFY_PLAY_EVENT,
      handleOtherSpotifyPlay
    );

    loadSpotifyIframeApi()
      .then((api) => {

        if (
          cancelled ||
          !api ||
          !containerRef.current
        ) {
          return;
        }

        /*
          Re-create the Spotify controller
          when the Spotify URL changes.
        */

        containerRef.current.innerHTML =
          '';

        const match =
          spotifyUrl.match(
            /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/
          );

        if (!match) {
          return;
        }

        const [
          ,
          type,
          id,
        ] = match;

        const spotifyUri =
          `spotify:${type}:${id}`;

        api.createController(
          containerRef.current,
          {
            width: '100%',
            height: 152,
            uri: spotifyUri,
          },
          (controller) => {

            if (cancelled) {
              return;
            }

            controllerRef.current =
              controller;

            /*
              Listen for Spotify playback
              changes.

              When this player starts playing,
              notify every other SpotifyPlayer
              in the application.
            */

            if (
              typeof controller.addListener ===
                'function'
            ) {

              controller.addListener(
                'playback_update',
                (event) => {

                  if (
                    cancelled
                  ) {
                    return;
                  }

                  const isPlaying =
                    Boolean(
                      event?.data?.isPaused ===
                        false
                    );

                  if (
                    isPlaying &&
                    !isPlayingRef.current
                  ) {

                    isPlayingRef.current =
                      true;

                    window.dispatchEvent(
                      new CustomEvent(
                        SPOTIFY_PLAY_EVENT,
                        {
                          detail: {
                            controller,
                          },
                        }
                      )
                    );

                  } else if (
                    !isPlaying
                  ) {

                    isPlayingRef.current =
                      false;

                  }

                }
              );

            }

          }
        );

      })
      .catch((error) => {

        console.error(
          'Failed to initialize Spotify Embed:',
          error
        );

      });

    return () => {

      cancelled = true;

      window.removeEventListener(
        SPOTIFY_PLAY_EVENT,
        handleOtherSpotifyPlay
      );

      if (
        controllerRef.current &&
        typeof controllerRef.current.destroy ===
          'function'
      ) {

        try {
          controllerRef.current.destroy();
        } catch {
          // Ignore cleanup errors.
        }

      }

      controllerRef.current =
        null;

      isPlayingRef.current =
        false;

    };

  }, [
    embedUrl,
    spotifyUrl,
    active,
  ]);

  if (!embedUrl) {
    return null;
  }

  if (!active) {
    return (
      <div
        style={{
          width: '100%',
          height: 152,
        }}
        className="rounded-sm"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 152,
      }}
      aria-label="Spotify player"
    />
  );
}