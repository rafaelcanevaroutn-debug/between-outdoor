import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const scripts = [
  'audit-creative-lab-stress.ts',
  'preview-approved-creative-template.ts',
  'refresh-creative-lab-logos.ts',
  'run-creative-lab-molde-1.ts',
  'run-creative-lab-moldes-2-6.ts',
  'render-chalten-instagram.ts',
]

test('todas las herramientas estáticas usan skill-carruseles y no remotion-skill', () => {
  for (const script of scripts) {
    const source = fs.readFileSync(new URL(`../scripts/${script}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /remotion-skill/u, script)
    assert.match(source, /skill-carruseles/u, script)
  }
})
