# Smart Civic Platform Setup Guide

This document outlines the steps required to set up and run the Smart Civic Platform locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Recommended: Latest LTS)
- [Yarn](https://yarnpkg.com/) or NPM (This guide uses Yarn based on project scripts)

## Getting Started

### Cloning the Repository

First, clone the repository from GitHub and navigate into the project directory:

```bash
git clone git@github.com:Jiban-Neupane-21/Smart-Civic-Platform.git
cd Smart-Civic-Platform
```


## Project Structure

- `/` - Root directory (Orchestration)
- `/Smart_Civic_Platform_Backend` - Express API with TypeScript
- `/Smart_Civic_Platform_Frontend` - React 19 SPA powered by Vite

## Installation

You need to install dependencies in three locations:

### 1. Root Dependencies

From the project root, run:

```bash
yarn install:all
```

### 2. Backend Dependencies

Navigate to the backend folder and install:

```bash
cd Smart_Civic_Platform_Backend
yarn install
```

### 3. Frontend Dependencies

Navigate to the frontend folder and install:

```bash
cd ../Smart_Civic_Platform_Frontend
yarn install
```

## Configuration

### Backend Environment

Create a `.env` file in the `Smart_Civic_Platform_Backend` directory and configure your environment variables (e.g., PORT, Database URL).

## Running the Application

### Development Mode

The project is configured to run both the frontend and backend simultaneously from the root directory.

From the **root folder**, run:

```bash
yarn dev
```

This will trigger:

- **Backend:** Running on http://localhost:PORT via `tsx` and `nodemon`.
- **Frontend:** Running on http://localhost:8080 via `Vite`.

## Building for Production

To build both parts for production:

1. **Backend:** `cd Smart_Civic_Platform_Backend && yarn run build`
2. **Frontend:** `cd Smart_Civic_Platform_Frontend && yarn run build`
