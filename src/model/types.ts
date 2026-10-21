export type EmotionFamily =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface Diary {
  schemaVersion: 1;
  entries: Entry[];
  /** Emotions the user typed in manually. */
  customEmotions: CustomEmotion[];
  /** ISO datetime of the last therapist report export. */
  lastReportExportAt: string | null;
}

export interface Entry {
  /** UUID v4, stable, used for merging. */
  id: string;
  /** ISO datetime of when it happened; editable by the user. */
  createdAt: string;
  /** ISO datetime of the last change; used for merging. */
  updatedAt: string;
  /** Soft delete: the entry is hidden but stays in the document. */
  deletedAt: string | null;
  situation: string;
  /** Emotions at the moment of the situation. */
  emotions: EmotionRating[];
  thoughts: Thought[];
  /** Emotions after the rational response. */
  outcomeEmotions: EmotionRating[];
}

export interface EmotionRating {
  name: string;
  /** 1–100. */
  intensity: number | null;
}

export interface Thought {
  /** UUID v4. */
  id: string;
  /** Automatic thought. */
  text: string;
  /** 0–100 %, belief in the thought before the response. */
  belief: number | null;
  /** Rational response. */
  response: string;
  /** 0–100 %, belief in the response. */
  responseBelief: number | null;
  /** 0–100 %, belief in the thought after the response. */
  beliefAfter: number | null;
}

export interface CustomEmotion {
  name: string;
  family: EmotionFamily | null;
}
