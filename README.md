# Smart School Management System

This repository contains the source code for the Smart School Management System.

## Project Structure

- `frontend/`: Contains the frontend applications.
  - `admin-web/`: The web dashboard for administrative roles.
  - `mobile-app/`: The mobile application for parents, teachers, and students.
- `smart_school_backend/`: Contains the backend application.
- `database/`: Contains database schema and seed data.

## Local Development Setup

### Backend

1.  Navigate to the `smart_school_backend` directory:
    ```bash
    cd smart_school_backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv .venv
    ```
3.  Activate the virtual environment:
    -   On Windows:
        ```bash
        .venv\Scripts\activate
        ```
    -   On macOS/Linux:
        ```bash
        source .venv/bin/activate
        ```
4.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  The project uses a `.env` file for configuration. A `.env.example` is provided. Copy it to `.env`:
    ```bash
    copy .env.example .env
    ```
    *Note: The `.env` file is pre-configured with the initial super admin credentials.*

6.  Apply the database migrations:
    ```bash
    alembic upgrade head
    ```
7.  Run the backend server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will be available at `http://127.0.0.1:8000`. You can access the API documentation at `http://127.0.0.1:8000/docs`.

### Frontend

1.  Navigate to the `frontend/admin-web` directory:
    ```bash
    cd frontend/admin-web
    ```
2.  Install the required dependencies:
    ```bash
    npm install
    ```
3.  Run the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.
