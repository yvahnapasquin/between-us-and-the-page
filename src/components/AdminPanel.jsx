import { useEffect, useState } from 'react';

import {
  addAdminEmail,
  getAdminEmails,
  removeAdminEmail,
} from '../services/adminService';


export default function AdminPanel({
  open,
  onClose,
}) {

  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [adminToRemove, setAdminToRemove] = useState(null);


  /* =========================================================
     LOAD ADMINS
  ========================================================= */

  useEffect(() => {

    if (!open) return;

    let cancelled = false;

    async function loadAdmins() {

      setLoading(true);
      setMessage('');

      try {

        const data = await getAdminEmails();

        if (!cancelled) {
          setAdmins(data);
        }

      } catch (error) {

        if (!cancelled) {

          console.error(
            'Failed to load admins:',
            error
          );

          setMessage(
            error.message ||
            'Could not load admins.'
          );

        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }

    loadAdmins();

    return () => {
      cancelled = true;
    };

  }, [open]);


  /* =========================================================
     ADD ADMIN
  ========================================================= */

  async function handleAddAdmin(event) {

    event.preventDefault();

    const trimmedEmail =
      email.trim().toLowerCase();

    if (!trimmedEmail.endsWith('@gmail.com')) {

      setMessage(
        'Please enter a Gmail address ending in @gmail.com.'
      );

      return;
    }

    setSaving(true);
    setMessage('');

    try {

      const admin =
        await addAdminEmail(trimmedEmail);

      setAdmins((current) => [
        ...current,
        admin,
      ]);

      setEmail('');

      setMessage('Admin added.');

    } catch (error) {

      console.error(
        'Failed to add admin:',
        error
      );

      setMessage(
        error.message ||
        'Could not add admin.'
      );

    } finally {

      setSaving(false);

    }

  }


  /* =========================================================
     REMOVE ADMIN
  ========================================================= */

  async function handleRemoveAdmin(admin) {

    setAdminToRemove(admin);

  }


  async function confirmRemoveAdmin() {

    if (!adminToRemove) return;

    const admin = adminToRemove;
    setAdminToRemove(null);

    try {

      await removeAdminEmail(admin.id);

      setAdmins((current) =>
        current.filter(
          (item) =>
            item.id !== admin.id
        )
      );

      setMessage('Admin removed.');

    } catch (error) {

      console.error(
        'Failed to remove admin:',
        error
      );

      setMessage(
        error.message ||
        'Could not remove admin.'
      );

    }

  }


  return (
    <>
      {/* =====================================================
          BACKDROP
      ===================================================== */}

      <div
        className={`
          fixed
          inset-0
          z-[10000]
          bg-black/20
          backdrop-blur-[1px]
          transition-opacity
          duration-200
          ${
            open
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }
        `}
        onClick={onClose}
        aria-hidden="true"
      />


      {/* =====================================================
          ADMIN PANEL
      ===================================================== */}

      <section
        className={`
          fixed
          left-1/2
          top-1/2
          z-[10001]
          w-[min(460px,92vw)]
          -translate-x-1/2
          -translate-y-1/2
          rounded-2xl
          border
          border-ink/15
          bg-paper
          p-6
          shadow-2xl
          transition
          duration-200
          ${
            open
              ? 'scale-100 opacity-100'
              : 'pointer-events-none scale-95 opacity-0'
          }
        `}
        aria-hidden={!open}
        aria-label="Admin panel"
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >

          <div>

            <p
              className="
                font-mono
                text-[11px]
                uppercase
                tracking-[0.2em]
                text-ink/50
              "
            >
              Administration
            </p>

            <h2
              className="
                mt-1
                font-display
                text-2xl
                italic
                text-ink
              "
            >
              Admin panel
            </h2>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-ink/15
              text-ink/70
              transition
              hover:bg-ink/5
              hover:text-ink
            "
            aria-label="Close admin panel"
          >

            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >

              <path d="M6 6l12 12" />

              <path d="M18 6L6 18" />

            </svg>

          </button>

        </div>


        {/* ===================================================
            DESCRIPTION
        =================================================== */}

        <p
          className="
            mt-3
            font-body
            text-sm
            leading-6
            text-ink/60
          "
        >
          Add Gmail accounts that are allowed to
          feature journals as public sample works.
        </p>


        {/* ===================================================
            ADD ADMIN FORM
        =================================================== */}

        <form
          onSubmit={handleAddAdmin}
          className="
            mt-5
            flex
            gap-2
          "
        >

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="admin@gmail.com"
            className="
              min-w-0
              flex-1
              rounded-lg
              border
              border-ink/15
              bg-white/50
              px-3
              py-2.5
              font-mono
              text-sm
              text-ink
              outline-none
              transition
              placeholder:text-ink/30
              focus:border-ink/35
              focus:bg-white/70
            "
          />


          <button
            type="submit"
            disabled={
              saving ||
              !email.trim()
            }
            className="
              rounded-lg
              border
              border-ink/20
              px-4
              py-2
              font-mono
              text-xs
              text-ink
              transition
              hover:bg-ink
              hover:text-paper
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >

            {saving
              ? '...'
              : 'Add'}

          </button>

        </form>


        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (

          <p
            className="
              mt-2
              font-mono
              text-[11px]
              text-ink/55
            "
          >
            {message}
          </p>

        )}


        <div
          className="
            my-5
            border-t
            border-ink/10
          "
        />


        {/* ===================================================
            CURRENT ADMINS
        =================================================== */}

        <p
          className="
            font-mono
            text-xs
            uppercase
            tracking-[0.15em]
            text-ink/55
          "
        >
          Current admins
        </p>


        <div
          className="
            mt-3
            max-h-56
            space-y-2
            overflow-y-auto
          "
        >

          {loading ? (

            <p
              className="
                py-3
                font-mono
                text-xs
                text-ink/45
              "
            >
              Loading...
            </p>

          ) : admins.length === 0 ? (

            <p
              className="
                py-3
                font-mono
                text-xs
                text-ink/45
              "
            >
              No admins found.
            </p>

          ) : (

            admins.map((admin) => (

              <div
                key={admin.id}
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  border
                  border-ink/10
                  bg-white/30
                  px-3
                  py-3
                "
              >

                <span
                  className="
                    min-w-0
                    break-all
                    font-mono
                    text-xs
                    text-ink
                  "
                >
                  {admin.email}
                </span>


                <button
                  type="button"
                  onClick={() =>
                    handleRemoveAdmin(admin)
                  }
                  className="
                    shrink-0
                    rounded-lg
                    border
                    border-ink/15
                    px-2.5
                    py-1.5
                    font-mono
                    text-[11px]
                    text-ink/65
                    transition
                    hover:bg-ink
                    hover:text-paper
                  "
                >
                  Remove
                </button>

              </div>

            ))

          )}

        </div>

      </section>

      {adminToRemove && (
        <div
          className="
            fixed
            inset-0
            z-[10002]
            flex
            items-center
            justify-center
            bg-ink/30
            px-4
            backdrop-blur-sm
          "
          onClick={() => setAdminToRemove(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-admin-title"
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-ink/10
              bg-paper
              p-6
              shadow-xl
            "
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="remove-admin-title"
              className="font-display text-xl text-ink"
            >
              Remove admin?
            </h2>

            <p className="mt-2 font-body text-sm leading-6 text-ink-soft">
              Remove {adminToRemove.email} from admins?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminToRemove(null)}
                className="
                  rounded-lg
                  border
                  border-ink/15
                  px-4
                  py-2.5
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-ink-soft
                  transition
                  hover:bg-ink/5
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemoveAdmin}
                className="
                  rounded-lg
                  bg-ink
                  px-4
                  py-2.5
                  font-mono
                  text-xs
                  uppercase
                  tracking-wide
                  text-paper
                  transition
                  hover:opacity-90
                "
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}