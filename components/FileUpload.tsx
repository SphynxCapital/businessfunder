import React, { useCallback, useState }  from 'react';
import { IconUploadCloud } from './Icons';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, [disabled]);

  const processFile = (files: FileList | null) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      onFileChange(files[0]);
    } else {
      // Basic validation feedback, could be improved with a formal alert
      alert("Please upload a valid PDF file.");
      onFileChange(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    processFile(e.dataTransfer.files);
  }, [onFileChange, disabled]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    processFile(e.target.files);
    e.target.value = ''; // Allow re-uploading the same file
  }, [onFileChange, disabled]);

  return (
    <div className="w-full animate-fadeIn">
      <label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${disabled ? 'bg-slate-700/50 border-slate-600 cursor-not-allowed' : 
                    dragActive ? 'bg-purple-900/40 border-purple-500' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 hover:border-slate-500'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <IconUploadCloud className={`w-12 h-12 mb-4 transition-colors ${disabled ? 'text-slate-500' : dragActive ? 'text-purple-400' : 'text-gray-400'}`} />
          <p className={`mb-2 text-lg font-semibold transition-colors ${disabled ? 'text-slate-500' : dragActive ? 'text-purple-300' : 'text-gray-200'}`}>
            Click to upload or drag and drop
          </p>
          <p className={`text-sm transition-colors ${disabled ? 'text-slate-600' : dragActive ? 'text-purple-400' : 'text-gray-500'}`}>
            Bank Statement (PDF format only)
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
          disabled={disabled}
          aria-label="Upload Bank Statement"
        />
      </label>
    </div>
  );
};

export default FileUpload;
