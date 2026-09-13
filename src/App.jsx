import { Route, Routes } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Poem from './pages/Poem';
import PublicShareLanding from './pages/PublicShareLanding';
import Explore from './pages/Explore';
import CollaborativeShareLanding from './pages/CollaborativeShareLanding';
import BookcasePage from './pages/BookcasePage';
import Chat from './pages/Chat';
import Collaboration from './pages/Collaboration';
import NotFound from './pages/NotFound';


export default function App() {

  return (

    <div
      className="
        min-h-screen
      "
    >

      <Navbar />


      <main>

        <LayoutGroup>

          <Routes>

            <Route
              path="/"
              element={
                <Home />
              }
            />


            <Route
              path="/explore"
              element={
                <Explore />
              }
            />


            <Route
              path="/login"
              element={
                <Login />
              }
            />


            <Route
              path="/register"
              element={
                <Register />
              }
            />


            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                CHAT
            ================================================= */}

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                COLLABORATION
            ================================================= */}

            <Route
              path="/collaboration"
              element={
                <ProtectedRoute>
                  <Collaboration />
                </ProtectedRoute>
              }
            />


            <Route
              path="/collaboration/:spaceId"
              element={
                <ProtectedRoute>
                  <Collaboration />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                BOOKCASE
            ================================================= */}

            <Route
              path="/bookcase/:bookcaseId"
              element={
                <ProtectedRoute>
                  <BookcasePage />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                JOURNAL
            ================================================= */}

            <Route
              path="/journal/:journalId"
              element={
                <ProtectedRoute>
                  <Journal />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                POEM
            ================================================= */}

            <Route
              path="/journal/:journalId/poem/:poemId"
              element={
                <ProtectedRoute>
                  <Poem />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                COLLABORATIVE EDITOR LINK
            ================================================= */}

            <Route
              path="/collab/:editorToken"
              element={
                <CollaborativeShareLanding />
              }
            />


            {/* =================================================
                PUBLIC SHARE LANDING
            ================================================= */}

            <Route
              path="/shared/:shareToken"
              element={
                <PublicShareLanding />
              }
            />


            {/* =================================================
                PUBLIC VIEW-ONLY JOURNAL
            ================================================= */}

            <Route
              path="/shared/:shareToken/book"
              element={
                <Journal />
              }
            />


            {/* =================================================
                404
            ================================================= */}

            <Route
              path="*"
              element={
                <NotFound />
              }
            />

          </Routes>

        </LayoutGroup>

      </main>

    </div>

  );

}