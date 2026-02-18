export function formatValue(value: number, step: number): string {
  if (step < 1) {
    return value.toFixed(1);
  }
  return String(Math.round(value));
}

export function includesSearch(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.trim().toLowerCase());
}

export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid file reader result"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("file reader failed"));
    };
    reader.readAsText(file);
  });
}
