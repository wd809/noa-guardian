import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Carga e indexación del corpus legal verificado (porte de loadCorpus del
 * gateway legado, contrato §3): solo piezas con `vigencia_verificada` y
 * `titulo` en su bloque de metadatos se usan para responder. El índice vive
 * en memoria; nada se persiste y las preguntas no se guardan.
 */

export interface CorpusDoc {
  file: string;
  titulo: string;
  fuente: string;
  jurisdiccion: string;
  vigencia: string;
  releasePoint: string;
  companion: boolean;
}

export interface CorpusChunk {
  doc: CorpusDoc;
  heading: string;
  seccion: string | null;
  text: string;
  normHeading: string;
  normText: string;
}

export interface Corpus {
  docs: CorpusDoc[];
  chunks: CorpusChunk[];
  textIndex: string;
  loadedAt: string | null;
  dir: string;
  error?: string;
}

export function normalizeText(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFrontMatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of raw.slice(3, end).split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/i);
    if (m) meta[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return { meta, body: raw.slice(end + 4) };
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkMd(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

function sectionLabel(heading: string): string | null {
  const m = heading.match(/(§\s*[0-9][0-9A-Za-z.\-]*|Section\s+[0-9][0-9A-Za-z.\-]*)/i);
  return m ? m[1].replace(/\s+/g, ' ').replace(/\.+$/, '').trim() : null;
}

export function cleanExcerpt(text: string, max = 640): string {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastDot = cut.lastIndexOf('. ');
  return (lastDot > max * 0.5 ? cut.slice(0, lastDot + 1) : cut) + ' […]';
}

export function loadCorpusFromDir(corpusDir: string): Corpus {
  const docs: CorpusDoc[] = [];
  const chunks: CorpusChunk[] = [];
  for (const file of walkMd(corpusDir)) {
    const raw = readFileSync(file, 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    // Contrato §3: sin vigencia verificada, la pieza NO se usa.
    if (!meta.vigencia_verificada || !meta.titulo) continue;
    const doc: CorpusDoc = {
      file: relative(corpusDir, file),
      titulo: meta.titulo,
      fuente: meta.fuente || '',
      jurisdiccion: meta.jurisdiccion || '',
      vigencia: meta.vigencia_verificada,
      releasePoint: meta.release_point || '',
      companion:
        /compañero/i.test(body.slice(0, 200)) || Boolean(meta.archivo_fuente),
    };
    docs.push(doc);
    let heading = meta.titulo;
    let buf: string[] = [];
    const flush = () => {
      const text = buf.join('\n').trim();
      if (text.length < 40) return;
      chunks.push({
        doc,
        heading,
        seccion: sectionLabel(heading),
        text,
        normHeading: normalizeText(heading),
        normText: normalizeText(text),
      });
    };
    for (const line of body.split('\n')) {
      const h = line.match(/^#{1,2}\s+(.+)$/);
      if (h) {
        flush();
        heading = h[1].trim();
        buf = [];
      } else buf.push(line);
    }
    flush();
  }
  const textIndex = chunks
    .map((c) => `${c.normHeading} ${c.normText}`)
    .join('\n');
  return {
    docs,
    chunks,
    textIndex,
    loadedAt: new Date().toISOString(),
    dir: corpusDir,
  };
}

/** El corpus llega por volumen Docker (/corpus), por CORPUS_DIR, o relativo
 * al repo (desarrollo local), como en el gateway legado. */
export function resolveCorpusDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.CORPUS_DIR,
    '/corpus',
    join(here, '..', '..', '..', '..', 'corpus'),
    join(here, '..', '..', '..', 'corpus'),
  ].filter((c): c is string => Boolean(c));
  return candidates.find((d) => existsSync(d)) || candidates[0];
}

@Injectable()
export class CorpusService implements OnModuleInit {
  private readonly logger = new Logger('Corpus');
  private corpus: Corpus = {
    docs: [],
    chunks: [],
    textIndex: '',
    loadedAt: null,
    dir: '',
  };

  onModuleInit(): void {
    const dir = resolveCorpusDir();
    try {
      this.corpus = loadCorpusFromDir(dir);
      this.logger.log(
        `corpus cargado: ${this.corpus.docs.length} piezas, ${this.corpus.chunks.length} fragmentos (${dir})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.corpus = {
        docs: [],
        chunks: [],
        textIndex: '',
        loadedAt: null,
        dir,
        error: message,
      };
      this.logger.error(`ERROR cargando el corpus en ${dir}: ${message}`);
    }
  }

  get(): Corpus {
    return this.corpus;
  }

  status(): {
    documents: number;
    chunks: number;
    loadedAt: string | null;
    dir: string;
    error?: string;
  } {
    const { docs, chunks, loadedAt, dir, error } = this.corpus;
    return {
      documents: docs.length,
      chunks: chunks.length,
      loadedAt,
      dir,
      ...(error ? { error } : {}),
    };
  }
}
