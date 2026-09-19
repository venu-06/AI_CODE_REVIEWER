import { useRef, useState } from 'react';
import { Upload, FileCode, AlertCircle, X } from 'lucide-react';

const EXTENSION_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
};

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export default function FileUploader({
  filename,
  onFileSelect,
  onClearFile,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');

  const processFile = (file) => {
    setUploadError('');
    if (!file) return;

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 1 MB limit.`
      );
      return;
    }

    // Extension validation
    const parts = file.name.split('.');
    if (parts.length < 2) {
      setUploadError('Unsupported file format. Please upload a source code file.');
      return;
    }

    const ext = parts.pop().toLowerCase();
    const inferredLanguage = EXTENSION_MAP[ext];

    if (!inferredLanguage) {
      setUploadError(
        `Unsupported extension .${ext}. Supported: .js, .ts, .py, .java, .c, .cpp, .cs, .go, .rs, .php, .rb, .swift, .kt, .sql, .html, .css`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (typeof content === 'string') {
        onFileSelect({
          code: content,
          filename: file.name,
          inferredLanguage,
        });
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-uploader-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        className="file-input-hidden"
        onChange={handleInputChange}
        disabled={disabled}
        accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.sql,.html,.css"
      />

      <div className="file-uploader-actions">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-toolbar"
          disabled={disabled}
          title="Upload source file (max 1 MB)"
        >
          <Upload size={13} className="icon-mr" />
          Upload
        </button>

        {filename && (
          <span className="file-badge">
            <FileCode size={12} className="icon-mr text-accent" />
            <span className="file-name" title={filename}>
              {filename}
            </span>
            <button
              type="button"
              onClick={onClearFile}
              className="file-remove-btn"
              title="Remove file"
              disabled={disabled}
            >
              <X size={11} />
            </button>
          </span>
        )}
      </div>

      {uploadError && (
        <div className="alert alert-error alert-compact" role="alert">
          <AlertCircle size={13} className="alert-icon" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
