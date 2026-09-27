// Build BibTeX entries from verified identifiers only.
//
// Input: a JSON file with an array of { "key": "...", "doi": "..." } or
// { "key": "...", "arxiv": "2503.13657" }. Metadata comes from the Crossref
// REST API (DOIs) or the arXiv API (arXiv ids); nothing is typed by hand.
// Output: BibTeX on stdout, and one line per entry on stderr with the title
// that the service returned, so a person can check each match.
//
// Usage: node research/paper-v2/tools/ids-to-bib.mjs ids.json > new.bib

import { readFileSync } from 'node:fs';

const UA = 'bridge-paper-bib/1.0 (mailto:aryan.kori14@gmail.com)';
const MAX_AUTHORS = 8;

const ACCENTS = {
  á: "\\'a", à: '\\`a', ä: '\\"a', â: '\\^a', ã: '\\~a', å: '\\aa{}', ą: '\\k{a}',
  é: "\\'e", è: '\\`e', ë: '\\"e', ê: '\\^e', ę: '\\k{e}', ě: '\\v{e}',
  í: "\\'i", ì: '\\`i', ï: '\\"i', î: '\\^i',
  ó: "\\'o", ò: '\\`o', ö: '\\"o', ô: '\\^o', õ: '\\~o', ø: '\\o{}', ő: '\\H{o}',
  ú: "\\'u", ù: '\\`u', ü: '\\"u', û: '\\^u', ű: '\\H{u}', ů: '\\r{u}',
  ý: "\\'y", ÿ: '\\"y', ñ: '\\~n', ń: "\\'n", ç: '\\c{c}', ć: "\\'c", č: '\\v{c}',
  š: '\\v{s}', ś: "\\'s", ž: '\\v{z}', ź: "\\'z", ż: '\\.z', ł: '\\l{}', ř: '\\v{r}',
  ğ: '\\u{g}', ş: '\\c{s}', ı: '\\i{}', ß: '\\ss{}', æ: '\\ae{}', œ: '\\oe{}',
  Á: "\\'A", É: "\\'E", Í: "\\'I", Ó: "\\'O", Ú: "\\'U", Ö: '\\"O', Ü: '\\"U', Ä: '\\"A',
  Š: '\\v{S}', Ž: '\\v{Z}', Č: '\\v{C}', Ł: '\\L{}', Ø: '\\O{}', Å: '\\AA{}', Ç: '\\c{C}',
  '–': '--', '—': '---', '‘': "'", '’': "'", '“': '``', '”': "''", '…': '...', ' ': ' ',
};

function latex(text) {
  let out = '';
  for (const ch of String(text ?? '').normalize('NFC')) {
    if (ACCENTS[ch] !== undefined) {
      const v = ACCENTS[ch];
      out += /^[\\]/.test(v) && !/[{}]$/.test(v) ? `{${v}}` : v;
    } else if ('&%#_$'.includes(ch)) out += `\\${ch}`;
    else if (/[\x00-\x7F]/.test(ch)) out += ch;
    else {
      process.stderr.write(`  warning: dropped non-ASCII character U+${ch.codePointAt(0).toString(16)}\n`);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function authorList(names) {
  const shown = names.slice(0, MAX_AUTHORS).map(latex);
  if (names.length > MAX_AUTHORS) shown.push('others');
  return shown.join(' and ');
}

function field(name, value) {
  return value === undefined || value === '' ? '' : `,\n  ${name} = {${value}}`;
}

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 404) throw new Error(`not found: ${url}`);
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(`failed: ${url}`);
}

async function getText(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.text();
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(`failed: ${url}`);
}

async function fromDoi(key, doi) {
  const { message: m } = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  const title = latex((m.title ?? [''])[0]);
  const authors = (m.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name);
  const year = (m['published-print'] ?? m['published-online'] ?? m.issued ?? m.created)['date-parts'][0][0];
  const container = latex((m['container-title'] ?? [''])[0]);
  const pages = m.page ? latex(m.page.replace(/-/g, '--')) : '';
  let type = 'misc';
  let body = `  author = {${authorList(authors)}},\n  title = {{${title}}}`;
  switch (m.type) {
    case 'journal-article':
      type = 'article';
      body += field('journal', container) + field('volume', m.volume) + field('number', m.issue) + field('pages', pages);
      break;
    case 'proceedings-article':
      type = 'inproceedings';
      body += field('booktitle', container) + field('pages', pages) + field('publisher', latex(m.publisher));
      break;
    case 'book-chapter':
      type = 'incollection';
      body += field('booktitle', container) + field('pages', pages) + field('publisher', latex(m.publisher));
      break;
    case 'book':
    case 'monograph':
      type = 'book';
      body += field('publisher', latex(m.publisher));
      break;
    default:
      body += field('howpublished', container) + field('publisher', latex(m.publisher));
  }
  body += field('year', year) + field('doi', doi.toLowerCase());
  process.stderr.write(`${key}\t${doi}\t${(m.title ?? [''])[0]}\n`);
  return `@${type}{${key},\n${body}\n}`;
}

async function fromArxiv(key, id) {
  const xml = await getText(`http://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  const entry = xml.split('<entry>')[1];
  if (!entry) throw new Error(`arXiv id not found: ${id}`);
  const pick = (tag) => (entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) ?? [])[1] ?? '';
  const rawTitle = pick('title').replace(/\s+/g, ' ').trim();
  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((a) => a[1].trim());
  const year = pick('published').slice(0, 4);
  const bareId = id.replace(/v\d+$/, '');
  process.stderr.write(`${key}\tarXiv:${bareId}\t${rawTitle}\n`);
  return `@misc{${key},\n  author = {${authorList(authors)}},\n  title = {{${latex(rawTitle)}}},\n  year = {${year}},\n  eprint = {${bareId}},\n  archiveprefix = {arXiv}\n}`;
}

const items = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = [];
for (const item of items) {
  try {
    out.push(item.doi ? await fromDoi(item.key, item.doi) : await fromArxiv(item.key, item.arxiv));
  } catch (error) {
    process.stderr.write(`ERROR ${item.key}: ${error.message}\n`);
  }
  await new Promise((r) => setTimeout(r, item.doi ? 300 : 3100));
}
process.stdout.write(`${out.join('\n\n')}\n`);
