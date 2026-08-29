"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../components/Toast";

function parseQuestionOptions(question) {
  if (!question) return [];

  // 1. Direct array of options
  if (Array.isArray(question.options)) {
    return question.options.map((opt) => (typeof opt === "object" && opt !== null ? opt.text || opt.title || opt.value || JSON.stringify(opt) : String(opt))).filter(Boolean);
  }

  // 2. Stringified JSON array or comma-separated string
  if (typeof question.options === "string") {
    try {
      const parsed = JSON.parse(question.options);
      if (Array.isArray(parsed)) {
        return parsed.map((opt) => (typeof opt === "object" && opt !== null ? opt.text || opt.title || opt.value || JSON.stringify(opt) : String(opt))).filter(Boolean);
      }
      if (typeof parsed === "object" && parsed !== null) {
        return Object.values(parsed).map(String).filter(Boolean);
      }
    } catch (e) {
      if (question.options.includes(",")) {
        return question.options.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (question.options.trim()) {
        return [question.options.trim()];
      }
    }
  }

  // 3. Object with keys
  if (typeof question.options === "object" && question.options !== null) {
    return Object.values(question.options).map(String).filter(Boolean);
  }

  // 4. Individual option properties (option1, option2, option3, option4, etc.)
  const discrete = [
    question.option1 || question.option_1 || question.optionA || question.a,
    question.option2 || question.option_2 || question.optionB || question.b,
    question.option3 || question.option_3 || question.optionC || question.c,
    question.option4 || question.option_4 || question.optionD || question.d,
  ].filter(Boolean);

  if (discrete.length > 0) {
    return discrete.map(String);
  }

  return [];
}

export default function QuizTakingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const jwt = localStorage.getItem("jwt");
        if (!jwt || jwt === "undefined" || jwt === "null") {
          toast.info("Please log in first to take the quiz.");
          router.push("/login");
          return;
        }

        let quizObj = null;

        // 1. Try direct fetch by ID or DocumentId
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes/${id}?populate=*`,
            {
              headers: { Authorization: `Bearer ${jwt}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.data) quizObj = data.data;
          }
        } catch (e) {}

        // 2. Fallback: Search in all quizzes list
        if (!quizObj) {
          try {
            const allRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes?populate=*`,
              {
                headers: { Authorization: `Bearer ${jwt}` },
              }
            );
            if (allRes.ok) {
              const allData = await allRes.json();
              const list = allData?.data || [];
              quizObj = list.find(
                (q) => q.id === Number(id) || q.documentId === id || String(q.id) === String(id)
              );
            }
          } catch (e) {}
        }

        if (!quizObj) {
          throw new Error("Quiz not found or is not yet published.");
        }

        // 3. Ensure all questions are populated
        if (!quizObj.questions || quizObj.questions.length === 0) {
          try {
            const qRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/questions?populate=*`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (qRes.ok) {
              const qData = await qRes.json();
              const matched = (qData.data || []).filter((item) => {
                const qz = item.quiz;
                return (
                  qz &&
                  (qz.id === quizObj.id ||
                    qz.documentId === quizObj.documentId ||
                    qz.documentId === id ||
                    String(qz.id) === String(id) ||
                    qz.title === quizObj.title)
                );
              });
              if (matched.length > 0) {
                quizObj.questions = matched;
              }
            }
          } catch (e) {}
        }

        setQuiz(quizObj);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadQuiz();
  }, [id, router, toast]);

  function handleSelectOption(question, option) {
    const qId = question?.id;
    const qDocId = question?.documentId;
    const qTitle = question?.title;

    setSelectedAnswers((prev) => {
      const next = { ...prev };
      if (qId) next[qId] = option;
      if (qDocId) next[qDocId] = option;
      if (qTitle) next[qTitle] = option;
      return next;
    });
  }

  async function handleSubmitQuiz(e) {
    e.preventDefault();
    const questions = quiz.questions || [];

    // Count how many questions were answered
    let answeredCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] || selectedAnswers[q.documentId]) {
        answeredCount++;
      }
    });

    if (answeredCount < questions.length) {
      if (
        !confirm(
          `You have answered ${answeredCount} of ${questions.length} questions. Do you still want to submit?`
        )
      ) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quiz-results/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            quiz: quiz.documentId || quiz.id || id,
            answers: selectedAnswers,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Failed to submit quiz");
      }

      setQuizResult(data.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading Quiz Questions...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow border border-red-100 max-w-md">
          <div className="text-3xl mb-2">⚠️</div>
          <h2 className="text-lg font-bold text-red-600 mb-2">Quiz Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-sm font-bold text-black underline">
            ← Return to Courses
          </Link>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <Link href="/" className="text-sm font-bold text-black underline">
            ← Return to Courses
          </Link>
        </div>
      </main>
    );
  }

  const rawQuestions = quiz.questions || [];
  const questionMap = new Map();
  rawQuestions.forEach((q) => {
    const key = q.documentId || q.id || q.title;
    if (!questionMap.has(key)) {
      questionMap.set(key, q);
    }
  });
  const questions = Array.from(questionMap.values());

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href={`/courses/${quiz.course?.documentId || quiz.course?.id || ""}`}
            className="text-sm font-semibold text-gray-600 hover:text-black transition"
          >
            ← Back to Course
          </Link>
        </div>

        {/* Quiz Result Screen (Shown after submit) */}
        {quizResult ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200 mb-8 animate-fadeIn">
            <div className="text-center mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                quizResult.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {quizResult.passed ? "🎉 Passed Assessment" : "❌ Did Not Pass"}
              </span>
              <h1 className="text-3xl font-black text-gray-900">Quiz Auto-Grading Results</h1>
              <p className="text-sm text-gray-500 mt-1">{quiz.title}</p>
            </div>

            {/* Score Summary Box */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col sm:flex-row items-center justify-around gap-4 mb-8">
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500">Your Score</div>
                <div className="text-4xl font-black text-gray-900 mt-1">
                  {quizResult.score} <span className="text-xl text-gray-400 font-normal">/ {quizResult.total}</span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500">Percentage</div>
                <div className={`text-4xl font-black mt-1 ${
                  quizResult.passed ? "text-green-600" : "text-red-600"
                }`}>
                  {quizResult.percentage}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-gray-500">Required to Pass</div>
                <div className="text-2xl font-bold text-gray-700 mt-1">60%</div>
              </div>
            </div>

            {/* Detailed Question Review */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Question Breakdown</h2>
            <div className="space-y-4 mb-8">
              {quizResult.breakdown?.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    item.isCorrect
                      ? "bg-green-50/50 border-green-200"
                      : "bg-red-50/50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-gray-900 text-sm">
                      Q{idx + 1}: {item.question}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {item.isCorrect ? "Correct ✓" : "Incorrect ✗"}
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1">
                    <div className="text-gray-700">
                      Your answer: <strong>{item.studentAnswer || "(No answer selected)"}</strong>
                    </div>
                    {!item.isCorrect && (
                      <div className="text-green-700">
                        Correct answer: <strong>{item.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setQuizResult(null);
                  setSelectedAnswers({});
                }}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                🔄 Retake Quiz
              </button>

              <Link
                href={`/courses/${quiz.course?.documentId || quiz.course?.id || ""}`}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
              >
                Back to Course →
              </Link>
            </div>
          </div>
        ) : (
          /* Quiz Form Screen */
          <form onSubmit={handleSubmitQuiz} className="space-y-6">
            
            {/* Header */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded">
                MCQ Quiz Assessment
              </span>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-2">
                {quiz.title}
              </h1>
              {quiz.description && (
                <p className="text-sm text-gray-600 mt-2">{quiz.description}</p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
                Answer all {questions.length} questions and click Submit for immediate automated grading.
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center text-gray-400 border border-gray-100">
                No questions have been configured for this quiz yet.
              </div>
            ) : (
              questions.map((question, qIdx) => {
                const options = parseQuestionOptions(question);
                const currentAnswer =
                  selectedAnswers[question.id] ||
                  selectedAnswers[question.documentId] ||
                  selectedAnswers[question.title];

                return (
                  <div
                    key={question.id || qIdx}
                    className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <h2 className="text-base font-bold text-gray-900">
                        {question.title}
                      </h2>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-2.5 pt-2">
                      {options.map((option, oIdx) => {
                        const isSelected = currentAnswer === option;

                        return (
                          <label
                            key={oIdx}
                            onClick={() => handleSelectOption(question, option)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? "bg-black text-white border-black shadow-sm"
                                : "bg-gray-50/70 border-gray-200 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id || question.documentId || qIdx}`}
                              value={option}
                              checked={isSelected}
                              onChange={() => handleSelectOption(question, option)}
                              className="w-4 h-4 text-black focus:ring-black"
                            />
                            <span className="text-sm font-medium">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Submit Action */}
            {questions.length > 0 && (
              <div className="flex items-center justify-end gap-4 pt-4">
                <Link
                  href={`/courses/${quiz.course?.documentId || quiz.course?.id || ""}`}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-black px-8 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400 transition shadow-sm"
                >
                  {submitting ? "Submitting & Auto-Grading..." : "Submit Answers →"}
                </button>
              </div>
            )}
          </form>
        )}

      </div>
    </main>
  );
}
