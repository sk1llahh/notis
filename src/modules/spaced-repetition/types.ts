export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewCardDTO {
  id: string; // UserQuestionReview.id
  topicId: string;
  topicTitle: string;
  front: string;
  back: string;
  codeSnippet?: string;
  repetitions: number;
  interval: number;
  easinessFactor: number;
}

export interface CardReviewResultDTO {
  cardId: string;
  nextReviewAt: Date;
  interval: number;
  xpEarned: number;
}
