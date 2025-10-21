# Learning Path Platform

A web application that allows users to create, manage, and follow learning paths. Creators can add resources like videos, articles, and quizzes, and learners can explore and track their progress. The platform includes role-based authentication for Admin, Creator, and Learner users.

---

## Table of Contents

- [Features](#features)
- [Development Process](#development-process)
- [Challenges and Solutions](#challenges-and-solutions)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [Requirements](#requirements)
- [Technologies Used](#technologies-used)

---

## Features

- User authentication and role-based access control (Admin, Creator, Learner)
- Creators can:
  - Create learning paths
  - Add resources (videos, articles, quizzes)
  - Reorder resources via drag-and-drop
- Learners can:
  - View learning paths
  - Track progress on resources
- Admin can manage users and resources
- Responsive UI with clear and interactive design

---

## Development Process

1. **Frontend:**
   - Built with React.js
   - Pages include Login, Signup, Creator Dashboard, Learner Dashboard, Admin Dashboard
   - Drag-and-drop implemented using `@hello-pangea/dnd` for resource ordering
   - Forms with validation for creating learning paths and resources

2. **Backend:**
   - Built with Node.js and Express.js
   - RESTful API endpoints for authentication, learning path creation, and resource management
   - PostgreSQL for data storage
   - File upload support for images

3. **Integration:**
   - Connected frontend and backend via Axios API calls
   - Role-based navigation to ensure correct dashboard access
   - Proper error handling and feedback messages for users

---

## Challenges and Solutions

| Challenge | Solution |
|-----------|---------|
| Preventing users from signing up as Admin | Removed "Admin" option from role dropdown in signup form and enforced role validation in backend |
| Handling resource reordering in Creator Dashboard | Implemented drag-and-drop with `@hello-pangea/dnd` and updated resource order in state |
| File upload for learning path images | Used `FormData` in frontend and `multer` middleware in backend |
| Scroll issues when dashboard content grows | Added CSS rules to enable scrolling on modal and dashboard sections |
| Providing real-time feedback | Implemented success/error messages for form submissions |

---

## Screenshots


![Login Page](screenshots/landpage.png)
![Creator Dashboard](ScreenShots/Creatorpath.png)
![Learner Dashboard](ScreenShots/Learner.png)
![Admin Dashboard](ScreenShots/Admin.png)
![Home page](ScreenShots/home.png)

---

## Deployment

### Using Docker

1. Ensure **Docker** and **Docker Compose** are installed.
2. Navigate to project root directory:

```bash
docker-compose build
docker-compose up
