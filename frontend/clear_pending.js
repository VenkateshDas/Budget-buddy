if (typeof window !== 'undefined') {
  localStorage.removeItem('pendingUpload');
  console.log('Cleared pending upload from localStorage');
}
