import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';
import { compact, toStringArray } from '../../shared/utils';

const showOnlyForMedia = {
	resource: ['media'],
};

/** Files up to this size go inline as base64; larger ones use a presigned PUT. */
const DIRECT_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'video/mp4',
	'video/quicktime',
];

export const mediaProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForMedia,
		},
		options: [
			{
				name: 'Add to Collection',
				value: 'addToCollection',
				action: 'Add images to a collection',
				description: 'Add hosted image URLs to one of your own collections',
			},
			{
				name: 'Create Collection',
				value: 'createCollection',
				action: 'Create a collection',
				description: 'Create one of your own photo collections',
			},
			{
				name: 'Get Many Collections',
				value: 'getAllCollections',
				action: 'Get many collections',
				description: 'List the Ampli photo packs and your own collections',
			},
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file',
				description:
					'Upload an image or video from a binary field and get a hosted URL to post',
			},
		],
		default: 'upload',
	},

	// ── Upload ──
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the file to upload',
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['upload'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. cover.jpg',
				description: 'Overrides the file name from the binary data',
			},
		],
	},

	// ── Add to Collection ──
	{
		displayName: 'Collection Name or ID',
		name: 'collection',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOwnCollections',
		},
		default: '',
		required: true,
		description:
			'One of your own collections. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['addToCollection'],
			},
		},
	},
	{
		displayName: 'Media URLs',
		name: 'mediaUrls',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. https://…/photo-1.jpg, https://…/photo-2.jpg',
		description:
			'Hosted image URLs to add, comma-separated (an array from an expression also works). Duplicates are skipped.',
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['addToCollection'],
			},
		},
	},

	// ── Create Collection ──
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Spring product shots',
		description: 'Name of the new collection',
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['createCollection'],
			},
		},
	},

	// ── Get Many Collections ──
	{
		displayName: 'Kind',
		name: 'kind',
		type: 'options',
		options: [
			{
				name: 'All',
				value: '',
			},
			{
				name: 'Ampli Packs',
				value: 'photos',
			},
			{
				name: 'Yours',
				value: 'yours',
			},
		],
		default: '',
		description: 'Which collections to list',
		displayOptions: {
			show: {
				...showOnlyForMedia,
				operation: ['getAllCollections'],
			},
		},
	},
];

async function uploadBinary(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const additional = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	const contentType = binaryData.mimeType;
	if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported file type "${contentType}". Ampli accepts ${ALLOWED_CONTENT_TYPES.join(', ')}.`,
			{ itemIndex },
		);
	}
	const extension = binaryData.fileExtension ?? contentType.split('/')[1] ?? 'bin';
	const filename =
		(additional.fileName as string | undefined) || binaryData.fileName || `upload.${extension}`;

	if (buffer.length <= DIRECT_UPLOAD_MAX_BYTES) {
		return await ampliApiRequest.call(this, 'POST', '/uploads/direct', {
			filename,
			contentType,
			data: buffer.toString('base64'),
		});
	}

	// Larger files: ask for a presigned PUT, stream the bytes there, then hand
	// back the hosted URL exactly as the direct route would.
	const presigned = await ampliApiRequest.call(this, 'POST', '/uploads', {
		filename,
		contentType,
		sizeBytes: buffer.length,
	});
	const upload = (presigned.upload as IDataObject | undefined) ?? {};
	const put = async (url: string): Promise<void> => {
		const options: IHttpRequestOptions = {
			method: 'PUT',
			url,
			body: buffer,
			headers: { 'Content-Type': contentType, ...((upload.headers as IDataObject) ?? {}) },
		};
		await this.helpers.httpRequest(options);
	};
	try {
		await put(String(upload.url));
	} catch (error) {
		if (!upload.fallbackUrl) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'The upload to Ampli storage failed',
			});
		}
		try {
			await put(String(upload.fallbackUrl));
		} catch (fallbackError) {
			throw new NodeApiError(this.getNode(), fallbackError as JsonObject, {
				message: 'The upload to Ampli storage failed',
			});
		}
	}
	return {
		success: true,
		mediaUrl: presigned.mediaUrl,
		publicUrl: presigned.publicUrl,
		path: presigned.path,
		contentType,
		filename: presigned.filename ?? filename,
		sizeBytes: buffer.length,
	};
}

export async function executeMedia(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'upload') {
		return await uploadBinary.call(this, itemIndex);
	}
	if (operation === 'getAllCollections') {
		const kind = this.getNodeParameter('kind', itemIndex) as string;
		const response = await ampliApiRequest.call(
			this,
			'GET',
			'/media-collections',
			undefined,
			compact({ kind }),
		);
		return (response.collections as IDataObject[] | undefined) ?? [];
	}
	if (operation === 'createCollection') {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const response = await ampliApiRequest.call(this, 'POST', '/media-collections', { name });
		return (response.collection as IDataObject | undefined) ?? response;
	}
	if (operation === 'addToCollection') {
		const collection = this.getNodeParameter('collection', itemIndex) as string;
		const mediaUrls = toStringArray(this.getNodeParameter('mediaUrls', itemIndex));
		if (mediaUrls.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Media URLs must contain at least one URL', {
				itemIndex,
			});
		}
		return await ampliApiRequest.call(this, 'POST', '/media-collections/images', {
			collection,
			mediaUrls,
		});
	}
	return {};
}
