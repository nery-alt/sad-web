import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Sigla oficial: SEMDCEP. Algumas telas antigas ainda trazem SEMDECP/SEMDEP no texto;
// esta troca corrige na hora de montar o site. Remover quando as telas forem corrigidas na fonte.
const corrigirSigla = (): Plugin => ({
  name: 'corrigir-sigla-semdcep',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('/src/') || !/SEMDECP|SEMDEP\b/.test(code)) return null
    return { code: code.replace(/SEMDECP|SEMDEP\b/g, 'SEMDCEP'), map: null }
  },
})

export default defineConfig({
  plugins: [corrigirSigla(), react(), tailwindcss()],
})
