import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppNavigation from '@/components/AppNavigation';
import { getStudyNote, type SavedStudyNote } from '@/services/study-note-history';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function QuizScreen() {
  const { noteId: noteIdParam } = useLocalSearchParams<{ noteId?: string }>();
  const parsedNoteId = typeof noteIdParam === 'string' ? Number(noteIdParam) : undefined;
  const requestedNoteId =
    parsedNoteId !== undefined && Number.isSafeInteger(parsedNoteId) && parsedNoteId > 0
      ? parsedNoteId
      : undefined;
  const [note, setNote] = useState<SavedStudyNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let isActive = true;
    void getStudyNote(requestedNoteId)
      .then((savedNote) => {
        if (isActive) {
          setNote(savedNote);
          setQuestionIndex(0);
          setSelectedOption(null);
          setScore(0);
          setIsFinished(false);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(`No se pudo cargar el apunte: ${errorMessage(error)}`);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [requestedNoteId]);

  const currentQuestion = note?.preguntas[questionIndex];

  function chooseOption(optionIndex: number) {
    if (!currentQuestion || selectedOption !== null) {
      return;
    }

    setSelectedOption(optionIndex);
    if (optionIndex === currentQuestion.correcta) {
      setScore((currentScore) => currentScore + 1);
    }
  }

  function showNextQuestion() {
    if (!note || selectedOption === null) {
      return;
    }

    if (questionIndex === note.preguntas.length - 1) {
      setIsFinished(true);
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex + 1);
    setSelectedOption(null);
  }

  function restartQuiz() {
    setQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsFinished(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>REPASO ACTIVO</Text>
        <Text style={styles.title}>Quiz</Text>
        {isLoading ? (
          <ActivityIndicator color="#276B57" size="large" style={styles.loading} />
        ) : null}
        {loadError ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}
        {!isLoading && !loadError && !note ? (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>Todavía no hay apuntes para practicar</Text>
            <Text style={styles.bodyText}>
              Analiza una foto desde Resumen y aquí aparecerán sus preguntas.
            </Text>
            <Link href="/" style={styles.textLink}>
              Ir a Resumen
            </Link>
          </View>
        ) : null}
        {!isLoading && !loadError && note && isFinished ? (
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>¡Quiz terminado!</Text>
            <Text style={styles.score}>{score} / {note.preguntas.length}</Text>
            <Text style={styles.bodyText}>Respuestas correctas</Text>
            <Text style={styles.resultMessage}>
              {score === note.preguntas.length
                ? '¡Excelente! Dominaste este apunte.'
                : 'Buen trabajo. Puedes repetir el quiz para seguir practicando.'}
            </Text>
            <Pressable onPress={restartQuiz} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Intentar de nuevo</Text>
            </Pressable>
            <Link href="/history" style={styles.textLink}>
              Ver historial
            </Link>
          </View>
        ) : null}
        {!isLoading && !loadError && note && !isFinished && currentQuestion ? (
          <View style={styles.quizCard}>
            <Text style={styles.noteTitle}>{note.titulo}</Text>
            <Text style={styles.progressLabel}>
              Pregunta {questionIndex + 1} de {note.preguntas.length}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((questionIndex + 1) / note.preguntas.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.question}>{currentQuestion.pregunta}</Text>
            <View style={styles.options}>
              {currentQuestion.opciones.map((option, optionIndex) => {
                const isSelected = selectedOption === optionIndex;
                const isCorrect = currentQuestion.correcta === optionIndex;
                return (
                  <Pressable
                    key={`${option}-${optionIndex}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: selectedOption !== null }}
                    disabled={selectedOption !== null}
                    onPress={() => chooseOption(optionIndex)}
                    style={[
                      styles.option,
                      isSelected && isCorrect && styles.correctOption,
                      isSelected && !isCorrect && styles.incorrectOption,
                      selectedOption !== null && isCorrect && styles.correctOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        (isSelected && isCorrect || selectedOption !== null && isCorrect) &&
                          styles.selectedOptionText,
                        isSelected && !isCorrect && styles.incorrectOptionText,
                      ]}
                    >
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedOption !== null ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.feedback,
                  selectedOption === currentQuestion.correcta
                    ? styles.correctFeedback
                    : styles.incorrectFeedback,
                ]}
              >
                <Text style={styles.feedbackText}>
                  {selectedOption === currentQuestion.correcta
                    ? '¡Correcto!'
                    : `No es esa. La respuesta correcta es ${String.fromCharCode(
                        65 + currentQuestion.correcta,
                      )}. ${currentQuestion.opciones[currentQuestion.correcta]}`}
                </Text>
              </View>
            ) : null}
            <Pressable
              disabled={selectedOption === null}
              onPress={showNextQuestion}
              style={[
                styles.primaryButton,
                selectedOption === null && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {questionIndex === note.preguntas.length - 1 ? 'Ver puntaje' : 'Siguiente'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <AppNavigation active="quiz" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F5F0',
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  eyebrow: {
    color: '#397B69',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: '#182722',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 22,
  },
  loading: {
    marginTop: 32,
  },
  errorCard: {
    borderRadius: 14,
    backgroundColor: '#FCE9E5',
    padding: 14,
  },
  errorText: {
    color: '#8E3224',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  cardTitle: {
    color: '#22332D',
    fontSize: 21,
    fontWeight: '800',
  },
  bodyText: {
    color: '#5E6A65',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  textLink: {
    alignSelf: 'flex-start',
    color: '#276B57',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
  },
  resultCard: {
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  score: {
    color: '#276B57',
    fontSize: 52,
    fontWeight: '800',
    marginTop: 18,
  },
  resultMessage: {
    color: '#46564F',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 22,
  },
  quizCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  noteTitle: {
    color: '#397B69',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  progressLabel: {
    color: '#68756E',
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E8ECE8',
    marginTop: 8,
    marginBottom: 22,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#397B69',
  },
  question: {
    color: '#22332D',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 27,
    marginBottom: 16,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 50,
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE3DD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionText: {
    color: '#46564F',
    fontSize: 15,
    lineHeight: 21,
  },
  correctOption: {
    borderColor: '#8EC3A2',
    backgroundColor: '#E6F3E9',
  },
  selectedOptionText: {
    color: '#276B57',
    fontWeight: '700',
  },
  incorrectOption: {
    borderColor: '#E9A59A',
    backgroundColor: '#FCE9E5',
  },
  incorrectOptionText: {
    color: '#8E3224',
    fontWeight: '700',
  },
  feedback: {
    borderRadius: 12,
    padding: 13,
    marginTop: 16,
    marginBottom: 14,
  },
  correctFeedback: {
    backgroundColor: '#E6F3E9',
  },
  incorrectFeedback: {
    backgroundColor: '#FCE9E5',
  },
  feedbackText: {
    color: '#34483D',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#276B57',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
