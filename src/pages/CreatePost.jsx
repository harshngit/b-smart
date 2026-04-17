import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePostModal from '../components/CreatePostModal';

const CreatePostPage = () => {
  const navigate = useNavigate();

  return (
    <CreatePostModal
      isOpen
      onClose={() => navigate(-1)}
      initialType="post"
    />
  );
};

export default CreatePostPage;
