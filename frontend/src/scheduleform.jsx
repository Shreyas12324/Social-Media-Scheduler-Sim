import React, { useState } from 'react';
import { Image, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import './scheduleform.css';

const ScheduleForm = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Uploading...');

    const formData = new FormData();
    formData.append('text', text);
    formData.append('image', image);
    const utcDate = new Date(scheduleTime).toISOString();
    formData.append('scheduleTime', utcDate);

    try {
      const response = await fetch(`${API_BASE_URL}/schedule`, {
        method: 'POST',
        body: formData,
      });
      setStatus(response.ok ? 'Post scheduled successfully!' : 'Failed to schedule post');
    } catch (error) {
      console.error(error);
      setStatus('Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container">
      <div className="form-box">
        <form onSubmit={handleSubmit}>
          <label>Post Content</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={280}
            required
          />
          <div className="char-count">{text.length}/280</div>

          <label>Upload Image</label>
          <div className="media-upload">
            <input 
              type="file" 
              id="image-upload" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: 'none' }} 
            />
            <label htmlFor="image-upload" className="upload-box">
              {!preview ? (
                <div>
                  <Image size={32} />
                  <p>Click to upload an image</p>
                </div>
              ) : (
                <div className="preview-box">
                  <img src={preview} alt="Preview" />
                  <button onClick={() => { setPreview(null); setImage(null); }} className="remove-btn">✕</button>
                </div>
              )}
            </label>
          </div>

          <label>Schedule Time</label>
          <div className="time-picker">
            <Clock size={18} />
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : (<><Send size={18} /> Schedule Post</>)}
          </button>

          {status && (
            <div className={`status ${status?.toLowerCase().includes('success') ? 'success' : 'error'}`}>
              {status?.toLowerCase().includes('success') ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{status}</span>
            </div>
          )}
        </form>
      </div>


    </div>
  );
};

export default ScheduleForm;