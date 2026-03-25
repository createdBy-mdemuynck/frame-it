import React from 'react';
import '../styles.css';
import UploadForm from '../components/UploadForm';

export default function Home(){
  return (
    <main style={{paddingTop:24}}>
      <UploadForm />
    </main>
  );
}
