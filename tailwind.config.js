/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          // Fundo da tela: um cinza um pouco mais escuro para dar contraste
          50: '#e2e8f0', 
        },
        // Cartões (antigo branco): agora é um cinza suave, tirando totalmente a agressividade da luz
        white: '#f1f5f9', 
      }
    },
  },
  plugins: [],
};