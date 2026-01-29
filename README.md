# GuruChat - Next.js Full-Stack Application

This repository contains the Next.js version of the GuruChat application, implemented using the MNT stack (MongoDB, Next.js, TypeScript) and designed for deployment on Vercel.

## Overview

The application allows users to register, log in, and chat with different "Guru" personas powered by Google's Generative AI. It is a full-stack Next.js app with API routes and a MongoDB backend, using TypeScript throughout.

### UI & UX Highlights

*   **Shadcn + Vercel AI Elements UI:** The chat experience uses AI Elements (Conversation, Message, Prompt Input) for native streaming UI and layout consistency.
*   **Viewport-locked layout:** Header and sidebar are fixed within a full-height shell; only the content area scrolls (chat history and guru grid).
*   **Chat history management:** Conversations are listed by Guru and can be deleted from the chat header with a confirmation dialog.
*   **Typing indicator:** A lightweight “typing…” shimmer appears while the assistant is responding.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** (LTS version recommended) - [https://nodejs.org/](https://nodejs.org/)
*   **pnpm:** (Used as the package manager in this project) - `npm install -g pnpm`
*   **Git:** [https://git-scm.com/](https://git-scm.com/)
*   **MongoDB Account:** A MongoDB database instance (e.g., a free tier cluster on MongoDB Atlas - [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)). You will need the connection string.
*   **Google AI API Key:** An API key for Google Generative AI (Gemini) - [https://ai.google.dev/](https://ai.google.dev/)

## Setup Instructions (Windows/macOS)

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd guruchat-nextjs # Or your repository directory name
    ```

2.  **Install Dependencies:**
    Use pnpm to install the project dependencies.
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory of the project. Add the following variables, replacing the placeholder values with your actual credentials:
    ```dotenv
    MONGODB_URI=your_mongodb_connection_string # e.g., mongodb+srv://user:pass@cluster.mongodb.net/guruchat
    JWT_SECRET=your_strong_jwt_secret          # A secure random string for signing tokens
    GOOGLE_AI_API_KEY=your_google_ai_api_key   # Your API key from Google AI Studio
    ```
    *   Make sure your `MONGODB_URI` points to the desired database (e.g., `guruchat`).
    *   **Security Note:** Ensure `JWT_SECRET` is a strong, unique, and secret key. Do not commit the `.env.local` file to version control (it's included in `.gitignore`).

4.  **Seed the Database (if necessary):**
    This step populates the database with the default Guru personas defined in `scripts/seedGurus.ts`. Run this command if your `gurus` collection is empty or if you are setting up the application for the first time.
    ```bash
    pnpm run seed:gurus
    ```
    *   **Note:** If your database already contains Guru data, running this script might not be necessary and could potentially lead to duplicate entries or errors if the script isn't designed to handle existing data. Check the script's logic if unsure.

5.  **Run the Development Server:**
    Start the Next.js development server using Vercel CLI.
    ```bash
    vercel dev
    ```
    This command loads environment variables from `.env.local` and starts the server, typically accessible at `http://localhost:3000`.

## Running API Tests

A basic API test script is included to verify backend functionality.

1.  **Ensure `jq` is installed:**
    *   macOS: `brew install jq`
    *   Windows: Download from [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/) and ensure it's in your PATH, or use WSL/Git Bash.
    *   Linux: `sudo apt-get install jq` or `sudo yum install jq`

2.  **Make the script executable (macOS/Linux):**
    ```bash
    chmod +x scripts/test-api.sh
    ```

3.  **Run the test script:**
    Make sure the development server (`vercel dev`) is running in another terminal.
    ```bash
    ./scripts/test-api.sh
    ```
    The script will test registration, login, fetching gurus, and initiating a chat stream. It checks HTTP status codes and basic response structures.

## Auth Gateway (proxy.ts)

Authentication checks are handled in `proxy.ts` rather than `middleware.ts`. It validates the `jwt_token` cookie (HttpOnly) and enforces access rules for protected routes.

**Behavior:**
*   Authenticated users attempting to access `/login` or `/register` are redirected to the homepage (`/`).
*   Unauthenticated users attempting to access protected routes (including `/`) are redirected to `/login`. Access is allowed only to `/login`, `/register`, and their auth endpoints (`/api/auth/login`, `/api/auth/register`).

## Deployment

This project is configured for easy deployment on Vercel. Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel and ensure the necessary environment variables (`MONGODB_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`) are configured in the Vercel project settings. Vercel will automatically detect the Next.js framework and build/deploy the application.

## API Endpoints (Selected)

*   **POST `/api/chat`** — Streams model responses and persists conversation history.
*   **GET `/api/chats`** — Fetch chat history grouped by Guru or a single conversation by `conversationId`.
*   **DELETE `/api/chats?conversationId=...`** — Permanently deletes a conversation for the authenticated user.
