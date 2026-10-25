import { useEffect, useState } from 'react';
import './model-credits.css';

type ModelCredit = {
  id: string;
  title: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  modifications: string[];
};

const base = import.meta.env.BASE_URL;

function isModelCredit(value: unknown): value is ModelCredit {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.author === 'string'
    && typeof item.authorUrl === 'string'
    && typeof item.sourceUrl === 'string'
    && typeof item.license === 'string'
    && typeof item.licenseUrl === 'string'
    && Array.isArray(item.modifications)
    && item.modifications.every((modification) => typeof modification === 'string');
}

export default function ModelCredits() {
  const [credits, setCredits] = useState<ModelCredit[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`${base}models/licensed/credits.json`, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Credits unavailable');
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data) || !data.every(isModelCredit)) throw new Error('Invalid model credits');
        setCredits(data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(true);
      });
    return () => abort.abort();
  }, []);

  return <details className="model-credits">
    <summary>Model credits</summary>
    {error ? <p className="model-credits-status">Model credits could not be loaded.</p> : !credits ? <p className="model-credits-status" role="status">Loading model credits…</p> : <ul>
      {credits.map((credit) => <li key={credit.id}>
        <span>“{credit.title}” by <a href={credit.authorUrl}>{credit.author}</a>, via <a href={credit.sourceUrl}>Sketchfab</a>. Licensed under <a href={credit.licenseUrl}>{credit.license}</a>.</span>
        {credit.modifications.length > 0 && <span className="model-credits-modifications">Modified: {credit.modifications.join('; ')}.</span>}
      </li>)}
    </ul>}
  </details>;
}
