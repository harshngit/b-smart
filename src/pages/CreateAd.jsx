import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import api from '../lib/api';

const CreateAd = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [ctaLink, setCtaLink] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');

  // Step state: 'upload', 'details', 'review'
  const [step, setStep] = useState('upload');

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep('details');
    } else {
      alert('Please select a video file for ads.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStep('upload');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      formData.append('ctaLink', ctaLink);
      formData.append('ctaText', ctaText);
      formData.append('type', 'ad');

      // Assuming there's an endpoint for creating ads. 
      // If not, we might need to use the posts endpoint with a type or a specific ads endpoint.
      // For now, I'll use a placeholder endpoint or assume '/ads' post.
      // Adjust this based on actual API.
      await api.post('/ads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate('/ads');
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Failed to upload ad. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white pb-24 md:pb-4 flex flex-col">
      {/* Mobile Header (Hidden on Desktop via CSS if needed, but keeping simple as requested) */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => {
            if (step === 'details') setStep('upload');
            else navigate(-1);
          }}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="font-bold text-lg">Create Ad</span>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-300">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/5] max-w-sm border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
              >
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                  <Upload size={40} />
                </div>
                <h3 className="text-xl font-bold mb-2">Upload Video</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-8">
                  Select a vertical video (9:16) for best results
                </p>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 'details' && (
            <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
              {/* Preview */}
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                 <video 
                  src={previewUrl} 
                  className="w-full h-full object-contain"
                  controls
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-6">
                {/* Caption */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white ml-1">Caption</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a catchy caption..."
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none text-base"
                  />
                </div>

                {/* CTA Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white ml-1">Button</label>
                    <select
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="Learn More">Learn More</option>
                      <option value="Shop Now">Shop Now</option>
                      <option value="Sign Up">Sign Up</option>
                      <option value="Install">Install</option>
                      <option value="Watch More">Watch More</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white ml-1">Link URL</label>
                    <input
                      type="url"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="https://"
                      className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          {step === 'details' && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 z-50">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Launch Ad Campaign'
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateAd;
