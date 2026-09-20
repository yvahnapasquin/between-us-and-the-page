import { supabase } from './supabase';


/* =========================================================
   EMAIL VALIDATION
========================================================= */

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}


export function isValidEmail(email) {
  const normalizedEmail =
    normalizeEmail(email);

  /*
    RFC-compliant email validation is much more complicated
    than a frontend regex.

    This check intentionally verifies the common requirements:
    - exactly one @
    - no whitespace
    - local part exists
    - domain exists
    - domain contains a dot
    - practical maximum length
  */

  if (
    !normalizedEmail ||
    normalizedEmail.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedEmail
  );
}


/* =========================================================
   PASSWORD VALIDATION
========================================================= */

export function validatePassword(password) {
  const value =
    String(password ?? '');

  if (value.length < 12) {
    return {
      valid: false,
      message:
        'Password must be at least 12 characters long.',
    };
  }

  if (!/[a-z]/.test(value)) {
    return {
      valid: false,
      message:
        'Password must contain at least one lowercase letter.',
    };
  }

  if (!/[A-Z]/.test(value)) {
    return {
      valid: false,
      message:
        'Password must contain at least one uppercase letter.',
    };
  }

  if (!/[0-9]/.test(value)) {
    return {
      valid: false,
      message:
        'Password must contain at least one number.',
    };
  }

  if (!/[^A-Za-z0-9\s]/.test(value)) {
    return {
      valid: false,
      message:
        'Password must contain at least one symbol.',
    };
  }

  return {
    valid: true,
    message: null,
  };
}


/* =========================================================
   GET THE URL WHERE USERS SHOULD GO AFTER
   CONFIRMING THEIR EMAIL
========================================================= */

function getEmailRedirectUrl() {
  /*
    The project uses HashRouter.

    Development:
    http://localhost:5173/#/dashboard

    Production:
    https://your-site.com/between-us-and-the-page/#/dashboard

    IMPORTANT:
    This URL must also be included in Supabase
    Authentication > URL Configuration > Redirect URLs.
  */

  return `${window.location.origin}${import.meta.env.BASE_URL}#/dashboard`;
}


/* =========================================================
   SIGN UP
========================================================= */

export async function signUp(email, password) {
  const cleanEmail =
    normalizeEmail(email);

  if (!isValidEmail(cleanEmail)) {
    throw new Error(
      'Please enter a valid email address.'
    );
  }

  const passwordValidation =
    validatePassword(password);

  if (!passwordValidation.valid) {
    throw new Error(
      passwordValidation.message
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: cleanEmail,

    password,

    options: {
      /*
        Supabase sends the email confirmation message.

        The user must verify ownership of the email address
        before they can complete the normal login flow when
        Confirm Email is enabled in Supabase.
      */

      emailRedirectTo:
        getEmailRedirectUrl(),
    },
  });


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   SIGN IN
========================================================= */

export async function signIn(
  email,
  password
) {
  const cleanEmail =
    normalizeEmail(email);

  if (!isValidEmail(cleanEmail)) {
    throw new Error(
      'Please enter a valid email address.'
    );
  }

  if (!password) {
    throw new Error(
      'Please enter your password.'
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   SIGN OUT
========================================================= */

export async function signOut() {
  const {
    error,
  } =
    await supabase.auth.signOut();


  if (error) {
    throw error;
  }
}


/* =========================================================
   RESET PASSWORD
========================================================= */

export async function resetPassword(email) {
  const cleanEmail =
    normalizeEmail(email);

  if (!isValidEmail(cleanEmail)) {
    throw new Error(
      'Please enter a valid email address.'
    );
  }

  const {
    error,
  } =
    await supabase.auth.resetPasswordForEmail(
      cleanEmail
    );


  if (error) {
    throw error;
  }
}


/* =========================================================
   GET CURRENT SESSION
========================================================= */

export async function getSession() {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession();


  if (error) {
    throw error;
  }


  return data.session;
}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

export function onAuthStateChange(callback) {
  const {
    data: listener,
  } =
    supabase.auth.onAuthStateChange(
      (_event, session) => {
        callback(session);
      }
    );


  return () =>
    listener.subscription.unsubscribe();
}