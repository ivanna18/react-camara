import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
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
import { listStudyNotes, type SavedStudyNote } from '@/services/study-note-history';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function HistoryScreen() {
  const [notes, setNotes] = useState<SavedStudyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    void listStudyNotes()
      .then((savedNotes) => {
        if (isActive) {
          setNotes(savedNotes);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(`No se pudo cargar el historial: ${errorMessage(loadError)}`);
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
  }, [refreshKey]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>TUS APUNTES</Text>
            <Text style={styles.title}>Historial</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsLoading(true);
              setRefreshKey((currentKey) => currentKey + 1);
            }}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>Actualizar</Text>
          </Pressable>
        </View>

        {isLoading ? <ActivityIndicator color="#276B57" size="large" /> : null}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {!isLoading && !error && notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aún no hay apuntes guardados</Text>
            <Text style={styles.emptyText}>
              Cuando analices una foto, aparecerá aquí para que puedas repasarla después.
            </Text>
            <Link href="/" style={styles.link}>
              Crear mi primer apunte
            </Link>
          </View>
        ) : null}
        {!error
          ? notes.map((note) => (
              <Link
                key={note.id}
                href={{ pathname: '/quiz', params: { noteId: String(note.id) } }}
                asChild
              >
                <Pressable style={styles.noteCard}>
                  <Text style={styles.noteDate}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                  <Text numberOfLines={2} style={styles.noteTitle}>
                    {note.titulo}
                  </Text>
                  <Text numberOfLines={2} style={styles.noteSummary}>
                    {note.resumen}
                  </Text>
                  <Text style={styles.practiceLink}>Practicar quiz →</Text>
                </Pressable>
              </Link>
            ))
          : null}
      </ScrollView>
      <AppNavigation active="history" />
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
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
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
  },
  refreshButton: {
    borderRadius: 12,
    backgroundColor: '#E2EEE7',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshText: {
    color: '#285844',
    fontSize: 13,
    fontWeight: '700',
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
  emptyTitle: {
    color: '#22332D',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyText: {
    color: '#5E6A65',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  link: {
    alignSelf: 'flex-start',
    color: '#276B57',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E5E0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  noteDate: {
    color: '#75817B',
    fontSize: 12,
    fontWeight: '600',
  },
  noteTitle: {
    color: '#22332D',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 6,
  },
  noteSummary: {
    color: '#5E6A65',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  practiceLink: {
    color: '#276B57',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
});
