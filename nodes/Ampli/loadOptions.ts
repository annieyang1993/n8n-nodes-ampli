import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { ampliApiRequest } from './shared/transport';

/** Connected social accounts, labelled "Name (@handle · platform)". */
export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await ampliApiRequest.call(this, 'GET', '/accounts');
	const accounts = (response.accounts as IDataObject[] | undefined) ?? [];
	return accounts.map((account) => {
		const handle = String(account.username ?? '').replace(/^@+/, '');
		const name = String(account.display_name || handle || account.id);
		return {
			name: `${name} (@${handle} · ${String(account.platform)})`,
			value: String(account.id),
		};
	});
}

/** Post templates by name (the generation API takes names, not IDs). */
export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await ampliApiRequest.call(this, 'GET', '/templates', undefined, { limit: 50 });
	const templates = (response.templates as IDataObject[] | undefined) ?? [];
	return templates.map((template) => ({
		name: `${String(template.name)} — ${String(template.look ?? template.format ?? '')}`.replace(
			/ — $/,
			'',
		),
		value: String(template.name),
	}));
}

/** Photo packs and the user's own collections, by name. */
export async function getCollections(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await ampliApiRequest.call(this, 'GET', '/media-collections');
	const collections = (response.collections as IDataObject[] | undefined) ?? [];
	return collections.map((collection) => {
		const origin = collection.source === 'yours' ? 'your collection' : 'Ampli pack';
		const vibe = collection.vibe ? ` — ${String(collection.vibe)}` : '';
		return {
			name: `${String(collection.name)}${vibe} (${origin})`,
			value: String(collection.name),
		};
	});
}

/** The user's own collections only — the ones images can be added to. */
export async function getOwnCollections(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await ampliApiRequest.call(this, 'GET', '/media-collections', undefined, {
		kind: 'yours',
	});
	const collections = (response.collections as IDataObject[] | undefined) ?? [];
	return collections.map((collection) => ({
		name: String(collection.name),
		value: String(collection.id),
	}));
}
