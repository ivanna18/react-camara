import { getApp } from '@react-native-firebase/app';
import {
  GoogleAIBackend,
  Schema,
  getAI,
  getGenerativeModel,
} from '@react-native-firebase/ai';
import {
  ReactNativeFirebaseAppCheckProvider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from '@react-native-firebase/app-check';
import { Platform } from 'react-native';

export type StudyNote = {
  titulo: string;
  resumen: string;
  conceptos_clave: string[];
  preguntas: {
    pregunta: string;
    opciones: string[];
    correcta: number;
  }[];
};

type EncodedImage = {
  base64: string;
  mimeType: string;
};

const MODEL_NAME = 'gemini-3.5-flash-lite';
const MAX_INLINE_IMAGE_SIZE = 15 * 1024 * 1024;

const questionSchema = Schema.object({
  properties: {
    pregunta: Schema.string(),
    opciones: Schema.array({
      items: Schema.string(),
      minItems: 4,
      maxItems: 4,
    }),
    correcta: Schema.integer({ minimum: 0, maximum: 3 }),
  },
});

const studyNoteSchema = Schema.object({
  properties: {
    titulo: Schema.string(),
    resumen: Schema.string(),
    conceptos_clave: Schema.array({
      items: Schema.string(),
      minItems: 3,
      maxItems: 6,
    }),
    preguntas: Schema.array({
      items: questionSchema,
      minItems: 5,
      maxItems: 5,
    }),
  },
});

const STUDY_NOTE_PROMPT = `Analiza la imagen de apuntes y crea una guía de estudio en español.
Responde únicamente con un objeto JSON válido que siga exactamente el esquema indicado; no incluyas Markdown ni texto fuera del JSON.
Usa solo información que pueda leerse en la imagen. Si algo no se distingue, no inventes datos.
Incluye un título breve, un resumen claro, entre 3 y 6 conceptos clave y exactamente 5 preguntas de opción múltiple.
Cada pregunta debe tener exactamente 4 opciones y el campo "correcta" debe ser el índice (base cero) de la opción correcta.
La estructura debe ser: {"titulo":"","resumen":"","conceptos_clave":[],"preguntas":[{"pregunta":"","opciones":[],"correcta":0}]}.`;

let appCheckInstance: AppCheck | undefined;

function getAppCheckInstance(): AppCheck {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('El análisis con Firebase AI requiere un development build en Android o iOS.');
  }

  if (!appCheckInstance) {
    const app = getApp();
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      },
    });

    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheckInstance;
}

function getStudyNoteModel() {
  const app = getApp();
  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
    appCheck: getAppCheckInstance(),
  });

  return getGenerativeModel(ai, {
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: studyNoteSchema,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStudyQuestion(
  question: unknown,
): question is StudyNote['preguntas'][number] {
  if (
    !isRecord(question) ||
    typeof question.pregunta !== 'string' ||
    !Array.isArray(question.opciones) ||
    question.opciones.length !== 4 ||
    typeof question.correcta !== 'number'
  ) {
    return false;
  }

  return (
    question.opciones.every((option: unknown) => typeof option === 'string') &&
    Number.isInteger(question.correcta) &&
    question.correcta >= 0 &&
    question.correcta < question.opciones.length
  );
}

export function parseStudyNote(responseText: string): StudyNote {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('La respuesta de Gemini no era JSON válido. Inténtalo de nuevo.');
    }
    throw error;
  }

  if (!isRecord(parsed) || typeof parsed.titulo !== 'string' || typeof parsed.resumen !== 'string') {
    throw new Error('La respuesta no siguió el formato esperado. Inténtalo de nuevo.');
  }

  if (!Array.isArray(parsed.conceptos_clave) || !Array.isArray(parsed.preguntas)) {
    throw new Error('La respuesta no siguió el formato esperado. Inténtalo de nuevo.');
  }

  const concepts = parsed.conceptos_clave.filter(
    (concept: unknown): concept is string => typeof concept === 'string',
  );
  const questions = parsed.preguntas.filter(isStudyQuestion);
  if (
    concepts.length !== parsed.conceptos_clave.length ||
    questions.length !== 5 ||
    questions.length !== parsed.preguntas.length
  ) {
    throw new Error('Una o más preguntas no siguieron el formato esperado. Inténtalo de nuevo.');
  }

  return {
    titulo: parsed.titulo,
    resumen: parsed.resumen,
    conceptos_clave: concepts,
    preguntas: questions,
  };
}

export async function generateStudyNote(image: EncodedImage): Promise<StudyNote> {
  if (image.base64.length > MAX_INLINE_IMAGE_SIZE) {
    throw new Error('La imagen es demasiado pesada. Elige una foto más pequeña e inténtalo de nuevo.');
  }

  const appCheck = getAppCheckInstance();
  await getToken(appCheck);
  const model = getStudyNoteModel();
  const result = await model.generateContent([
    STUDY_NOTE_PROMPT,
    {
      type: 'inlineData',
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    },
  ]);

  return parseStudyNote(result.response.text());
}
