# Career Compass — AI Career & Skills Mentor

## About the Project
Career Compass is an AI-powered career and skills mentor designed to help students and beginners identify the skills required for their chosen careers and create a clear, step-by-step learning roadmap.

This project supports **UN Sustainable Development Goal 8: Decent Work and Economic Growth** by helping learners prepare for future career opportunities.

## Features
- Enter a target career and current skills.
- Generate or view a career-focused learning roadmap.
- Identify skills to develop for a chosen career.
- Use predefined demo roadmaps when live AI functionality is unavailable.

## Technology Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- AI integration: OpenAI API
- Version control: Git and GitHub

## Getting Started

### Prerequisites
- Node.js and npm installed
- An OpenAI API key only if you want to use live AI functionality

### Installation
1. Clone or download this repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   `npm install`

4. If live AI functionality is required, configure your API key in a local `.env` file according to the environment variables used by the application.

### Run the Application
Start the server using the command configured in `package.json`, typically:

`npm start`

Then open `http://localhost:3000` in your browser if the server uses port 3000.

Check `package.json` and the server configuration for the exact start command and port.

## Demo Mode
The project includes a demo roadmap endpoint for viewing predefined career roadmap examples when live AI functionality is unavailable.

## Project Purpose
Career Compass aims to make career skill planning easier to understand and more accessible for students and beginners.

## Security
- Never publish API keys or secret credentials.
- Keep `.env` files out of version control.
- Do not commit private credentials to GitHub.

## Project Status
This is a student project prototype. Its features and future business ideas have not been validated with real users.