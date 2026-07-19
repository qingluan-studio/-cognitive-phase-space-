import { DataPacket } from '../shared/types';

export interface Posting {
  term: string;
  docId: string;
  positions: number[];
  tf: number;
}

export interface Index {
  terms: string[];
  documents: string[];
  size: number;
}

export class DocumentIndexing {
  private _indexes: Index[] = [];
  private _postings: Map<string, Posting[]> = new Map();
  private _counter: number = 0;
  private _indexType: string = 'inverted';
  private _lastIndex: Index | null = null;

  get indexes(): Index[] {
    return this._indexes;
  }

  get postings(): Map<string, Posting[]> {
    return this._postings;
  }

  get indexType(): string {
    return this._indexType;
  }

  buildIndex(documents: { id: string; content: string }[]): Index {
    const terms = new Set<string>();
    const docIds = documents.map(d => d.id);
    this._postings.clear();
    for (const doc of documents) {
      const words = doc.content.toLowerCase().split(/\s+/);
      const termPositions = new Map<string, number[]>();
      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:'"]/g, '');
        if (word.length > 0) {
          terms.add(word);
          if (!termPositions.has(word)) {
            termPositions.set(word, []);
          }
          termPositions.get(word)!.push(i);
        }
      }
      for (const [term, positions] of termPositions) {
        if (!this._postings.has(term)) {
          this._postings.set(term, []);
        }
        this._postings.get(term)!.push({
          term,
          docId: doc.id,
          positions,
          tf: positions.length
        });
      }
    }
    const index: Index = {
      terms: Array.from(terms),
      documents: docIds,
      size: terms.size
    };
    this._lastIndex = index;
    this._indexes.push(index);
    return index;
  }

  addDocument(index: Index, doc: { id: string; content: string }): Index {
    const words = doc.content.toLowerCase().split(/\s+/);
    const terms = new Set(index.terms);
    const docs = new Set(index.documents);
    docs.add(doc.id);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]/g, '');
      if (word.length > 0) {
        terms.add(word);
        if (!this._postings.has(word)) {
          this._postings.set(word, []);
        }
        const existing = this._postings.get(word)!.find(p => p.docId === doc.id);
        if (existing) {
          existing.positions.push(i);
          existing.tf++;
        } else {
          this._postings.get(word)!.push({
            term: word,
            docId: doc.id,
            positions: [i],
            tf: 1
          });
        }
      }
    }
    const updated: Index = {
      terms: Array.from(terms),
      documents: Array.from(docs),
      size: terms.size
    };
    this._lastIndex = updated;
    return updated;
  }

  removeDocument(index: Index, docId: string): Index {
    const docs = index.documents.filter(d => d !== docId);
    const termsToRemove: string[] = [];
    for (const [term, postList] of this._postings) {
      const filtered = postList.filter(p => p.docId !== docId);
      if (filtered.length === 0) {
        termsToRemove.push(term);
      } else {
        this._postings.set(term, filtered);
      }
    }
    for (const term of termsToRemove) {
      this._postings.delete(term);
    }
    const terms = index.terms.filter(t => !termsToRemove.includes(t));
    const updated: Index = {
      terms,
      documents: docs,
      size: terms.length
    };
    this._lastIndex = updated;
    return updated;
  }

  updateDocument(index: Index, doc: { id: string; content: string }): Index {
    let temp = this.removeDocument(index, doc.id);
    temp = this.addDocument(temp, doc);
    return temp;
  }

  invertedIndex(documents: { id: string; content: string }[]): Map<string, string[]> {
    const inverted = new Map<string, string[]>();
    for (const doc of documents) {
      const words = new Set(
        doc.content.toLowerCase()
          .split(/\s+/)
          .map(w => w.replace(/[.,!?;:'"]/g, ''))
          .filter(w => w.length > 0)
      );
      for (const word of words) {
        if (!inverted.has(word)) {
          inverted.set(word, []);
        }
        inverted.get(word)!.push(doc.id);
      }
    }
    this._indexType = 'inverted';
    return inverted;
  }

  forwardIndex(documents: { id: string; content: string }[]): Map<string, string[]> {
    const forward = new Map<string, string[]>();
    for (const doc of documents) {
      const words = doc.content.toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[.,!?;:'"]/g, ''))
        .filter(w => w.length > 0);
      forward.set(doc.id, words);
    }
    this._indexType = 'forward';
    return forward;
  }

  positionalIndex(documents: { id: string; content: string }[]): Map<string, { docId: string; positions: number[] }[]> {
    const positional = new Map<string, { docId: string; positions: number[] }[]>();
    for (const doc of documents) {
      const words = doc.content.toLowerCase().split(/\s+/);
      const termPositions = new Map<string, number[]>();
      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:'"]/g, '');
        if (word.length > 0) {
          if (!termPositions.has(word)) {
            termPositions.set(word, []);
          }
          termPositions.get(word)!.push(i);
        }
      }
      for (const [term, positions] of termPositions) {
        if (!positional.has(term)) {
          positional.set(term, []);
        }
        positional.get(term)!.push({ docId: doc.id, positions });
      }
    }
    this._indexType = 'positional';
    return positional;
  }

  ngramIndex(documents: { id: string; content: string }[], n: number = 3): Map<string, string[]> {
    const ngramIdx = new Map<string, string[]>();
    for (const doc of documents) {
      const text = doc.content.toLowerCase();
      const grams = new Set<string>();
      for (let i = 0; i <= text.length - n; i++) {
        grams.add(text.substring(i, i + n));
      }
      for (const gram of grams) {
        if (!ngramIdx.has(gram)) {
          ngramIdx.set(gram, []);
        }
        ngramIdx.get(gram)!.push(doc.id);
      }
    }
    this._indexType = 'ngram';
    return ngramIdx;
  }

  compressIndex(index: Index, method: string = 'delta'): Index {
    this._indexType = `compressed-${method}`;
    return index;
  }

  vocabulary(index: Index): string[] {
    return index.terms;
  }

  postingList(index: Index, term: string): Posting[] {
    return this._postings.get(term.toLowerCase()) || [];
  }

  documentFrequency(index: Index, term: string): number {
    const postings = this._postings.get(term.toLowerCase());
    return postings ? postings.length : 0;
  }

  collectionFrequency(index: Index, term: string): number {
    const postings = this._postings.get(term.toLowerCase());
    if (!postings) return 0;
    return postings.reduce((sum, p) => sum + p.tf, 0);
  }

  indexSize(index: Index): number {
    return index.size;
  }

  toPacket(): DataPacket<Index> {
    const result = this._lastIndex || { terms: [], documents: [], size: 0 };
    this._counter++;
    return {
      id: `index-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'indexing'],
        priority: 1,
        phase: 'indexing'
      }
    };
  }

  reset(): void {
    this._indexes = [];
    this._postings.clear();
    this._counter = 0;
    this._indexType = 'inverted';
    this._lastIndex = null;
  }
}
