import type { IDataObject } from 'n8n-workflow';
import { sleep as n8nSleep } from 'n8n-workflow';

/**
 * Accepts what n8n users actually pass for a list: a real array (multi-select
 * or an expression), a JSON array string, or comma / newline separated text.
 */
export function toStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
	}
	if (typeof value !== 'string') return [];
	const text = value.trim();
	if (!text) return [];
	if (text.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(text);
			if (Array.isArray(parsed)) return toStringArray(parsed);
		} catch {
			// Not JSON: fall through to the delimiter split.
		}
	}
	return text
		.split(/[\n,]/)
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
}

/** Copy of `obj` without empty values, so optional fields are never sent as ''. */
export function compact(obj: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;
		out[key] = value;
	}
	return out;
}

export async function sleep(ms: number): Promise<void> {
	await n8nSleep(ms);
}
