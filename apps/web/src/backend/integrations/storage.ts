/**
 * Where an uploaded photograph actually lives.
 *
 * One interface, three drivers, selected by configuration — the same shape as
 * every other integration here.
 *
 * The important difference from the marketing gallery (`lib/gms/gallery.ts`) is
 * `access: "private"`. That gallery is public because it is advertising. These
 * are photographs of other people's children, and a public blob URL is a
 * permanent, unauthenticated, un-revocable link to one: forwarded once into a
 * family group chat, it is out of the school's hands for good. Private blobs
 * can only be read with the store's own credentials, which live on the server,
 * so every read goes through `/api/media/[id]` and past a scope check.
 */
import { del, get, put } from "@vercel/blob";
import { AppError } from "@/backend/utils/error-handler.util";
import { env } from "@/config/env";

export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

export interface BlobStore {
  readonly name: string;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

class VercelBlobStore implements BlobStore {
  readonly name = "vercel-blob";

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await put(key, Buffer.from(body), {
      access: "private",
      contentType,
      // The key is already unguessable and unique; a random suffix would only
      // make it impossible to find the object again from the row.
      addRandomSuffix: false,
    });
  }

  async get(key: string): Promise<StoredObject | null> {
    const result = await get(key, { access: "private" });
    if (!result?.stream) return null;
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - the SDK returns a web ReadableStream, which is async
    // iterable at runtime in Node 18+ even where the DOM types say otherwise.
    for await (const chunk of result.stream) chunks.push(chunk as Uint8Array);
    return {
      body: Buffer.concat(chunks),
      contentType: result.blob?.contentType ?? "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }
}

/**
 * Development and tests. In-process, so it does not survive a restart — which
 * is the right trade for a laptop and the wrong one for anything else, hence
 * the refusal in production below.
 */
class MemoryBlobStore implements BlobStore {
  readonly name = "memory";
  private objects = new Map<string, StoredObject>();

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async get(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

/** Production with no blob store configured. */
class DisabledBlobStore implements BlobStore {
  readonly name = "disabled";

  async put(): Promise<void> {
    throw new AppError(
      "Photo storage is not set up on this deployment",
      503,
      "storage_disabled",
    );
  }

  async get(): Promise<StoredObject | null> {
    return null;
  }

  async delete(): Promise<void> {}
}

function build(): BlobStore {
  if (env.BLOB_READ_WRITE_TOKEN) return new VercelBlobStore();

  if (env.isProd) {
    console.warn(
      "⚠️  No blob store configured — photo upload is switched off. " +
        "Set BLOB_READ_WRITE_TOKEN to enable it.",
    );
    return new DisabledBlobStore();
  }
  return new MemoryBlobStore();
}

let active: BlobStore = build();

export const blobStore: BlobStore = {
  get name() {
    return active.name;
  },
  put: (key, body, contentType) => active.put(key, body, contentType),
  get: (key) => active.get(key),
  delete: (key) => active.delete(key),
};

/** Tests only. Returns the store that was in place, to put back afterwards. */
export function setBlobStore(next: BlobStore): BlobStore {
  const previous = active;
  active = next;
  return previous;
}
