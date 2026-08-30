# LMS (Learning Management System)

A full-stack, enterprise-grade Learning Management System built with **Next.js** (Frontend) and **Strapi v5** (Backend / Headless CMS).

This project implements strict 4-role access control, course & curriculum management with rich text and video support, auto-graded MCQ quizzes, accurate per-student progress tracking, an administrative control center with real-time role assignment, an editorial blog publishing engine, and role-tailored dashboards.

---

## 👥 Role-Based Access Control Matrix

The system strictly enforces permissions on the backend API controllers and the frontend UI / route guards:

| Feature / Action | Admin | Content Manager | Instructor | Student |
|---|:---:|:---:|:---:|:---:|
| **Manage Users & Assign Roles** | ✅ | ❌ | ❌ | ❌ |
| **Create / Edit / Delete Any Course** | ✅ | ✅ | Own Courses Only | ❌ |
| **Add / Edit / Delete Lessons / Lectures** | ✅ | ✅ | Own Courses Only | ❌ |
| **Create / Edit / Delete Quizzes** | ✅ | ✅ | Own Courses Only | ❌ |
| **View Student Progress** | ✅ | ✅ | Own Courses Only | Own Progress Only |
| **Write / Publish / Manage Blog Posts** | ✅ | ✅ | ❌ | ❌ |
| **Role-Tailored Dashboard** | Platform Oversight | Content Management Hub | Instructor Portal | Enrolled Courses & Grades |
| **Enroll in Courses** | ❌ | ❌ | ❌ | ✅ |
| **Take Quizzes & Auto-Grading** | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Pre-Configured Demo Accounts

For testing and video walkthrough evaluation, use any of the pre-configured credentials below (all accounts use the password: `password123`):

| Role | Email / Identifier | Password | Key Permissions & Flows to Test |
|---|---|---|---|
| **👑 Admin** | `lmsadmin@test.com` | `password123` | Platform Analytics, User Role Management (`/admin`), Full control over courses and blogs |
| **✍️ Content Manager** | `content@test.com` | `password123` | Platform-wide course & lesson editor, Blog draft & publish workflows (`/manage/blogs`), Content Overview Dashboard |
| **👨‍🏫 Instructor** | `instructor@test.com` | `password123` | Create own courses, add video lessons & MCQ quizzes, view enrolled students' completion rate on Instructor Dashboard |
| **🎓 Student** | `student@test.com` | `password123` | Browse catalog, enroll in courses, sequential video lessons, mark progress, take auto-graded quizzes |

> 💡 *Tip: On the [Login Page](/login), 1-click quick login buttons are available to easily test each role.*

---

## ✨ Features Implemented

### 1. Role-Tailored Dashboards (`/dashboard`)
- **Student Dashboard**: Displays enrolled courses with live completion percentage bars and past MCQ quiz results history.
- **Content Manager Dashboard**: Shows platform-wide metrics (total courses, lessons, quizzes, draft/published blogs), direct course curriculum management shortcuts, and blog editorial tables.
- **Instructor Dashboard**: Shows authored courses, total lectures taught, enrolled students with real-time completion rates, and quick shortcuts to create courses & lectures.
- **Admin Dashboard**: Summary with direct access to the dedicated `/admin` control center.

### 2. Course & Curriculum Management
- **Content Manager & Admin**: Full platform-wide CRUD on all courses, lessons, and quizzes.
- **Instructor**: Dedicated ownership enforcement—instructors can create courses, add video/text lectures, attach MCQ quizzes, and edit/delete their own courses only.

### 3. Student Learning & Persistent Progress Tracking
- **1-Click Free Enrollment**: Students can enroll in any available course.
- **Sequential Lesson Viewing**: Navigate smoothly between lessons with `← Previous` and `Next →` buttons.
- **Persistent Progress Tracking**: Visual progress bar (`X of Y lessons completed (Z%)`) that persists accurately across page refreshes and browser sessions.

### 4. Auto-Graded MCQ Quizzes
- **Quiz Creator**: Instructors and Content Managers can attach MCQ assessments to courses with customizable options and designated correct answers.
- **Instant Auto-Grading**: When a student submits answers, the backend calculates the score against the database, records the `QuizResult`, and returns the score, percentage, pass/fail status, and per-question breakdown immediately.
- **Student Gradebook**: Past quiz submissions and scores are viewable on the course page and Student Dashboard.

### 5. Dedicated Admin Panel (`/admin`)
- **Real-Time Platform Analytics**: Total users by role breakdown, total courses, lessons, enrollments, quizzes, and blog posts.
- **User Role Manager**: Interactive user directory with real-time role dropdowns to promote, demote, or change roles instantly.

### 6. Editorial Blog & Publishing Engine (`/blog`, `/manage/blogs`)
- **Draft vs. Published Workflow**: Content Managers and Admins can write articles and toggle draft/published status.
- **Public & Student Reading**: Only published articles are visible to students and guests.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 16 (App Router), React 18, Tailwind CSS, TypeScript.
- **Backend / CMS**: Strapi v5.52.2 (Headless CMS), Better-SQLite3, Node.js 20+.
- **Data Flow**:
  - Frontend Client Components (`fetch` + Bearer JWT Authentication) $\rightarrow$ Next.js App Router $\rightarrow$ Strapi REST API Controllers $\rightarrow$ Strapi Entity/Document Service $\rightarrow$ SQLite Database.

---

## 💻 How to Run Locally

### Prerequisites
- **Node.js** $\ge$ 20.0.0
- **npm** $\ge$ 10.0.0

---

### Step 1: Start the Strapi Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Start the Strapi development server
npm run develop
```

The Strapi backend will start at `http://localhost:1337`.
Admin panel is accessible at `http://localhost:1337/admin`.

---

### Step 2: Start the Next.js Frontend

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start the Next.js development server
npm run dev
```

The Next.js frontend will start at `http://localhost:3000`.
