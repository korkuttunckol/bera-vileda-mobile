import { useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { cn } from '@/shared/utils/cn';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
  'text/csv',
  'text/comma-separated-values',
  'application/csv',
]);

function debugLog(message: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    if (data) {
      console.log(`[ExcelFilePicker] ${message}`, data);
    } else {
      console.log(`[ExcelFilePicker] ${message}`);
    }
  }
}

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

/** Uzantı geçerliyse kabul et — Safari çoğu Excel dosyasında type='' veya octet-stream döner. */
function isAllowedSpreadsheetFile(file: File): boolean {
  if (!hasAllowedExtension(file.name)) return false;

  if (!file.type || file.type === 'application/octet-stream') return true;

  return SPREADSHEET_MIME_TYPES.has(file.type);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pickFileFromList(files: FileList | null | undefined): File | null {
  if (!files || files.length === 0) return null;
  return files.item(0);
}

interface ExcelFilePickerProps {
  mode?: 'immediate' | 'confirm';
  onFileSelect?: (file: File) => void;
  onImport?: (file: File) => void;
  onFileChange?: (file: File | null) => void;
  isLoading?: boolean;
  selectLabel?: string;
  importLabel?: string;
  className?: string;
}

const triggerButtonClass = cn(
  'inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand-gray-200',
  'bg-white px-4 text-[15px] font-semibold text-brand-navy shadow-sm',
  'pointer-events-none select-none',
);

const primaryButtonClass = cn(
  'inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-[15px] font-semibold',
  'bg-brand-navy text-white shadow-sm transition-all duration-150 ease-out',
  'hover:bg-brand-navy-dark active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
);

/**
 * Safari: label+hidden input yerine şeffaf overlay input kullan.
 * Aksi halde Safari yerel "Karşıya Yükle" satırını gösterir ve accept/MIME uyuşmazlığında kilitler.
 */
function FileInputOverlay({
  inputRef,
  isLoading,
  onFilesSelected,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  onFilesSelected: (files: FileList | null | undefined, source: 'change' | 'input') => void;
}) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    debugLog('onChange fired', {
      fileCount: e.target.files?.length ?? 0,
      firstFile: e.target.files?.item(0)?.name,
      firstType: e.target.files?.item(0)?.type,
    });
    onFilesSelected(e.target.files, 'change');
  };

  const handleInput = (): void => {
    const input = inputRef.current;
    debugLog('onInput fired', {
      fileCount: input?.files?.length ?? 0,
      firstFile: input?.files?.item(0)?.name,
      firstType: input?.files?.item(0)?.type,
    });
    onFilesSelected(input?.files ?? null, 'input');
  };

  return (
    <input
      ref={inputRef}
      type="file"
      multiple={false}
      onChange={handleChange}
      onInput={handleInput}
      aria-label="Excel dosyası seç"
      tabIndex={-1}
      className={cn(
        'absolute inset-0 z-20 h-full w-full cursor-pointer',
        'opacity-[0.001]',
        '[&::-webkit-file-upload-button]:hidden',
        isLoading && 'pointer-events-none',
      )}
      style={{ fontSize: 0 }}
    />
  );
}

export function ExcelFilePicker({
  mode = 'immediate',
  onFileSelect,
  onImport,
  onFileChange,
  isLoading = false,
  selectLabel = 'Excel Dosyası Seç',
  importLabel = 'İçe Aktar',
  className,
}: ExcelFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProcessedKeyRef = useRef<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('—');

  const updateSelectedFile = (file: File | null): void => {
    debugLog('state update', {
      selectedFile: file?.name ?? null,
      size: file?.size,
      type: file?.type,
    });
    setSelectedFile(file);
    onFileChange?.(file);
  };

  const processFile = (file: File | null, source: string): void => {
    setLastEvent(source);
    setSelectionError(null);

    if (!file) {
      debugLog('processFile: no file', { source });
      return;
    }

    debugLog('processFile: received', {
      source,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const fileKey = `${file.name}|${String(file.size)}|${String(file.lastModified)}`;
    if (lastProcessedKeyRef.current === fileKey) {
      debugLog('processFile: skipped duplicate event', { source });
      return;
    }
    lastProcessedKeyRef.current = fileKey;

    if (!isAllowedSpreadsheetFile(file)) {
      debugLog('processFile: rejected by validation', { name: file.name, type: file.type });
      setSelectionError('Yalnızca .xlsx, .xls veya .csv dosyaları desteklenir.');
      updateSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (mode === 'immediate') {
      onFileSelect?.(file);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    updateSelectedFile(file);
  };

  const handleFilesSelected = (
    files: FileList | null | undefined,
    source: 'change' | 'input',
  ): void => {
    processFile(pickFileFromList(files), source);
  };

  const handleImportClick = (): void => {
    debugLog('import click', { hasFile: Boolean(selectedFile), name: selectedFile?.name });
    if (selectedFile) onImport?.(selectedFile);
  };

  const handleClearSelection = (): void => {
    lastProcessedKeyRef.current = '';
    updateSelectedFile(null);
    setSelectionError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isLoading) return;
    debugLog('drop fired', { fileCount: e.dataTransfer.files.length });
    processFile(pickFileFromList(e.dataTransfer.files), 'drop');
  };

  return (
    <div className={cn('space-y-3', className)}>
      {mode === 'confirm' && selectedFile ? (
        <div className="rounded-xl border border-brand-gray-200 bg-brand-gray-50/80 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-navy">{selectedFile.name}</p>
              <p className="mt-0.5 text-xs text-brand-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={isLoading}
            className="mt-3 text-xs font-semibold text-brand-navy hover:underline disabled:opacity-50"
          >
            Dosyayı değiştir
          </button>
        </div>
      ) : null}

      {mode === 'confirm' ? (
        <>
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                isLoading && 'pointer-events-none opacity-50',
                isDragOver
                  ? 'border-brand-navy/40 bg-brand-navy/5'
                  : 'border-brand-gray-200 bg-white',
              )}
            >
              <FileInputOverlay
                inputRef={inputRef}
                isLoading={isLoading}
                onFilesSelected={handleFilesSelected}
              />
              <div className={cn(triggerButtonClass, 'border-0 shadow-none')}>
                {selectLabel}
              </div>
              <p className="pointer-events-none pb-3 text-center text-[11px] text-brand-gray-400">
                veya dosyayı buraya sürükleyip bırakın
              </p>
            </div>
          ) : (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={isLoading}
              onClick={handleImportClick}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  İçe aktarılıyor…
                </span>
              ) : (
                importLabel
              )}
            </button>
          )}
        </>
      ) : (
        <div
          className={cn(
            'relative overflow-hidden rounded-xl',
            isLoading && 'pointer-events-none opacity-50',
          )}
        >
          <FileInputOverlay
            inputRef={inputRef}
            isLoading={isLoading}
            onFilesSelected={handleFilesSelected}
          />
          <div className={triggerButtonClass}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Yükleniyor…
              </span>
            ) : (
              selectLabel
            )}
          </div>
        </div>
      )}

      {selectionError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{selectionError}</p>
      ) : null}

      {import.meta.env.DEV ? (
        <p className="rounded-lg bg-brand-gray-100 px-3 py-2 font-mono text-[10px] leading-relaxed text-brand-gray-600">
          dev · event: {lastEvent} · state: {selectedFile?.name ?? 'null'}
        </p>
      ) : null}

      <p className="text-center text-xs text-brand-gray-400">
        .xlsx, .xls veya .csv dosyaları desteklenir
      </p>
    </div>
  );
}
