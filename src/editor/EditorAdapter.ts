export interface EditorDocument {
  text: string
  cursor: { line: number; column: number }
  tabSize: number
  language: string
}
export type ChangeEvent = { document: string; userEvent?: string; insertedLength: number }
export interface EditorAdapter {
  loadDocument(input: EditorDocument): void
  getDocument(): string
  focus(): void
  reset(): void
  setReadOnly(value: boolean): void
  onDocumentChange(listener: (event: ChangeEvent) => void): () => void
}
