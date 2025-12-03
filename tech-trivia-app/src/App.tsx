import { useState, useEffect, useRef } from 'react';

// Tipos
interface Question {
  id: number;
  question: string;
  correctAnswer: string;
  category: string;
}

interface Team {
  name: string;
  score: number;
  transcript: string;
  isRecording: boolean;
  suggestedScore?: number;
  analysis?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Banco de preguntas
const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "¿Qué es una API REST y cuál es su diferencia principal con SOAP?",
    correctAnswer: "REST es un estilo arquitectónico que usa HTTP y es stateless, mientras SOAP es un protocolo más rígido basado en XML. REST es más ligero y flexible.",
    category: "APIs"
  },
  {
    id: 2,
    question: "¿Cuáles son las principales ventajas de una arquitectura de microservicios?",
    correctAnswer: "Escalabilidad independiente, desarrollo paralelo por equipos, mayor resiliencia, facilidad para actualizar componentes individuales, y flexibilidad tecnológica.",
    category: "Arquitectura"
  },
  {
    id: 3,
    question: "¿Qué diferencia hay entre IaaS, PaaS y SaaS en cloud computing?",
    correctAnswer: "IaaS provee infraestructura (servidores, storage), PaaS incluye plataforma de desarrollo, y SaaS ofrece software completo como servicio.",
    category: "Cloud"
  },
  {
    id: 4,
    question: "¿Cuáles son los roles principales en Scrum?",
    correctAnswer: "Product Owner (define el producto), Scrum Master (facilita el proceso), y Development Team (ejecuta el trabajo).",
    category: "Agile"
  },
  {
    id: 5,
    question: "¿Qué es CI/CD y por qué es importante en DevOps?",
    correctAnswer: "Integración Continua y Despliegue Continuo. Permite automatizar testing, integración y deployment, reduciendo errores y acelerando entregas.",
    category: "DevOps"
  },
  {
    id: 6,
    question: "¿Qué es Docker y cuál es su principal beneficio?",
    correctAnswer: "Docker es una plataforma de contenedores que empaqueta aplicaciones con sus dependencias. Garantiza consistencia entre entornos (dev, test, prod).",
    category: "Contenedores"
  },
  {
    id: 7,
    question: "¿Para qué se usa Kubernetes?",
    correctAnswer: "Kubernetes orquesta y gestiona contenedores en producción: escalado automático, balanceo de carga, self-healing, y deployments.",
    category: "Kubernetes"
  },
  {
    id: 8,
    question: "¿Qué es Machine Learning y da un ejemplo de uso?",
    correctAnswer: "ML permite que sistemas aprendan de datos sin programación explícita. Ejemplos: recomendaciones de Netflix, detección de fraude, reconocimiento de imágenes.",
    category: "IA/ML"
  },
  {
    id: 9,
    question: "¿Qué es la arquitectura MVC?",
    correctAnswer: "Model-View-Controller separa lógica de negocio (Model), presentación (View) y control de flujo (Controller) para mejor organización y mantenibilidad.",
    category: "Arquitectura"
  },
  {
    id: 10,
    question: "¿Qué es un ataque XSS y cómo se previene?",
    correctAnswer: "Cross-Site Scripting inyecta scripts maliciosos. Se previene validando/sanitizando inputs, escapando outputs, y usando Content Security Policy.",
    category: "Seguridad"
  },
  {
    id: 11,
    question: "¿Cuál es la diferencia entre frontend y backend?",
    correctAnswer: "Frontend es la interfaz de usuario (HTML, CSS, JS) que corre en el navegador. Backend es la lógica del servidor, bases de datos y APIs.",
    category: "Desarrollo Web"
  },
  {
    id: 12,
    question: "¿Qué son los tres servicios principales de AWS más usados?",
    correctAnswer: "EC2 (servidores virtuales), S3 (almacenamiento de objetos), y RDS (bases de datos relacionales gestionadas).",
    category: "Cloud"
  }
];

type GamePhase = 'setup' | 'question' | 'recording' | 'evaluation' | 'scoring' | 'results' | 'winner';

function App() {
  // Estados principales
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [teams, setTeams] = useState<Team[]>([
    { name: '', score: 0, transcript: '', isRecording: false },
    { name: '', score: 0, transcript: '', isRecording: false },
    { name: '', score: 0, transcript: '', isRecording: false }
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [language, setLanguage] = useState<'es-ES' | 'en-US'>('es-ES');

  // Referencias
  const recognitionsRef = useRef<(SpeechRecognition | null)[]>([null, null, null]);
  const timerRef = useRef<number | null>(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // Timer
  useEffect(() => {
    if (phase === 'recording' && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (phase === 'recording' && timeLeft === 0) {
      stopAllRecordings();
      setPhase('evaluation');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, timeLeft]);

  // Iniciar reconocimiento de voz para un equipo
  const startRecording = (teamIndex: number) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    const recognition = new SpeechRecognition() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setTeams(prev => {
        const newTeams = [...prev];
        newTeams[teamIndex].transcript = transcript;
        return newTeams;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      setTeams(prev => {
        const newTeams = [...prev];
        newTeams[teamIndex].isRecording = false;
        return newTeams;
      });
    };

    recognition.onend = () => {
      setTeams(prev => {
        const newTeams = [...prev];
        newTeams[teamIndex].isRecording = false;
        return newTeams;
      });
    };

    try {
      recognition.start();
      recognitionsRef.current[teamIndex] = recognition;
      setTeams(prev => {
        const newTeams = [...prev];
        newTeams[teamIndex].isRecording = true;
        return newTeams;
      });
    } catch (error) {
      console.error('Error al iniciar reconocimiento:', error);
    }
  };

  // Detener reconocimiento de voz para un equipo
  const stopRecording = (teamIndex: number) => {
    const recognition = recognitionsRef.current[teamIndex];
    if (recognition) {
      recognition.stop();
      recognitionsRef.current[teamIndex] = null;
    }
  };

  // Detener todas las grabaciones
  const stopAllRecordings = () => {
    recognitionsRef.current.forEach((recognition, index) => {
      if (recognition) {
        recognition.stop();
        recognitionsRef.current[index] = null;
      }
    });
    setTeams(prev => prev.map(team => ({ ...team, isRecording: false })));
  };

  // Evaluar respuestas con Claude API
  const evaluateAnswers = async () => {
    if (!apiKey) {
      alert('Por favor ingresa tu API Key de Anthropic');
      setShowApiKeyInput(true);
      return;
    }

    setIsEvaluating(true);

    try {
      const evaluationPromises = teams.map(async (team) => {
        if (!team.transcript.trim()) {
          return {
            score: 0,
            analysis: 'No se proporcionó respuesta'
          };
        }

        const prompt = `Eres un evaluador de preguntas técnicas para un evento de trivia.

PREGUNTA: ${currentQuestion.question}

RESPUESTA CORRECTA: ${currentQuestion.correctAnswer}

RESPUESTA DEL EQUIPO: ${team.transcript}

Evalúa la respuesta del equipo comparándola con la respuesta correcta. Asigna un puntaje de 0 a 10 considerando:
- Exactitud de la información (50%)
- Completitud de la respuesta (30%)
- Claridad en la explicación (20%)

Responde en formato JSON:
{
  "score": [número entre 0-10],
  "analysis": "[breve análisis de 1-2 líneas explicando el puntaje]"
}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Error en API: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Extraer JSON de la respuesta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return result;
        }

        return { score: 5, analysis: 'Error al parsear respuesta' };
      });

      const evaluations = await Promise.all(evaluationPromises);

      setTeams(prev => prev.map((team, index) => ({
        ...team,
        suggestedScore: evaluations[index].score,
        analysis: evaluations[index].analysis
      })));

      setPhase('scoring');
    } catch (error) {
      console.error('Error evaluando respuestas:', error);
      alert('Error al evaluar respuestas. Verifica tu API Key.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Asignar puntos y pasar a siguiente pregunta
  const assignScores = () => {
    setTeams(prev => prev.map(team => ({
      ...team,
      score: team.score + (team.suggestedScore || 0),
      transcript: '',
      suggestedScore: undefined,
      analysis: undefined
    })));

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(60);
      setPhase('question');
    } else {
      setPhase('winner');
    }
  };

  // Ajustar puntaje sugerido manualmente
  const adjustScore = (teamIndex: number, newScore: number) => {
    setTeams(prev => {
      const newTeams = [...prev];
      newTeams[teamIndex].suggestedScore = Math.max(0, Math.min(10, newScore));
      return newTeams;
    });
  };

  // Iniciar juego
  const startGame = () => {
    if (teams.some(team => !team.name.trim())) {
      alert('Por favor ingresa el nombre de los 3 equipos');
      return;
    }
    setPhase('question');
  };

  // Iniciar ronda de respuestas
  const startAnswerRound = () => {
    setPhase('recording');
    setTimeLeft(60);
  };

  // Renderizado condicional por fase
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2 text-globant-green">Tech Trivia</h1>
            <p className="text-gray-400">Evento Corporativo Globant</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Idioma del reconocimiento de voz:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'es-ES' | 'en-US')}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-globant-green"
              >
                <option value="es-ES">Español</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {[0, 1, 2].map((index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Equipo {index + 1}:
                </label>
                <input
                  type="text"
                  value={teams[index].name}
                  onChange={(e) => {
                    const newTeams = [...teams];
                    newTeams[index].name = e.target.value;
                    setTeams(newTeams);
                  }}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-globant-green"
                  placeholder={`Equipo ${index + 1}`}
                />
              </div>
            ))}

            <div>
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-sm text-globant-green hover:underline mb-2"
              >
                {showApiKeyInput ? 'Ocultar' : 'Configurar'} API Key de Anthropic
              </button>

              {showApiKeyInput && (
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-globant-green"
                  placeholder="sk-ant-..."
                />
              )}
            </div>

            <button
              onClick={startGame}
              className="w-full bg-globant-green text-globant-dark font-bold py-4 rounded-lg hover:bg-green-400 transition-colors text-xl"
            >
              Iniciar Trivia
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'question') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white p-4">
        {/* Header con scores */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {teams.map((team, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4 text-center">
                <h3 className="font-bold text-lg mb-1">{team.name}</h3>
                <p className="text-3xl font-bold text-globant-green">{team.score}</p>
              </div>
            ))}
          </div>

          {/* Pregunta actual */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className="text-globant-green font-semibold">
                Pregunta {currentQuestionIndex + 1} de {QUESTIONS.length}
              </span>
              <span className="bg-globant-green text-globant-dark px-4 py-1 rounded-full font-bold">
                {currentQuestion.category}
              </span>
            </div>

            <h2 className="text-3xl font-bold mb-8 text-center">{currentQuestion.question}</h2>

            <button
              onClick={startAnswerRound}
              className="w-full bg-globant-green text-globant-dark font-bold py-4 rounded-lg hover:bg-green-400 transition-colors text-xl"
            >
              Iniciar Respuestas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recording') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white p-4">
        <div className="max-w-7xl mx-auto">
          {/* Timer */}
          <div className="text-center mb-8">
            <div className={`inline-block text-6xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-globant-green'}`}>
              {timeLeft}s
            </div>
          </div>

          {/* Pregunta */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-center">{currentQuestion.question}</h2>
          </div>

          {/* Equipos respondiendo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teams.map((team, index) => (
              <div key={index} className="bg-gray-800 rounded-xl p-6">
                <h3 className="font-bold text-xl mb-4 text-globant-green">{team.name}</h3>

                <button
                  onClick={() => team.isRecording ? stopRecording(index) : startRecording(index)}
                  className={`w-full py-3 rounded-lg font-bold mb-4 transition-colors ${
                    team.isRecording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-globant-green text-globant-dark hover:bg-green-400'
                  }`}
                >
                  {team.isRecording ? '⏹ Detener' : '🎤 Grabar'}
                </button>

                <div className="bg-gray-700 rounded-lg p-4 min-h-[150px]">
                  <p className="text-sm text-gray-400 mb-2">Transcripción:</p>
                  <p className="text-white">{team.transcript || 'Esperando respuesta...'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => {
                stopAllRecordings();
                setPhase('evaluation');
              }}
              className="bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors font-bold"
            >
              Finalizar Respuestas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'evaluation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="bg-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Respuestas de los Equipos</h2>

            <div className="space-y-6 mb-8">
              {teams.map((team, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-6">
                  <h3 className="font-bold text-xl mb-3 text-globant-green">{team.name}</h3>
                  <p className="text-white">{team.transcript || 'No hubo respuesta'}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-lg mb-2 text-globant-green">Respuesta Correcta:</h3>
              <p className="text-white">{currentQuestion.correctAnswer}</p>
            </div>

            <button
              onClick={evaluateAnswers}
              disabled={isEvaluating}
              className="w-full bg-globant-green text-globant-dark font-bold py-4 rounded-lg hover:bg-green-400 transition-colors text-xl disabled:opacity-50"
            >
              {isEvaluating ? 'Evaluando con Claude...' : 'Evaluar con IA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'scoring') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Evaluación y Puntuación</h2>

            <div className="space-y-6 mb-8">
              {teams.map((team, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-6">
                  <h3 className="font-bold text-xl mb-3 text-globant-green">{team.name}</h3>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-1">Respuesta:</p>
                    <p className="text-white text-sm">{team.transcript || 'No hubo respuesta'}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-1">Análisis de IA:</p>
                    <p className="text-white text-sm italic">{team.analysis}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Puntos:</label>
                    <button
                      onClick={() => adjustScore(index, (team.suggestedScore || 0) - 1)}
                      className="bg-gray-600 hover:bg-gray-500 w-10 h-10 rounded-lg font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={team.suggestedScore || 0}
                      onChange={(e) => adjustScore(index, parseInt(e.target.value) || 0)}
                      min="0"
                      max="10"
                      className="w-20 px-3 py-2 bg-gray-600 rounded-lg text-center font-bold text-xl"
                    />
                    <button
                      onClick={() => adjustScore(index, (team.suggestedScore || 0) + 1)}
                      className="bg-gray-600 hover:bg-gray-500 w-10 h-10 rounded-lg font-bold"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-400">/ 10</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={assignScores}
              className="w-full bg-globant-green text-globant-dark font-bold py-4 rounded-lg hover:bg-green-400 transition-colors text-xl"
            >
              Confirmar Puntos y Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'winner') {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const winner = sortedTeams[0];

    return (
      <div className="min-h-screen bg-gradient-to-br from-globant-dark via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-12 shadow-2xl">
            <h1 className="text-6xl font-bold mb-4 text-globant-green animate-pulse">
              🏆 ¡Ganador! 🏆
            </h1>
            <h2 className="text-5xl font-bold mb-12">{winner.name}</h2>

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-globant-green">Resultados Finales</h3>
              <div className="space-y-4">
                {sortedTeams.map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-6 rounded-lg ${
                      index === 0 ? 'bg-globant-green text-globant-dark' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold">{index + 1}</span>
                      <span className="text-2xl font-bold">{team.name}</span>
                    </div>
                    <span className="text-3xl font-bold">{team.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setTeams([
                  { name: '', score: 0, transcript: '', isRecording: false },
                  { name: '', score: 0, transcript: '', isRecording: false },
                  { name: '', score: 0, transcript: '', isRecording: false }
                ]);
                setCurrentQuestionIndex(0);
                setPhase('setup');
                setApiKey('');
              }}
              className="bg-globant-green text-globant-dark font-bold px-8 py-4 rounded-lg hover:bg-green-400 transition-colors text-xl"
            >
              Nueva Partida
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
