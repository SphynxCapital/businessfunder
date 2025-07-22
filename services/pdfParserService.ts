
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import DocumentWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = DocumentWorker;

interface ParseProgress {
  loaded: number;
  total: number;
}

export const parsePdf = async (
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  if (onProgress) {
    onProgress({ loaded: 0, total: pdf.numPages });
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => (item as any).str).join(" "); // Type assertion for item.str
    fullText += pageText + "\n\n"; // Add double newline between pages
    if (onProgress) {
      onProgress({ loaded: i, total: pdf.numPages });
    }
  }
  return fullText.trim();
};
