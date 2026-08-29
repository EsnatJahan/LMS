"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../components/Toast";

export default function ManageCoursesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'lessons', 'quiz', 'students'

  // Modal / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Course Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Lesson Form States
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonOrder, setLessonOrder] = useState(1);
  const [savingLesson, setSavingLesson] = useState(false);

  // Quiz Form States
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Enrolled Students with Progress
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Instructor assignment states for Admin / Content Manager
  const [instructorsList, setInstructorsList] = useState([]);
  const [selectedInstructorForNewCourse, setSelectedInstructorForNewCourse] = useState("");
  const [updatingInstructor, setUpdatingInstructor] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const storedUser = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");

        if (!storedUser || !jwt) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(storedUser);
        setCurrentUser(user);

        const roleName = user.role?.name;
        if (roleName === "Student") {
          setError("Students do not have permission to access the Course Management Hub.");
          setLoading(false);
          return;
        }

        if (roleName === "Admin" || roleName === "Content Manager") {
          try {
            const usersRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/users`, {
              headers: { Authorization: `Bearer ${jwt}` },
            });
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setInstructorsList(
                (usersData.data || []).filter(
                  (u) => u.role?.name === "Instructor" || u.role?.name === "Admin" || u.role?.name === "Content Manager"
                )
              );
            }
          } catch (e) {}
        }

        await fetchCourses(jwt, user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function fetchCourses(jwt, user) {
    const token = jwt || localStorage.getItem("jwt");
    const roleName = user?.role?.name || currentUser?.role?.name;

    const [coursesRes, quizzesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const coursesData = await coursesRes.json();
    const quizzesData = await quizzesRes.json();

    if (coursesRes.ok) {
      let courseList = coursesData.data || [];
      const allQuizzesList = quizzesData?.data || [];

      // Attach complete quizzes with questions to each course
      courseList = courseList.map((course) => {
        const matchingQuizzes = allQuizzesList.filter((q) => {
          const c = q.course;
          return (
            c &&
            (c.id === course.id ||
              c.documentId === course.documentId ||
              c.title === course.title)
          );
        });
        return {
          ...course,
          quizzes: matchingQuizzes,
        };
      });

      // If instructor, filter STRICTLY to own authored courses only
      if (roleName === "Instructor") {
        const uId = user?.id || currentUser?.id;
        const uDocId = user?.documentId || currentUser?.documentId;
        const uName = user?.username || currentUser?.username;

        courseList = courseList.filter(
          (c) =>
            c.instructor &&
            (c.instructor?.id === uId ||
              c.instructor?.documentId === uDocId ||
              c.instructor?.username === uName)
        );
      }

      setCourses(courseList);
      if (selectedCourse) {
        const updated = courseList.find(
          (c) => c.id === selectedCourse.id || c.documentId === selectedCourse.documentId
        );
        if (updated) setSelectedCourse(updated);
      }
    }
  }

  // Create Course
  async function handleCreateCourse(e) {
    e.preventDefault();
    setCreating(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: newTitle,
            description: newDescription,
            instructor: selectedInstructorForNewCourse || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create course");

      alert("Course created successfully!");
      toast.success("Course created successfully!");
      setNewTitle("");
      setNewDescription("");
      setSelectedInstructorForNewCourse("");
      setShowCreateModal(false);
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Update Course Instructor
  async function handleUpdateCourseInstructor(courseIdentifier, newInstructorId) {
    setUpdatingInstructor(true);
    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${courseIdentifier}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            instructor: newInstructorId || null,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to reassign instructor");
      alert("Course instructor updated successfully!");
      toast.success("Course instructor updated successfully!");
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setUpdatingInstructor(false);
    }
  }

  // Edit Course Handlers
  function openEditCourseModal(course) {
    if (roleName === "Instructor") {
      const uId = currentUser?.id;
      const uDocId = currentUser?.documentId;
      const uName = currentUser?.username;
      const isOwner =
        course.instructor &&
        (course.instructor.id === uId ||
          course.instructor.documentId === uDocId ||
          course.instructor.username === uName);
      if (!isOwner) {
        alert("You can only edit your own courses.");
        toast.error("You can only edit your own courses.");
        return;
      }
    }
    setEditTitle(course.title || "");
    setEditDescription(course.description || "");
    setShowEditModal(true);
  }

  async function handleSaveEditCourse(e) {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingEdit(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${selectedCourse.documentId || selectedCourse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: editTitle,
            description: editDescription,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to update course details");

      alert("Course details updated successfully!");
      toast.success("Course details updated successfully!");
      setShowEditModal(false);
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete Course
  async function handleDeleteCourse(courseIdentifier) {
    const targetCourse = courses.find((c) => c.id === courseIdentifier || c.documentId === courseIdentifier);
    if (roleName === "Instructor" && targetCourse) {
      const uId = currentUser?.id;
      const uDocId = currentUser?.documentId;
      const uName = currentUser?.username;
      const isOwner =
        targetCourse.instructor &&
        (targetCourse.instructor.id === uId ||
          targetCourse.instructor.documentId === uDocId ||
          targetCourse.instructor.username === uName);
      if (!isOwner) {
        alert("You can only delete your own courses.");
        toast.error("You can only delete your own courses.");
        return;
      }
    }

    if (!confirm("Are you sure you want to delete this course and all its lessons/quizzes? This action cannot be undone.")) return;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${courseIdentifier}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to delete course");
      }

      alert("Course deleted successfully!");
      toast.success("Course deleted successfully!");
      if (selectedCourse?.id === courseIdentifier || selectedCourse?.documentId === courseIdentifier) {
        setSelectedCourse(null);
      }
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    }
  }

  // Add Lesson
  async function handleAddLesson(e) {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingLesson(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: lessonTitle,
            content: lessonContent,
            videoUrl: lessonVideoUrl,
            order: Number(lessonOrder),
            course: selectedCourse.id,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to add lesson");

      alert("Lesson added successfully!");
      toast.success("Lesson added successfully!");
      setLessonTitle("");
      setLessonContent("");
      setLessonVideoUrl("");
      setLessonOrder((prev) => Number(prev) + 1);
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setSavingLesson(false);
    }
  }

  // Delete Lesson
  async function handleDeleteLesson(lessonId) {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) throw new Error("Failed to delete lesson");
      alert("Lesson deleted!");
      toast.success("Lesson deleted successfully!");
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    }
  }

  // Create Quiz
  async function handleCreateQuiz(e) {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingQuiz(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: quizTitle,
            description: quizDescription,
            course: selectedCourse.id,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create quiz");

      alert("Quiz created! Now you can add MCQ questions below.");
      toast.success("Quiz created! Now you can add MCQ questions below.");
      setQuizTitle("");
      setQuizDescription("");
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setSavingQuiz(false);
    }
  }

  // Add Question to Quiz
  async function handleAddQuestion(e, quiz) {
    e.preventDefault();
    setSavingQuestion(true);

    const options = [option1, option2, option3, option4].filter(Boolean);
    if (options.length < 2) {
      alert("Please provide at least 2 options.");
      toast.error("Please provide at least 2 options.");
      setSavingQuestion(false);
      return;
    }

    if (!correctAnswer) {
      alert("Please designate the correct answer.");
      toast.error("Please designate the correct answer.");
      setSavingQuestion(false);
      return;
    }

    const quizIdentifier = quiz?.documentId || quiz?.id || quiz;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: questionTitle,
            options,
            correctAnswer,
            quiz: quizIdentifier,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to add question");

      alert("Question added to quiz successfully!");
      toast.success("Question added to quiz successfully!");
      setQuestionTitle("");
      setOption1("");
      setOption2("");
      setOption3("");
      setOption4("");
      setCorrectAnswer("");
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setSavingQuestion(false);
    }
  }

  // Delete Question from Quiz
  async function handleDeleteQuestion(questionId) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/questions/${questionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to delete question");
      }

      alert("Question deleted successfully!");
      toast.success("Question deleted successfully!");
      await fetchCourses();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    }
  }

  // Load Enrolled Students with Progress
  async function loadCourseStudents(course) {
    setLoadingStudents(true);
    try {
      const jwt = localStorage.getItem("jwt");
      
      // Fetch enrollments with populate=*
      const enrollRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?populate=*`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const enrollData = await enrollRes.json();
      const allEnrollments = enrollData?.data || [];
      const enrollments = allEnrollments.filter((e) => {
        const c = e.course;
        return c && (c.id === course.id || c.documentId === course.documentId || c.title === course.title);
      });

      // Fetch progresses with populate=*
      const progRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?populate=*`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const progData = await progRes.json();
      const allProgresses = progData?.data || [];
      const progresses = allProgresses.filter((p) => {
        const c = p.course;
        return c && (c.id === course.id || c.documentId === course.documentId);
      });

      const totalLessonsCount = course.lessons?.length || 0;

      const studentsWithProgress = enrollments.map((enr) => {
        const studentUser = enr.users_permissions_user;
        const studentProgresses = progresses.filter(
          (p) => p.users_permissions_user?.id === studentUser?.id && p.completed
        );
        const completedCount = studentProgresses.length;
        const percent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

        return {
          id: studentUser?.id,
          username: studentUser?.username || "Unknown Student",
          email: studentUser?.email,
          completedLessons: completedCount,
          totalLessons: totalLessonsCount,
          percentage: percent,
        };
      });

      setEnrolledStudents(studentsWithProgress);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-lg font-semibold text-gray-600 animate-pulse">
          Loading Course Management Hub...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md rounded-xl bg-white p-8 shadow text-center border border-red-100">
          <div className="text-4xl mb-3">⛔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const roleName = currentUser?.role?.name;
  const isInstructor = roleName === "Instructor";
  const isContentManager = roleName === "Content Manager";
  const isAdmin = roleName === "Admin";

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase px-2.5 py-1 rounded text-white ${
                isAdmin ? "bg-purple-700" : isContentManager ? "bg-blue-600" : "bg-amber-600"
              }`}>
                {roleName} Portal
              </span>
              <span className="text-xs text-gray-500 font-mono">Course Control Center</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Course & Curriculum Management
            </h1>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
          >
            ➕ Create New Course
          </button>
        </div>

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Course</h2>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Course Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Master Fullstack Web Development"
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Comprehensive overview of this course..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>
                {(isAdmin || isContentManager) && instructorsList.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Instructor</label>
                    <select
                      value={selectedInstructorForNewCourse}
                      onChange={(e) => setSelectedInstructorForNewCourse(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white focus:border-black focus:outline-none"
                    >
                      <option value="">-- Assign to Me or Choose Instructor --</option>
                      {instructorsList.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.username} ({inst.role?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-black px-5 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {creating ? "Creating..." : "Save Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Course Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Course Details</h2>
              <form onSubmit={handleSaveEditCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Course Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="rounded-lg bg-black px-5 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Courses List Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {isInstructor ? "My Courses" : "All Platform Courses"} ({courses.length})
            </h2>

            {courses.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-500 border border-gray-100">
                No courses available yet. Click "Create New Course" above to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  const lessonsCount = course.lessons?.length || 0;
                  const quizCount = course.quizzes?.length || 0;
                  const enrolledCount = course.enrollments?.length || 0;

                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setActiveTab("overview");
                        loadCourseStudents(course);
                      }}
                      className={`p-5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-white border-black shadow-md ring-1 ring-black"
                          : "bg-white border-gray-200 hover:border-gray-400 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 text-base leading-snug">
                          {course.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.documentId || course.id);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"
                          title="Delete this course"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
                        {course.description}
                      </p>

                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-xs font-semibold text-gray-600">
                        <span>📖 {lessonsCount} Lessons</span>
                        <span>❓ {quizCount} Quizzes</span>
                        <span>👥 {enrolledCount} Students</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Course Workspace */}
          <div className="lg:col-span-2">
            {!selectedCourse ? (
              <div className="rounded-xl bg-white p-12 text-center text-gray-400 border border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-5xl mb-3">👈</div>
                <div className="font-semibold text-gray-700 text-base">Select a course to manage</div>
                <div className="text-xs text-gray-400 mt-1 max-w-sm">
                  View and manage lessons, multiple-choice quizzes, and track enrolled students' progress.
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                
                {/* Header & Tabs */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{selectedCourse.title}</h2>
                      <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-gray-600">
                        <span className="font-semibold">Instructor:</span>
                        {(isAdmin || isContentManager) && instructorsList.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedCourse.instructor?.id || ""}
                              disabled={updatingInstructor}
                              onChange={(e) => handleUpdateCourseInstructor(selectedCourse.documentId || selectedCourse.id, e.target.value)}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs bg-white focus:border-black focus:outline-none font-medium cursor-pointer"
                            >
                              <option value="">-- Unassigned --</option>
                              {instructorsList.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.username} ({inst.role?.name})
                                </option>
                              ))}
                            </select>
                            {updatingInstructor && (
                              <span className="text-[11px] text-blue-600 animate-pulse font-semibold">
                                Saving...
                              </span>
                            )}
                          </div>
                        ) : (
                          <strong className="text-gray-900">{selectedCourse.instructor?.username || "Not assigned"}</strong>
                        )}
                        <span>•</span>
                        <Link href={`/courses/${selectedCourse.documentId || selectedCourse.id}`} className="text-blue-600 hover:underline">
                          View Public Course Page ↗
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => openEditCourseModal(selectedCourse)}
                        className="text-xs font-bold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded border border-gray-200 transition"
                      >
                        ✏️ Edit Course
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(selectedCourse.documentId || selectedCourse.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded border border-red-200 transition"
                      >
                        🗑️ Delete Course
                      </button>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex items-center gap-2 mt-6 border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
                        activeTab === "overview"
                          ? "border-black text-black"
                          : "border-transparent text-gray-500 hover:text-black"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab("lessons")}
                      className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
                        activeTab === "lessons"
                          ? "border-black text-black"
                          : "border-transparent text-gray-500 hover:text-black"
                      }`}
                    >
                      Lessons ({selectedCourse.lessons?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab("quiz")}
                      className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
                        activeTab === "quiz"
                          ? "border-black text-black"
                          : "border-transparent text-gray-500 hover:text-black"
                      }`}
                    >
                      Quizzes ({selectedCourse.quizzes?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("students");
                        loadCourseStudents(selectedCourse);
                      }}
                      className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
                        activeTab === "students"
                          ? "border-black text-black"
                          : "border-transparent text-gray-500 hover:text-black"
                      }`}
                    >
                      Student Progress ({enrolledStudents.length})
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  
                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCourse.description}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900">{selectedCourse.lessons?.length || 0}</div>
                          <div className="text-xs text-gray-500 font-medium mt-1">Total Lessons</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900">{selectedCourse.quizzes?.length || 0}</div>
                          <div className="text-xs text-gray-500 font-medium mt-1">Quizzes</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900">{enrolledStudents.length}</div>
                          <div className="text-xs text-gray-500 font-medium mt-1">Enrolled Students</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lessons Tab */}
                  {activeTab === "lessons" && (
                    <div className="space-y-8">
                      {/* Existing Lessons List */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-3">Current Lessons</h3>
                        {!selectedCourse.lessons || selectedCourse.lessons.length === 0 ? (
                          <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
                            No lessons added yet. Use the form below to add lessons.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedCourse.lessons.map((lesson, idx) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg border border-gray-100"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                                    {lesson.order || idx + 1}
                                  </span>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">{lesson.title}</div>
                                    {lesson.videoUrl && (
                                      <div className="text-xs text-blue-600 font-mono mt-0.5">
                                        📺 Video: {lesson.videoUrl}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="text-xs font-bold text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Lesson Form */}
                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 mb-4">Add New Lesson</h3>
                        <form onSubmit={handleAddLesson} className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Lesson Title</label>
                              <input
                                type="text"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                placeholder="e.g. Introduction to React Components"
                                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Lesson Order</label>
                              <input
                                type="number"
                                value={lessonOrder}
                                onChange={(e) => setLessonOrder(e.target.value)}
                                min={1}
                                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Video URL (Optional: YouTube, MP4 URL)
                            </label>
                            <input
                              type="url"
                              value={lessonVideoUrl}
                              onChange={(e) => setLessonVideoUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Lesson Text Content</label>
                            <textarea
                              value={lessonContent}
                              onChange={(e) => setLessonContent(e.target.value)}
                              placeholder="Detailed lesson content, explanations, and code examples..."
                              rows={5}
                              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={savingLesson}
                            className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                          >
                            {savingLesson ? "Adding Lesson..." : "Add Lesson"}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Quizzes Tab */}
                  {activeTab === "quiz" && (
                    <div className="space-y-8">
                      {/* Existing Quizzes */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-3">Course Quizzes</h3>
                        {!selectedCourse.quizzes || selectedCourse.quizzes.length === 0 ? (
                          <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
                            No quiz created for this course yet. Create one below.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedCourse.quizzes.map((quiz) => (
                              <div key={quiz.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-base">{quiz.title}</h4>
                                    <p className="text-xs text-gray-500">{quiz.description}</p>
                                  </div>
                                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold">
                                    {quiz.questions?.length || 0} Questions
                                  </span>
                                </div>

                                {/* Questions List */}
                                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                                  {(!quiz.questions || quiz.questions.length === 0) ? (
                                    <div className="text-xs text-gray-400 italic py-1">
                                      No questions added to this quiz yet. Use the form below to add multiple-choice questions.
                                    </div>
                                  ) : (
                                    (() => {
                                      const raw = quiz.questions || [];
                                      const map = new Map();
                                      raw.forEach((q) => {
                                        const k = q.documentId || q.id || q.title;
                                        if (!map.has(k)) map.set(k, q);
                                      });
                                      return Array.from(map.values()).map((q, qIdx) => (
                                        <div key={q.id || qIdx} className="bg-white p-3 rounded-lg border border-gray-100 text-xs flex items-start justify-between gap-3 shadow-sm">
                                          <div className="flex-1">
                                            <div className="font-bold text-gray-800">Q{qIdx + 1}: {q.title}</div>
                                            <div className="mt-1.5 flex flex-wrap gap-2 text-gray-500">
                                              {Array.isArray(q.options) && q.options.map((opt, oIdx) => (
                                                <span
                                                  key={oIdx}
                                                  className={`px-2 py-0.5 rounded ${
                                                    opt === q.correctAnswer
                                                      ? "bg-green-100 text-green-800 font-bold border border-green-200"
                                                      : "bg-gray-100"
                                                  }`}
                                                >
                                                  {opt} {opt === q.correctAnswer && "✓"}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteQuestion(q.documentId || q.id)}
                                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
                                            title="Delete Question"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      ));
                                    })()
                                  )}
                                </div>

                                {/* Add Question to this Quiz Form */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h5 className="text-xs font-bold text-gray-700 uppercase mb-2">
                                    ➕ Add Multiple-Choice Question to "{quiz.title}"
                                  </h5>
                                  <form onSubmit={(e) => handleAddQuestion(e, quiz)} className="space-y-3">
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Question (e.g. Which hook manages component state in React?)"
                                        value={questionTitle}
                                        onChange={(e) => setQuestionTitle(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        placeholder="Option 1"
                                        value={option1}
                                        onChange={(e) => setOption1(e.target.value)}
                                        className="rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
                                        required
                                      />
                                      <input
                                        type="text"
                                        placeholder="Option 2"
                                        value={option2}
                                        onChange={(e) => setOption2(e.target.value)}
                                        className="rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
                                        required
                                      />
                                      <input
                                        type="text"
                                        placeholder="Option 3"
                                        value={option3}
                                        onChange={(e) => setOption3(e.target.value)}
                                        className="rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Option 4"
                                        value={option4}
                                        onChange={(e) => setOption4(e.target.value)}
                                        className="rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Correct Answer (Type exact matching text from one of the options)
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Exact correct answer"
                                        value={correctAnswer}
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none font-semibold text-green-700"
                                        required
                                      />
                                    </div>
                                    <button
                                      type="submit"
                                      disabled={savingQuestion}
                                      className="rounded bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                                    >
                                      {savingQuestion ? "Saving..." : "Add MCQ Question"}
                                    </button>
                                  </form>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Create Quiz Form */}
                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 mb-4">Create New Quiz</h3>
                        <form onSubmit={handleCreateQuiz} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Quiz Title</label>
                            <input
                              type="text"
                              value={quizTitle}
                              onChange={(e) => setQuizTitle(e.target.value)}
                              placeholder="e.g. Module 1 Knowledge Check"
                              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                            <textarea
                              value={quizDescription}
                              onChange={(e) => setQuizDescription(e.target.value)}
                              placeholder="Instructions for students taking this quiz..."
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={savingQuiz}
                            className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                          >
                            {savingQuiz ? "Creating..." : "Create Quiz"}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Student Progress Tab */}
                  {activeTab === "students" && (
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-4">
                        Enrolled Students & Progress Tracking
                      </h3>
                      {loadingStudents ? (
                        <div className="text-sm text-gray-500 animate-pulse">Calculating student progress...</div>
                      ) : enrolledStudents.length === 0 ? (
                        <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
                          No students are currently enrolled in this course.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-y border-gray-200">
                              <tr>
                                <th className="py-3 px-4">Student</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Lessons Done</th>
                                <th className="py-3 px-4">Progress Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {enrolledStudents.map((st) => (
                                <tr key={st.id}>
                                  <td className="py-3 px-4 font-bold text-gray-900">{st.username}</td>
                                  <td className="py-3 px-4">{st.email}</td>
                                  <td className="py-3 px-4 font-semibold text-gray-700">
                                    {st.completedLessons} / {st.totalLessons}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-28 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            st.percentage === 100 ? "bg-green-600" : "bg-black"
                                          }`}
                                          style={{ width: `${st.percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-gray-900">{st.percentage}%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}

