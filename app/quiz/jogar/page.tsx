"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Sparkles, Flame } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  wrong_answers: unknown; // pode vir como jsonb (array) ou string[]
  bible_reference: string | null;
  topic: string | null;
}

interface Answer {
  question_id: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeWrongAnswers(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  // pode vir como jsonb stringificado
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignora
    }
  }
  return [];
}

export default function JogarQuizPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const submitLock = useRef(false);
  const nextLock = useRef(false);

  useEffect(() => {
    void loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQuiz() {
    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("id", user.id)
        .single();

      if (profileErr) throw profileErr;
      if (!profileData) return;

      setProfile(profileData);

      const urlParams = new URLSearchParams(window.location.search);
      const aiMode = urlParams.get("ai") === "true";
      setUseAI(aiMode);

      // cria sessão
      const { data: session, error: sessionErr } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: user.id,
          competition_mode: "individual",
          questions: [],
          answers: [],
          score: 0,
          completed: false,
        })
        .select("id")
        .single();

      if (sessionErr) throw sessionErr;
      if (!session?.id) throw new Error("Falha ao criar sessão.");

      setSessionId(session.id);

      // primeira pergunta
      await loadNextQuestion(session.id, aiMode);
    } catch (error) {
      console.error("[quiz] Error loading quiz:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadNextQuestion(sid: string, aiMode: boolean) {
    setIsLoadingNext(true);
    try {
      const response = await fetch("/api/proxima-pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, useAI: aiMode }),
      });

      const data = await response.json();

      if (data?.success && data?.question) {
        setCurrentQuestion(data.question as Question);
      } else {
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error("[quiz] Error loading next question:", error);
      setCurrentQuestion(null);
    } finally {
      setIsLoadingNext(false);
    }
  }

  function handleAnswerSelect(answer: string) {
    if (showResult) return;
    setSelectedAnswer(answer);
  }

  async function handleSubmitAnswer() {
    if (submitLock.current) return;
    if (!selectedAnswer || !currentQuestion || !sessionId || !profile) return;

    submitLock.current = true;
    try {
      const isCorrect = selectedAnswer === currentQuestion.correct_answer;

      const newAnswer: Answer = {
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer,
        correct_answer: currentQuestion.correct_answer,
        is_correct: isCorrect,
      };

      setAnswers((prev) => [...prev, newAnswer]);
      setShowResult(true);

      setCurrentStreak((prev) => (isCorrect ? prev + 1 : 0));

      // marca como respondida (se não for IA)
      if (!useAI) {
        const { error } = await supabase.from("answered_questions").insert({
          user_id: profile.id,
          question_id: currentQuestion.id,
        });
        // se já existir unique, ignore conflito silencioso
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          console.warn("[quiz] answered_questions insert failed:", error.message);
        }
      }

      await updateProgressAndSession({
        sid: sessionId,
        questionId: currentQuestion.id,
        isCorrect,
      });
    } catch (error) {
      console.error("[quiz] Error submitting answer:", error);
    } finally {
      submitLock.current = false;
    }
  }

  async function updateProgressAndSession({
    sid,
    questionId,
    isCorrect,
  }: {
    sid: string;
    questionId: string;
    isCorrect: boolean;
  }) {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return;

      // progress
      const { data: progress, error: progressErr } = await supabase
        .from("user_progress")
        .select("user_id,current_level,total_questions_answered,correct_answers,weekly_progress")
        .eq("user_id", user.id)
        .single();

      if (progressErr) {
        // se não existe, cria inicial
        const { error: insertProgErr } = await supabase.from("user_progress").insert({
          user_id: user.id,
          current_level: 1,
          total_questions_answered: 1,
          correct_answers: isCorrect ? 1 : 0,
          weekly_progress: 1,
        });

        if (insertProgErr) console.warn("[quiz] user_progress insert failed:", insertProgErr.message);
      } else if (progress) {
        const newCorrectAnswers = Number(progress.correct_answers ?? 0) + (isCorrect ? 1 : 0);
        const newTotalQuestions = Number(progress.total_questions_answered ?? 0) + 1;

        const accuracyRate = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0;

        let newLevel = Number(progress.current_level ?? 1);
        if (accuracyRate >= 85 && newTotalQuestions >= newLevel * 8) newLevel += 1;

        const { error: updErr } = await supabase
          .from("user_progress")
          .update({
            current_level: newLevel,
            total_questions_answered: newTotalQuestions,
            correct_answers: newCorrectAnswers,
            weekly_progress: Number(progress.weekly_progress ?? 0) + 1,
          })
          .eq("user_id", user.id);

        if (updErr) console.warn("[quiz] user_progress update failed:", updErr.message);
      }

      // session (usa o estado mais atual via função)
      const nextAnswers = [...answers, { question_id: questionId, selected_answer: "", correct_answer: "", is_correct: isCorrect }];
      const nextScore = answers.filter((a) => a.is_correct).length + (isCorrect ? 1 : 0);

      const { error: sessErr } = await supabase
        .from("quiz_sessions")
        .update({
          answers: nextAnswers.map((a) => ({ question_id: a.question_id, is_correct: a.is_correct })),
          score: nextScore,
        })
        .eq("id", sid);

      if (sessErr) console.warn("[quiz] quiz_sessions update failed:", sessErr.message);
    } catch (error) {
      console.error("[quiz] Error updating progress/session:", error);
    }
  }

  async function handleNextQuestion() {
    if (nextLock.current) return;
    if (!sessionId) return;

    nextLock.current = true;
    try {
      setQuestionsAnswered((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setCurrentQuestion(null);

      await loadNextQuestion(sessionId, useAI);
    } finally {
      nextLock.current = false;
    }
  }

  async function handleFinishQuiz() {
    if (!sessionId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const score = answers.filter((a) => a.is_correct).length;

      const { error } = await supabase
        .from("quiz_sessions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          score,
        })
        .eq("id", sessionId);

      if (error) console.warn("[quiz] finish update failed:", error.message);

      router.push(`/quiz/resultado/${sessionId}`);
    } catch (error) {
      console.error("[quiz] Error finishing quiz:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">{useAI ? "Gerando perguntas com IA..." : "Carregando perguntas..."}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !isLoadingNext) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar pergunta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Não foi possível carregar a próxima pergunta.</p>
            <Button onClick={() => router.push("/quiz")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingNext || !currentQuestion) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Carregando próxima pergunta...</p>
        </div>
      </div>
    );
  }

  const wrongs = normalizeWrongAnswers(currentQuestion.wrong_answers);
  const allAnswers = shuffle([currentQuestion.correct_answer, ...wrongs]).slice(0, 6);

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {useAI && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <p className="text-sm font-medium text-purple-900">Perguntas geradas por IA com dificuldade progressiva</p>
          </div>
        )}

        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{questionsAnswered}</p>
              <p className="text-xs text-muted-foreground">Respondidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{answers.filter((a) => a.is_correct).length}</p>
              <p className="text-xs text-muted-foreground">Corretas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
              </div>
              <p className="text-xs text-muted-foreground">Sequência</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">{currentQuestion.question_text}</CardTitle>
            <p className="text-sm text-muted-foreground">{currentQuestion.bible_reference ?? ""}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allAnswers.map((answer, index) => {
                const isSelected = selectedAnswer === answer;
                const isCorrect = answer === currentQuestion.correct_answer;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={`${answer}-${index}`}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={showResult}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      showCorrect
                        ? "border-green-500 bg-green-50"
                        : showWrong
                        ? "border-destructive bg-red-50"
                        : isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-border bg-card hover:border-blue-300"
                    } ${showResult ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{answer}</span>
                      {showCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleFinishQuiz}>
            Finalizar Quiz
          </Button>

          {!showResult ? (
            <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} size="lg">
              Confirmar Resposta
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} size="lg">
              Próxima Pergunta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
