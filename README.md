# GuruChat - MERN Stack Migration

This repository contains the migrated version of the GuruChat application, implemented using the MERN stack (MongoDB, Express.js - via Next.js API Routes, React - via Next.js, Node.js) and designed for deployment on Vercel.

## Overview

The application allows users to register, log in, and chat with different "Guru" personas powered by Google's Generative AI. The backend uses Next.js API routes and leverages MongoDB for data storage.

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
    cd guruchat-mern # Or your repository directory name
    ```

2.  **Install Dependencies:**
    Use pnpm to install the project dependencies.
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory of the project. Add the following variables, replacing the placeholder values with your actual credentials:
    ```dotenv
    MONGODB_URI=your_mongodb_connection_string # e.g., mongodb+srv://user:pass@cluster.mongodb.net/dbname
    JWT_SECRET=your_strong_jwt_secret          # A secure random string for signing tokens
    GOOGLE_AI_API_KEY=your_google_ai_api_key   # Your API key from Google AI Studio
    ```
    *   **Security Note:** Ensure `JWT_SECRET` is a strong, unique, and secret key. Do not commit the `.env.local` file to version control (it's included in `.gitignore`).

4.  **Seed the Database:**
    Run the seed script to populate the database with sample Guru data.
    ```bash
    pnpm run seed:gurus
    ```
    You should see output indicating successful connection and insertion of gurus.

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

## Deployment

This project is configured for easy deployment on Vercel. Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel and ensure the necessary environment variables (`MONGODB_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`) are configured in the Vercel project settings. Vercel will automatically detect the Next.js framework and build/deploy the application. 