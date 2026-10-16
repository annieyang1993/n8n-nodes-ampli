import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://www.useampli.com/api/v1';

type ErrorWithBody = {
	message?: string;
	response?: { body?: unknown };
	cause?: { response?: { body?: unknown } };
};

/** Ampli's own error text (`{ success: false, error }`), when the response carried one. */
function ampliErrorMessage(error: unknown): string | undefined {
	const err = error as ErrorWithBody;
	const body = (err.response?.body ?? err.cause?.response?.body) as
		| { error?: unknown; message?: unknown }
		| undefined;
	if (body && typeof body === 'object') {
		if (typeof body.error === 'string' && body.error) return body.error;
		if (typeof body.message === 'string' && body.message) return body.message;
	}
	return undefined;
}

/**
 * One authenticated call to the Ampli v1 API. The base URL comes from the
 * credential so self-hosted or staging deployments can be targeted.
 */
export async function ampliApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('ampliApi');
	const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		headers: { Accept: 'application/json' },
	};
	if (body && Object.keys(body).length > 0) options.body = body;
	if (qs && Object.keys(qs).length > 0) options.qs = qs;

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'ampliApi',
			options,
		)) as IDataObject;
	} catch (error) {
		const message = ampliErrorMessage(error);
		throw new NodeApiError(this.getNode(), error as JsonObject, message ? { message } : undefined);
	}
}
