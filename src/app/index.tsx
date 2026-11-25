import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AppNavigation from '@/components/AppNavigation';
import {
  generateStudyNote,
  type StudyNote,
} from '@/services/study-notes';
import { saveStudyNote } from '@/services/study-note-history';

type SelectedPhoto = {
  uri: string;
  base64: string | null;
  mimeType: string;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  base64: true,
  quality: 0.8,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function HomeScreen() {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [note, setNote] = useState<StudyNote | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const selectPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    setScreenError(null);

    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setScreenError('Necesitamos permiso para usar la cámara y tomar una foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      }

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        base64: asset.base64 ?? null,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      setNote(null);
      setSavedNoteId(null);
    } catch (error) {
      setScreenError(
        `No se pudo abrir ${source === 'camera' ? 'la cámara' : 'la galería'}: ${errorMessage(error)}`,
      );
    }
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!photo?.base64) {
      setScreenError('No se pudo leer la imagen. Elige otra foto e inténtalo de nuevo.');
      return;
    }

    setIsGenerating(true);
    setScreenError(null);
    setNote(null);
    try {
      const generatedNote = await generateStudyNote({
        base64: photo.base64,
        mimeType: photo.mimeType,
      });
      setNote(generatedNote);
      try {
        const savedNote = await saveStudyNote(generatedNote);
        setSavedNoteId(savedNote.id);
      } catch (error) {
        setScreenError(
          `El apunte se generó, pero no se pudo guardar en el historial: ${errorMessage(error)}`,
        );
      }
    } catch (error) {
      setScreenError(`No pudimos analizar el apunte: ${errorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [photo]);

  const controlsDisabled = isGenerating;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ESTUDIO INTELIGENTE</Text>
          <Text style={styles.title}>FotoApuntes</Text>
          <Text style={styles.subtitle}>
            Convierte una foto de tus apuntes en un resumen y preguntas para repasar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Elige una foto</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPress={() => void selectPhoto('camera')}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                controlsDisabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Tomar foto</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={controlsDisabled}
              onPress={() => void selectPhoto('gallery')}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                controlsDisabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Elegir de galería</Text>
            </Pressable>
          </View>

          <View style={styles.previewCard}>
            {photo ? (
              <>
                <Image source={{ uri: photo.uri }} style={styles.preview} />
                <Text style={styles.photoCaption}>Vista previa del apunte</Text>
              </>
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyPreviewTitle}>Tu apunte aparecerá aquí</Text>
                <Text style={styles.emptyPreviewText}>
                  Toma una foto clara o selecciónala de tu galería.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Genera tu material de estudio</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!photo?.base64 || controlsDisabled}
            onPress={() => void analyzePhoto()}
            style={({ pressed }) => [
              styles.analyzeButton,
              pressed && styles.pressed,
              (!photo?.base64 || controlsDisabled) && styles.disabledButton,
            ]}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analizar apunte</Text>
            )}
          </Pressable>
          {isGenerating ? (
            <Text style={styles.loadingText}>Leyendo tus apuntes y creando preguntas…</Text>
          ) : null}
        </View>

        {screenError ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        {note ? (
          <View style={styles.resultSection}>
            <Text style={styles.eyebrow}>TU GUÍA DE REPASO</Text>
            <Text style={styles.resultTitle}>{note.titulo}</Text>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <Text style={styles.bodyText}>{note.resumen}</Text>

            <Text style={styles.sectionTitle}>Conceptos clave</Text>
            <View style={styles.conceptList}>
              {note.conceptos_clave.map((concept, index) => (
                <View key={`${concept}-${index}`} style={styles.conceptChip}>
                  <Text style={styles.conceptText}>{concept}</Text>
                </View>
              ))}
            </View>
            {savedNoteId !== null ? (
              <Link
                href={{ pathname: '/quiz', params: { noteId: String(savedNoteId) } }}
                asChild
              >
                <Pressable style={styles.quizLink}>
                  <Text style={styles.quizLinkText}>Practicar con este apunte</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <AppNavigation active="summary" />
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
    paddingTop: 16,
    paddingBottom: 44,
  },
  header: {
    marginBottom: 28,
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
  subtitle: {
    color: '#5E6A65',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: '#22332D',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#276B57',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CAD5CE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#29473C',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  disabledButton: {
    opacity: 0.48,
  },
  previewCard: {
    overflow: 'hidden',
    minHeight: 210,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE3DD',
    backgroundColor: '#FFFFFF',
  },
  preview: {
    width: '100%',
    height: 260,
    backgroundColor: '#E8ECE8',
  },
  photoCaption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#5E6A65',
    fontSize: 13,
  },
  emptyPreview: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyPreviewTitle: {
    color: '#29473C',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyPreviewText: {
    color: '#75817B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  analyzeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#1C332B',
    paddingHorizontal: 16,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: '#5E6A65',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  errorCard: {
    borderRadius: 14,
    backgroundColor: '#FCE9E5',
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#8E3224',
    fontSize: 14,
    lineHeight: 20,
  },
  resultSection: {
    borderTopWidth: 1,
    borderTopColor: '#DDE3DD',
    paddingTop: 22,
  },
  resultTitle: {
    color: '#182722',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 22,
  },
  bodyText: {
    color: '#46564F',
    fontSize: 15,
    lineHeight: 23,
    marginTop: -4,
    marginBottom: 22,
  },
  conceptList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2,
    marginBottom: 22,
  },
  conceptChip: {
    borderRadius: 999,
    backgroundColor: '#E2EEE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  conceptText: {
    color: '#285844',
    fontSize: 13,
    fontWeight: '600',
  },
  quizLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#276B57',
    paddingHorizontal: 14,
  },
  quizLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
