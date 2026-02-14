"use client";


import { useState, useEffect } from 'react';
import { Timer, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LiveMatchProps {
  match: TournamentMatch;
  isParticipant: boolean;
  teamId?: string;
  onAnswer: (answerId: number) => void;
}

export function LiveMatch({ 
  match, 
  isParticipant, 
  teamId,
  onAnswer 
}: LiveMatchProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (match.status === 'in-progress' && !answered) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [match.status, answered]);

  const handleAnswer = (optionIndex: number) => {
    if (!answered && isParticipant) {
      setAnswered(true);
      onAnswer(optionIndex);
    }
  };

  const question = match.currentQuestion;

  return (
    <div className="space-y-6">
      {/* Placar */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {match.team1Id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {/* Pontuação da equipe 1 */}
              0
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {match.team2Id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {/* Pontuação da equipe 2 */}
              0
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pergunta Atual */}
      {question && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pergunta</CardTitle>
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                <span className="text-2xl font-bold">
                  {timeLeft}s
                </span>
              </div>
            </div>
            <Progress value={(timeLeft / 30) * 100} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">{question.text}</p>
            
            {isParticipant && (
              <div className="grid grid-cols-1 gap-2">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 text-left justify-start"
                    onClick={() => handleAnswer(index)}
                    disabled={answered || timeLeft === 0}
                  >
                    <span className="font-bold mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {!isParticipant && (
              <div className="text-center text-muted-foreground">
                <Eye className="w-6 h-6 mx-auto mb-2" />
                Você está assistindo esta partida
              </div>
            )}

            {answered && (
              <div className="text-center text-green-600 font-semibold">
                Resposta enviada! Aguardando resultado...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Espectadores */}
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Users className="w-5 h-5" />
          <span>{match.tournamentId} espectadores assistindo</span>
        </CardContent>
      </Card>
    </div>
  );
}