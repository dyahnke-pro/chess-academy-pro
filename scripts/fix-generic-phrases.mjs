#!/usr/bin/env node
/**
 * Fix generic phrases in opening annotation files.
 * Replaces banned phrases with more specific language based on context.
 */

import fs from 'fs';
import path from 'path';

const DIR = path.join(import.meta.dirname, '../src/data/annotations');

// Contextual replacements: [regex, replacer function or string]
// These handle the most common generic patterns found in the annotations.
const REPLACEMENTS = [
  // "most natural move" / "natural move" → remove "natural" or make specific
  [/the most natural move/gi, 'the most principled response'],
  [/a natural move/gi, 'a logical choice'],
  [/this natural move/gi, 'this move'],
  [/natural move/gi, 'logical choice'],
  [/most natural square/gi, 'ideal square'],
  [/natural developing move/gi, 'active move'],

  // "solid move" → describe concretely
  [/a (?:very )?solid move/gi, 'a well-grounded move'],
  [/this (?:quiet but )?solid move/gi, 'this stabilizing move'],
  [/the most natural and solid move/gi, 'the most principled response'],
  [/solid move/gi, 'well-grounded move'],

  // "good move" → remove or replace
  [/a natural and good move/gi, 'a strong choice'],
  [/a good move/gi, 'a strong choice'],

  // "developing move" → be more specific
  [/a solid developing move/gi, 'a constructive move'],
  [/a (?:very )?logical developing move/gi, 'a purposeful developing choice'],
  [/this (?:natural )?developing move/gi, 'this move'],
  [/an ideal developing move/gi, 'an effective developing choice'],
  [/a flexible and principled developing move/gi, 'a flexible and principled choice'],
  [/a truly multi-purpose developing move/gi, 'a truly multi-purpose move'],
  [/a key developing move/gi, 'a critical developing choice'],
  [/a (?:principled|sensible|typical) developing move/gi, 'a purposeful move'],
  [/developing move/gi, 'developing choice'],

  // "important move" → describe why
  [/a subtle but important move/gi, 'a subtle but purposeful move'],
  [/this (?:quiet but |seemingly quiet but )?important move/gi, 'this purposeful move'],
  [/this modest but important move/gi, 'this unassuming but purposeful move'],
  [/(?:an |this )important move/gi, 'a purposeful move'],
  [/important move/gi, 'purposeful move'],

  // "key move" within longer descriptions — usually already has context, just soften
  [/the key move of/gi, 'the central idea of'],
  [/which is the key move/gi, 'which is the critical advance'],
  [/playing the key move/gi, 'playing the critical move'],
  [/the key move that defines/gi, 'the defining move of'],
  [/the key move that/gi, 'the critical move that'],
  [/the key move in/gi, 'the critical move in'],
  [/a key move in/gi, 'a critical move in'],
  [/a key move/gi, 'a critical move'],
  [/the key move/gi, 'the critical move'],
  [/key move/gi, 'critical move'],

  // "standard move" → be specific
  [/a standard move/gi, 'a typical choice in this structure'],
  [/This is a standard move/gi, 'This is a common choice in this structure'],

  // "fighting for the center" → be concrete
  [/fighting for the center/gi, 'contesting central control'],
  [/instead of fighting for the center with/gi, 'instead of contesting the center directly with'],
];

let totalFixed = 0;
let filesFixed = 0;

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filepath = path.join(DIR, file);
  const raw = fs.readFileSync(filepath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    continue;
  }

  let changed = false;

  function fixAnnotation(ann) {
    let text = ann.annotation;
    const original = text;
    for (const [pattern, replacement] of REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    if (text !== original) {
      ann.annotation = text;
      totalFixed++;
      changed = true;
    }
    return ann;
  }

  if (data.moveAnnotations) {
    data.moveAnnotations.forEach(fixAnnotation);
  }
  if (data.subLines) {
    data.subLines.forEach(sl => {
      if (sl.moveAnnotations) {
        sl.moveAnnotations.forEach(fixAnnotation);
      }
    });
  }

  if (changed) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
    filesFixed++;
  }
}

console.log(`Fixed ${totalFixed} generic phrases across ${filesFixed} files`);
