export const LESSON_DOCUMENT_VIEWPORT_CLASS = 'lesson-document-viewport'

interface DocumentRootClassList {
  add(token: string): void
  remove(token: string): void
}

export function activateLessonDocumentViewport(
  classList: DocumentRootClassList,
): () => void {
  classList.add(LESSON_DOCUMENT_VIEWPORT_CLASS)

  return () => {
    classList.remove(LESSON_DOCUMENT_VIEWPORT_CLASS)
  }
}