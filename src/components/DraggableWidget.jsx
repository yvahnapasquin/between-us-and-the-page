import {
  useEffect,
  useRef,
  useState,
} from 'react';

const MIN_W = 120;
const MIN_H = 80;


/* =========================================================
   DRAGGABLE WIDGET
========================================================= */

export default function DraggableWidget({
  children,
  initial,
  containerRef,
  editable = true,
  onSave,
}) {

  const [
    box,
    setBox,
  ] = useState(
    initial ?? {
      x: 20,
      y: 20,
      w: 220,
      h: 120,
    }
  );


  /*
    Keep the latest box available to pointer handlers.

    This prevents mobile pointer events from working
    with an outdated state value.
  */

  const boxRef =
    useRef(box);


  const [
    isSelected,
    setIsSelected,
  ] = useState(false);


  const dragState =
    useRef(null);

  const resizeState =
    useRef(null);

  const saveTimeout =
    useRef(null);

  /*
    Keep the active pointer handlers attached to window.

    This makes desktop mouse dragging/resizing reliable even
    when the pointer leaves the 44x44 control.
  */
  const interactionHandlers =
    useRef(null);


  /*
    Remember the page's original scrolling styles.

    These are restored after the user releases
    the drag or resize handle.
  */

  const pageScrollLock =
    useRef(null);


  /* =========================================================
     KEEP BOX REF IN SYNC
  ========================================================= */

  useEffect(() => {

    boxRef.current =
      box;

  }, [
    box,
  ]);


  /* =========================================================
     UPDATE BOX WHEN INITIAL VALUE CHANGES
  ========================================================= */

  useEffect(() => {

    if (!initial) {
      return;
    }


    setBox((current) => {

      const next = {
        ...current,
        ...initial,
      };


      const same =
        current.x === next.x &&
        current.y === next.y &&
        current.w === next.w &&
        current.h === next.h;


      if (same) {
        return current;
      }


      boxRef.current =
        next;


      return next;

    });

  }, [
    initial?.x,
    initial?.y,
    initial?.w,
    initial?.h,
    initial?.url,
  ]);


  /* =========================================================
     MOBILE CHECK
  ========================================================= */

  function isMobileDevice() {

    if (
      typeof window === 'undefined'
    ) {

      return false;

    }


    return window.matchMedia(
      '(max-width: 800px) and (hover: none) and (pointer: coarse)'
    ).matches;

  }


  /* =========================================================
     GET CONTAINER DIMENSIONS
  ========================================================= */

  function getContainerDimensions() {

    if (
      !containerRef?.current
    ) {

      return {
        width: 360,
        height: 480,
        scale: 1,
      };

    }


    const element =
      containerRef.current;


    /*
      IMPORTANT FOR MOBILE:

      The book itself is visually scaled using CSS.

      getBoundingClientRect() returns the VISUAL
      scaled size.

      offsetWidth / offsetHeight return the
      ORIGINAL 360x480 page size.

      We use the original dimensions for widget
      positioning and calculate the scale separately.
    */

    const logicalWidth =
      element.offsetWidth ||
      360;

    const logicalHeight =
      element.offsetHeight ||
      480;


    const visualRect =
      element.getBoundingClientRect();


    const scale =
      logicalWidth > 0
        ? visualRect.width /
          logicalWidth
        : 1;


    return {

      width:
        logicalWidth,

      height:
        logicalHeight,

      scale:
        isMobileDevice()
          ? scale || 1
          : 1,

    };

  }


  /* =========================================================
     LOCK PAGE SCROLL
  ========================================================= */

  function lockPageScroll() {

    if (
      typeof document === 'undefined' ||
      pageScrollLock.current
    ) {

      return;

    }


    const body =
      document.body;

    const html =
      document.documentElement;


    pageScrollLock.current = {

      bodyOverflow:
        body.style.overflow,

      bodyTouchAction:
        body.style.touchAction,

      htmlOverflow:
        html.style.overflow,

      htmlTouchAction:
        html.style.touchAction,

    };


    /*
      Stop the page from scrolling while the user
      is actively dragging or resizing a widget.
    */

    body.style.overflow =
      'hidden';

    body.style.touchAction =
      'none';

    html.style.overflow =
      'hidden';

    html.style.touchAction =
      'none';


    /*
      Some mobile browsers can still try to process
      touch scrolling during pointer movement.

      Prevent it while an active widget interaction
      is happening.
    */

    document.addEventListener(
      'touchmove',
      preventPageTouchMove,
      {
        passive: false,
      }
    );

  }


  /* =========================================================
     PREVENT PAGE TOUCH SCROLL
  ========================================================= */

  function preventPageTouchMove(e) {

    if (
      dragState.current ||
      resizeState.current
    ) {

      if (
        e.cancelable
      ) {

        e.preventDefault();

      }

    }

  }


  /* =========================================================
     UNLOCK PAGE SCROLL
  ========================================================= */

  function unlockPageScroll() {

    if (
      typeof document === 'undefined'
    ) {

      return;

    }


    const saved =
      pageScrollLock.current;


    if (!saved) {
      return;
    }


    const body =
      document.body;

    const html =
      document.documentElement;


    body.style.overflow =
      saved.bodyOverflow;

    body.style.touchAction =
      saved.bodyTouchAction;

    html.style.overflow =
      saved.htmlOverflow;

    html.style.touchAction =
      saved.htmlTouchAction;


    document.removeEventListener(
      'touchmove',
      preventPageTouchMove
    );


    pageScrollLock.current =
      null;

  }


  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {

    return () => {

      if (saveTimeout.current) {

        clearTimeout(
          saveTimeout.current
        );

      }


      unlockPageScroll();

      if (interactionHandlers.current) {
        window.removeEventListener(
          'pointermove',
          interactionHandlers.current.move
        );

        window.removeEventListener(
          'pointerup',
          interactionHandlers.current.end
        );

        window.removeEventListener(
          'pointercancel',
          interactionHandlers.current.end
        );

        interactionHandlers.current =
          null;
      }

    };

  }, []);


  /* =========================================================
     CLAMP BOX INSIDE CONTAINER
  ========================================================= */

  function clamp(
    nextBox,
    container
  ) {

    const maxX =
      Math.max(
        container.width -
          nextBox.w,
        0
      );


    const maxY =
      Math.max(
        container.height -
          nextBox.h,
        0
      );


    return {

      ...nextBox,

      x: Math.min(
        Math.max(
          nextBox.x,
          0
        ),
        maxX
      ),

      y: Math.min(
        Math.max(
          nextBox.y,
          0
        ),
        maxY
      ),

      w: Math.min(
        Math.max(
          nextBox.w,
          MIN_W
        ),
        container.width
      ),

      h: Math.min(
        Math.max(
          nextBox.h,
          MIN_H
        ),
        container.height
      ),

    };

  }


  /* =========================================================
     SAVE
  ========================================================= */

  function scheduleSave(
    nextBox
  ) {

    if (!onSave) {
      return;
    }


    if (saveTimeout.current) {

      clearTimeout(
        saveTimeout.current
      );

    }


    saveTimeout.current =
      setTimeout(() => {

        onSave(
          nextBox
        );

      }, 400);

  }


  /* =========================================================
     DRAG START
  ========================================================= */

  function onDragStart(e) {

    if (!editable) {
      return;
    }


    e.preventDefault();

    e.stopPropagation();


    /*
      Freeze the page immediately when the
      user touches the drag button.
    */

    lockPageScroll();


    setIsSelected(
      true
    );


    const currentBox =
      boxRef.current;


    const dimensions =
      getContainerDimensions();


    dragState.current = {

      pointerId:
        e.pointerId,

      startX:
        e.clientX,

      startY:
        e.clientY,

      origX:
        currentBox.x,

      origY:
        currentBox.y,

      /*
        Mobile uses the inverse scale so the
        widget follows the finger correctly.
      */

      scale:
        dimensions.scale,

    };


    try {

      e.currentTarget.setPointerCapture(
        e.pointerId
      );

    } catch {
      // Ignore pointer capture errors.
    }

    /*
      Also listen on window.

      Pointer capture is normally enough, but the window
      listeners make desktop mouse interaction continue
      smoothly even if the pointer moves outside the handle.
    */

    interactionHandlers.current = {
      move: onDragMove,
      end: onDragEnd,
    };

    window.addEventListener(
      'pointermove',
      onDragMove
    );

    window.addEventListener(
      'pointerup',
      onDragEnd
    );

    window.addEventListener(
      'pointercancel',
      onDragEnd
    );

  }


  /* =========================================================
     DRAG MOVE
  ========================================================= */

  function onDragMove(e) {

    const drag =
      dragState.current;


    if (
      !drag ||
      drag.pointerId !==
        e.pointerId ||
      !containerRef?.current
    ) {

      return;

    }


    if (
      e.cancelable
    ) {

      e.preventDefault();

    }


    const dimensions =
      getContainerDimensions();


    /*
      Desktop:

        1 screen pixel = 1 page pixel

      Mobile:

        Because the book is scaled,
        convert screen movement back into
        the page's 360x480 coordinate system.
    */

    const dx =
      isMobileDevice()
        ? (
            e.clientX -
            drag.startX
          ) /
          drag.scale
        : (
            e.clientX -
            drag.startX
          );


    const dy =
      isMobileDevice()
        ? (
            e.clientY -
            drag.startY
          ) /
          drag.scale
        : (
            e.clientY -
            drag.startY
          );


    const currentBox =
      boxRef.current;


    const next =
      clamp(

        {

          ...currentBox,

          x:
            drag.origX +
            dx,

          y:
            drag.origY +
            dy,

        },

        {

          width:
            dimensions.width,

          height:
            dimensions.height,

        }

      );


    boxRef.current =
      next;


    setBox(
      next
    );

  }


  /* =========================================================
     DRAG END
  ========================================================= */

  function onDragEnd(e) {

    const drag =
      dragState.current;


    if (
      !drag ||
      drag.pointerId !==
        e.pointerId
    ) {

      return;

    }


    dragState.current =
      null;


    try {

      e.currentTarget.releasePointerCapture(
        e.pointerId
      );

    } catch {
      // Ignore pointer capture errors.
    }


    scheduleSave(
      boxRef.current
    );

    if (interactionHandlers.current) {
      window.removeEventListener(
        'pointermove',
        interactionHandlers.current.move
      );

      window.removeEventListener(
        'pointerup',
        interactionHandlers.current.end
      );

      window.removeEventListener(
        'pointercancel',
        interactionHandlers.current.end
      );

      interactionHandlers.current =
        null;
    }


    /*
      Page becomes scrollable again ONLY
      after the finger is released.
    */

    unlockPageScroll();

  }


  /* =========================================================
     RESIZE START
  ========================================================= */

  function onResizeStart(e) {

    if (!editable) {
      return;
    }


    e.preventDefault();

    e.stopPropagation();


    /*
      Freeze the page immediately when the
      user touches the resize button.
    */

    lockPageScroll();


    setIsSelected(
      true
    );


    const currentBox =
      boxRef.current;


    const dimensions =
      getContainerDimensions();


    resizeState.current = {

      pointerId:
        e.pointerId,

      startX:
        e.clientX,

      startY:
        e.clientY,

      origW:
        currentBox.w,

      origH:
        currentBox.h,

      /*
        Mobile resize also needs to compensate
        for the CSS book scale.
      */

      scale:
        dimensions.scale,

    };


    try {

      e.currentTarget.setPointerCapture(
        e.pointerId
      );

    } catch {
      // Ignore pointer capture errors.
    }

    interactionHandlers.current = {
      move: onResizeMove,
      end: onResizeEnd,
    };

    window.addEventListener(
      'pointermove',
      onResizeMove
    );

    window.addEventListener(
      'pointerup',
      onResizeEnd
    );

    window.addEventListener(
      'pointercancel',
      onResizeEnd
    );

  }


  /* =========================================================
     RESIZE MOVE
  ========================================================= */

  function onResizeMove(e) {

    const resize =
      resizeState.current;


    if (
      !resize ||
      resize.pointerId !==
        e.pointerId ||
      !containerRef?.current
    ) {

      return;

    }


    if (
      e.cancelable
    ) {

      e.preventDefault();

    }


    const dimensions =
      getContainerDimensions();


    /*
      Convert the finger movement from
      visual/scaled pixels into the actual
      page coordinate system.

      This allows the widget to resize naturally
      on small phones.
    */

    const dx =
      isMobileDevice()
        ? (
            e.clientX -
            resize.startX
          ) /
          resize.scale
        : (
            e.clientX -
            resize.startX
          );


    const dy =
      isMobileDevice()
        ? (
            e.clientY -
            resize.startY
          ) /
          resize.scale
        : (
            e.clientY -
            resize.startY
          );


    const currentBox =
      boxRef.current;


    const next =
      clamp(

        {

          ...currentBox,

          w: Math.max(
            MIN_W,
            resize.origW +
              dx
          ),

          h: Math.max(
            MIN_H,
            resize.origH +
              dy
          ),

        },

        {

          width:
            dimensions.width,

          height:
            dimensions.height,

        }

      );


    boxRef.current =
      next;


    setBox(
      next
    );

  }


  /* =========================================================
     RESIZE END
  ========================================================= */

  function onResizeEnd(e) {

    const resize =
      resizeState.current;


    if (
      !resize ||
      resize.pointerId !==
        e.pointerId
    ) {

      return;

    }


    resizeState.current =
      null;


    try {

      e.currentTarget.releasePointerCapture(
        e.pointerId
      );

    } catch {
      // Ignore pointer capture errors.
    }


    scheduleSave(
      boxRef.current
    );


    /*
      Page becomes scrollable again ONLY
      after the finger is released.
    */

    unlockPageScroll();

  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div

      style={{

        position:
          'absolute',

        left:
          box.x,

        top:
          box.y,

        width:
          box.w,

        height:
          box.h,

      }}

      className="
        group
      "

      onClick={(e) => {

        if (!editable) {
          return;
        }


        e.stopPropagation();


        setIsSelected(
          true
        );

      }}

    >

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div
        className="
          h-full
          w-full
          overflow-hidden
          rounded-md
        "
      >

        {children}

      </div>


      {/* =====================================================
          EDITOR CONTROLS
      ===================================================== */}

      {editable && (

        <>

          {/* ===============================================
              MOVE HANDLE

              44x44px touch target.

              On mobile, the drag calculations account
              for the scaled-down book.
          =============================================== */}

          <div

            className={`
              pointer-events-auto
              absolute
              left-1/2
              top-0
              z-20
              flex
              h-11
              w-11
              -translate-x-1/2
              items-center
              justify-center
              rounded-md
              bg-black/55
              text-white
              shadow-sm
              transition-opacity
              duration-150
              ${
                isSelected
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              }
            `}

            onPointerDown={
              onDragStart
            }

            onPointerMove={
              onDragMove
            }

            onPointerUp={
              onDragEnd
            }

            onPointerCancel={
              onDragEnd
            }

            style={{
              touchAction:
                'none',

              userSelect:
                'none',

              WebkitUserSelect:
                'none',

              WebkitTouchCallout:
                'none',

            }}

          >

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              pointerEvents="none"
            >

              <path d="M12 2v20" />

              <path d="m8 6 4-4 4 4" />

              <path d="m8 18 4 4 4-4" />

              <path d="M2 12h20" />

              <path d="m6 8-4 4 4 4" />

              <path d="m18 8 4 4-4 4" />

            </svg>

          </div>


          {/* ===============================================
              RESIZE HANDLE

              44x44px touch target.

              Mobile resize also compensates for the
              scaled-down book.
          =============================================== */}

          <div

            data-resize-handle

            onPointerDown={
              onResizeStart
            }

            onPointerMove={
              onResizeMove
            }

            onPointerUp={
              onResizeEnd
            }

            onPointerCancel={
              onResizeEnd
            }

            className={`
              absolute
              bottom-0
              right-0
              z-20
              flex
              h-5
              w-5
              cursor-se-resize
              items-end
              justify-end
              rounded-tl-md
              bg-black/55
              shadow-sm
              transition-opacity
              duration-150
              ${
                isSelected
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              }
            `}

            style={{
              touchAction:
                'none',

              userSelect:
                'none',

              WebkitUserSelect:
                'none',

              WebkitTouchCallout:
                'none',

            }}

          >

            <svg
              width="9"
              height="9"
              viewBox="0 0 12 12"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              pointerEvents="none"
              className="
                mb-1
                mr-1
              "
            >

              <path d="M3 9h6" />

              <path d="M6 6h3" />

              <path d="M9 3v6" />

            </svg>

          </div>

        </>

      )}

    </div>

  );

}