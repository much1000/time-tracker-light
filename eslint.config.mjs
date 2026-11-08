import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Generierte shadcn/ui-Komponenten werden nicht angepasst.
    files: ['src/components/ui/**'],
    rules: { 'react-hooks/purity': 'off' },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
]

export default eslintConfig
