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
   SAFE REGISTRATION ERROR MESSAGE
========================================================= */

export function getSafeAuthErrorMessage(error) {
  const message =
    String(
      error?.message ?? ''
    ).toLowerCase();


  /* -------------------------------------------------------
     INVALID EMAIL
  ------------------------------------------------------- */

  if (
    message.includes(
      'invalid email'
    ) ||
    message.includes(
      'email address'
    )
  ) {
    return 'Please enter a valid email address.';
  }


  /* -------------------------------------------------------
     PASSWORD
  ------------------------------------------------------- */

  if (
    message.includes(
      'password'
    )
  ) {
    return 'Your password does not meet the required security rules.';
  }


  /* -------------------------------------------------------
     RATE LIMIT
  ------------------------------------------------------- */

  if (
    message.includes(
      'rate limit'
    ) ||
    message.includes(
      'too many requests'
    ) ||
    message.includes(
      '429'
    )
  ) {
    return 'Too many registration attempts. Please wait a little while and try again.';
  }


  /* -------------------------------------------------------
     EMAIL DELIVERY
  ------------------------------------------------------- */

  if (
    message.includes(
      'email not authorized'
    ) ||
    message.includes(
      'email provider'
    ) ||
    message.includes(
      'smtp'
    ) ||
    message.includes(
      'sending email'
    )
  ) {
    return 'We could not send the confirmation email right now. Please try again later.';
  }


  /* -------------------------------------------------------
     CAPTCHA / BOT PROTECTION
  ------------------------------------------------------- */

  if (
    message.includes(
      'captcha'
    ) ||
    message.includes(
      'bot'
    )
  ) {
    return 'Account verification could not be completed. Please try again.';
  }


  /* -------------------------------------------------------
     GENERIC AUTHENTICATION ERROR
     
     Do not expose raw Supabase, database, infrastructure,
     or authentication errors to the user.
  ------------------------------------------------------- */

  return 'We could not create your account right now. Please check your information and try again.';
}


/* =========================================================
   SAFE LOGIN ERROR MESSAGE
========================================================= */

export function getSafeLoginErrorMessage(error) {
  const message =
    String(
      error?.message ?? ''
    ).toLowerCase();


  /* -------------------------------------------------------
     EMAIL NOT CONFIRMED
  ------------------------------------------------------- */

  if (
    message.includes(
      'email not confirmed'
    ) ||
    message.includes(
      'email_not_confirmed'
    )
  ) {
    return 'Please confirm your email address before logging in.';
  }


  /* -------------------------------------------------------
     RATE LIMIT
  ------------------------------------------------------- */

  if (
    message.includes(
      'rate limit'
    ) ||
    message.includes(
      'too many requests'
    ) ||
    message.includes(
      '429'
    )
  ) {
    return 'Too many login attempts. Please wait a little while and try again.';
  }


  /* -------------------------------------------------------
     CAPTCHA / BOT PROTECTION
  ------------------------------------------------------- */

  if (
    message.includes(
      'captcha'
    ) ||
    message.includes(
      'bot'
    )
  ) {
    return 'Login verification could not be completed. Please try again.';
  }


  /* -------------------------------------------------------
     NETWORK / CONNECTION
  ------------------------------------------------------- */

  if (
    message.includes(
      'network'
    ) ||
    message.includes(
      'failed to fetch'
    ) ||
    message.includes(
      'fetch failed'
    )
  ) {
    return 'We could not connect to the login service. Please check your connection and try again.';
  }


  /* -------------------------------------------------------
     INVALID CREDENTIALS / GENERIC AUTH ERROR
     
     Keep this message intentionally generic.
     
     Do not tell the user whether the email exists.
     Do not expose raw Supabase authentication errors.
  ------------------------------------------------------- */

  return 'That email and password combination did not work.';
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

        The redirect URL must also be configured in:
        Authentication > URL Configuration > Redirect URLs.
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