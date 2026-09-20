import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import {
  isValidEmail,
  getSafeLoginErrorMessage,
} from '../services/authService';

import Button from '../components/Button';
import Input from '../components/Input';


export default function Login() {
  const { signIn } = useAuth();

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


  async function handleSubmit(e) {
    e.preventDefault();

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

    if (!password) {
      setError(
        'Please enter your password.'
      );

      return;
    }


    /* -------------------------------------------------------
       PREVENT DUPLICATE SUBMISSIONS
    ------------------------------------------------------- */

    if (submitting) {
      return;
    }


    setSubmitting(true);


    try {
      await signIn(
        cleanEmail,
        password
      );


      /*
        Preserve the existing collaboration flow.

        If a user arrived through an editor share link
        before logging in, return them to that collaboration
        page after successful authentication.
      */

      const pendingEditorToken =
        localStorage.getItem(
          'pendingEditorShareToken'
        );


      if (pendingEditorToken) {
        navigate(
          `/collab/${pendingEditorToken}`
        );
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      /*
        Never expose the raw Supabase authentication error.
      */

      setError(
        getSafeLoginErrorMessage(err)
      );

    } finally {
      setSubmitting(false);
    }
  }


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

      <h1
        className="
          font-display
          text-2xl
        "
      >
        Log in
      </h1>


      <form
        onSubmit={handleSubmit}
        className="
          flex
          flex-col
          gap-4
        "
      >

        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(
              e.target.value
            );

            setError(null);
          }}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
        />


        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(
              e.target.value
            );

            setError(null);
          }}
          autoComplete="current-password"
          required
        />


        {error && (
          <p
            className="
              text-sm
              text-margin
            "
          >
            {error}
          </p>
        )}


        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? 'Logging in…'
            : 'Log in'}
        </Button>

      </form>


      <p
        className="
          font-body
          text-sm
          text-ink-soft
        "
      >
        New here?{' '}

        <Link
          to="/register"
          className="
            text-margin
            hover:underline
          "
        >
          Create an account
        </Link>
      </p>

    </div>
  );
}