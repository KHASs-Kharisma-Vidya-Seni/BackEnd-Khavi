// Fungsi untuk mendapatkan pesan kesalahan berdasarkan lingkungan
const getErrorMessage = error => {
  return {
    error: process.env.NODE_ENV === "development" ? error.message : "Kesalahan server internal",
  };
};

export default getErrorMessage;
