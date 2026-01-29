import React, { useState, useRef } from 'react';
import { Image, Video, X } from 'lucide-react';

const CreatePostModal = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop logic here
    console.log('Files dropped:', e.dataTransfer.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4">
      {/* Close button for the modal overlay */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-200"
      >
        <X size={24} />
      </button>

      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden flex flex-col h-[70vh] max-h-[600px] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="border-b border-gray-200 py-3 text-center relative">
          <h2 className="font-semibold text-base">Create new post</h2>
        </div>

        {/* Content */}
        <div
          className={`flex-1 flex flex-col items-center justify-center p-8 transition-colors ${isDragging ? 'bg-blue-50' : 'bg-white'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative mb-4">
            {/* Combined Icon Representation */}
            <div className="relative">
              <Image size={64} className="text-gray-800 rotate-[-6deg] translate-x-[-10px]" strokeWidth={1} />
              <Video size={64} className="text-gray-800 absolute top-0 left-0 rotate-[6deg] translate-x-[10px] bg-white rounded-lg" strokeWidth={1} />
            </div>
          </div>

          <h3 className="text-xl font-light mb-6 text-gray-800">Drag photos and videos here</h3>

          <button
            onClick={handleButtonClick}
            className="bg-[#0095f6] hover:bg-[#1877f2] text-white px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
          >
            Select From Computer
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*,video/*"
          />
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
