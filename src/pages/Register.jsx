import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import {
  isValidEmail,
  validatePassword,
  getSafeAuthErrorMessage,
} from '../services/authService';

import Button from '../components/Button';
import Input from '../components/Input';


/* =========================================================
   PASSWORD REQUIREMENTS
========================================================= */

const passwordRequirements = [
  {
    key: 'length',
    label: 'At least 12 characters',
    test: (password) =>
      password.length >= 12,
  },

  {
    key: 'lowercase',
    label: 'One lowercase letter',
    test: (password) =>
      /[a-z]/.test(password),
  },

  {
    key: 'uppercase',
    label: 'One uppercase letter',
    test: (password) =>
      /[A-Z]/.test(password),
  },

  {
    key: 'number',
    label: 'One number',
    test: (password) =>
      /[0-9]/.test(password),
  },

  {
    key: 'symbol',
    label: 'One symbol',
    test: (password) =>
      /[^A-Za-z0-9\s]/.test(password),
  },
];


/* =========================================================
   REGISTER PAGE
========================================================= */

export default function Register() {
  const { signUp } =
    useAuth();

  const navigate =
    useNavigate();


  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [registeredEmail, setRegisteredEmail] =
    useState('');


  /* =======================================================
     CHECK PASSWORD REQUIREMENTS
  ======================================================= */

  const passwordChecks =
    passwordRequirements.map(
      (requirement) => ({
        ...requirement,
        valid:
          requirement.test(password),
      })
    );


  const passwordIsValid =
    passwordChecks.every(
      (requirement) =>
        requirement.valid
    );


  /* =======================================================
     HANDLE REGISTRATION
  ======================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);


    const cleanEmail =
      email.trim().toLowerCase();


    /* -------------------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------------- */

    if (!cleanEmail) {
      setError(
        'Please enter your email address.'
      );

      return;
    }


    if (!isValidEmail(cleanEmail)) {
      setError(
        'Please enter a valid email address.'
      );

      return;
    }


    /* -------------------------------------------------------
       PASSWORD VALIDATION
    ------------------------------------------------------- */

    const passwordValidation =
      validatePassword(password);


    if (!passwordValidation.valid) {
      setError(
        passwordValidation.message
      );

      return;
    }


    if (!passwordIsValid) {
      setError(
        'Please make sure your password meets all of the requirements.'
      );

      return;
    }


    setSubmitting(true);


    try {
      const data =
        await signUp(
          cleanEmail,
          password
        );


      /*
        With Confirm Email enabled in Supabase,
        signUp() returns a user but no session.

        The account is not considered ready for normal
        login until the user confirms ownership of the
        email address.
      */

      if (!data?.session) {
        setRegisteredEmail(
          cleanEmail
        );

        return;
      }


      /*
        A session immediately after registration means
        email confirmation is disabled in the Supabase
        project.

        The app does not silently treat this as the
        normal verified-email flow.
      */

      setError(
        'Your account was created, but email confirmation is not enabled. Please enable Confirm Email in the Supabase Authentication settings before using account registration.'
      );

    } catch (err) {
      /*
        Do not display raw authentication, database,
        or infrastructure errors to the user.

        The service converts them into safe messages.
      */

      setError(
        getSafeAuthErrorMessage(err)
      );

    } finally {
      setSubmitting(false);
    }
  }


  /* =======================================================
     EMAIL CONFIRMATION SCREEN
  ======================================================= */

  if (registeredEmail) {
    return (
      <div
        className="
          mx-auto
          flex
          max-w-sm
          flex-col
          gap-6
          px-6
          py-20
        "
      >

        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            border
            border-ink-soft/20
            bg-paper
          "
        >

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-ink"
          >

            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />

            <path d="m3 7 9 6 9-6" />

          </svg>

        </div>


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
            Almost there
          </p>


          <h1
            className="
              mt-2
              font-display
              text-2xl
            "
          >
            Check your email
          </h1>


          <p
            className="
              mt-3
              font-body
              text-sm
              leading-6
              text-ink-soft
            "
          >
            We sent a confirmation link to:
          </p>


          <p
            className="
              mt-2
              break-all
              font-mono
              text-sm
              text-ink
            "
          >
            {registeredEmail}
          </p>


          <p
            className="
              mt-4
              font-body
              text-sm
              leading-6
              text-ink-soft
            "
          >
            Open the email and click the
            confirmation link to finish creating
            your account.
          </p>

        </div>


        <Button
          type="button"
          onClick={() =>
            navigate('/login')
          }
        >
          Go to login
        </Button>


        <button
          type="button"
          onClick={() => {
            setRegisteredEmail('');
            setEmail('');
            setPassword('');
            setError(null);
          }}
          className="
            font-body
            text-sm
            text-ink-soft
            hover:text-ink
            hover:underline
          "
        >
          Use a different email
        </button>

      </div>
    );
  }


  /* =======================================================
     REGISTRATION FORM
  ======================================================= */

  return (
    <div
      className="
        mx-auto
        flex
        max-w-sm
        flex-col
        gap-6
        px-6
        py-20
      "
    >

      <div>

        <h1
          className="
            font-display
            text-2xl
          "
        >
          Create your journal
        </h1>


        <p
          className="
            mt-2
            font-body
            text-sm
            text-ink-soft
          "
        >
          Create an account to start
          your own journal.
        </p>

      </div>


      <form
        onSubmit={handleSubmit}
        className="
          flex
          flex-col
          gap-4
        "
      >

        {/* =================================================
            EMAIL
        ================================================= */}

        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(
              event.target.value
            );

            setError(null);
          }}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="you@example.com"
          required
        />


        {/* =================================================
            PASSWORD
        ================================================= */}

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(
              event.target.value
            );

            setError(null);
          }}
          autoComplete="new-password"
          placeholder="Create a strong password"
          minLength={12}
          required
        />


        {/* =================================================
            PASSWORD REQUIREMENTS
        ================================================= */}

        <div
          className="
            rounded-md
            border
            border-ink-soft/15
            bg-paper/60
            px-3
            py-3
          "
        >

          <p
            className="
              mb-2
              font-mono
              text-[11px]
              uppercase
              tracking-wide
              text-ink-soft
            "
          >
            Password must have
          </p>


          <div
            className="
              flex
              flex-col
              gap-1.5
            "
          >

            {passwordChecks.map(
              (requirement) => (
                <div
                  key={
                    requirement.key
                  }
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                  "
                >

                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      text-[10px]
                      ${
                        requirement.valid
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink-soft/30 text-ink-soft/40'
                      }
                    `}
                  >

                    {requirement.valid
                      ? '✓'
                      : ''}

                  </span>


                  <span
                    className={
                      requirement.valid
                        ? 'text-ink'
                        : 'text-ink-soft'
                    }
                  >
                    {requirement.label}
                  </span>

                </div>
              )
            )}

          </div>

        </div>


        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (
          <div
            className="
              rounded-md
              border
              border-red-900/15
              bg-red-50/50
              px-3
              py-2.5
            "
          >

            <p
              className="
                text-sm
                leading-5
                text-red-900/75
              "
            >
              {error}
            </p>

          </div>
        )}


        {/* =================================================
            REGISTER BUTTON
        ================================================= */}

        <Button
          type="submit"
          disabled={
            submitting ||
            !passwordIsValid
          }
        >
          {submitting
            ? 'Creating account…'
            : 'Register'}
        </Button>

      </form>


      {/* =================================================
          LOGIN LINK
      ================================================= */}

      <p
        className="
          font-body
          text-sm
          text-ink-soft
        "
      >
        Already have an account?{' '}

        <Link
          to="/login"
          className="
            text-margin
            hover:underline
          "
        >
          Log in
        </Link>

      </p>

    </div>
  );
}