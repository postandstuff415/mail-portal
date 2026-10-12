import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mail scans live in the private Neon Object Storage bucket "mail".
// Images are only ever shown through 5-minute signed links, after a permission check.

export const SIGNED_URL_SECONDS = 5 * 60;

// Some hosts reserve the AWS_* names, so NEON_S3_* can be used instead.
function config() {
  const env = process.env;
  const endpoint = env.NEON_S3_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3;
  const region = env.NEON_S3_REGION ?? env.AWS_REGION;
  const accessKeyId = env.NEON_S3_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.NEON_S3_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("File storage is not configured. Run `neon env pull` or set the NEON_S3_* variables.");
  }
  return { endpoint, region, accessKeyId, secretAccessKey, bucket: env.MAIL_BUCKET ?? "mail" };
}

let client: S3Client | undefined;
function s3() {
  const c = config();
  client ??= new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    forcePathStyle: true, // required by Neon
  });
  return { client, bucket: c.bucket };
}

export async function putMailImage(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = s3();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteMailImage(key: string) {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// General private files (database backups live under "backups/").
export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = s3();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const { client, bucket } = s3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return res.Body!.transformToByteArray();
}

export async function listKeys(prefix: string): Promise<string[]> {
  const { client, bucket } = s3();
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export async function deleteObject(key: string) {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function signedImageUrl(key: string): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: SIGNED_URL_SECONDS });
}
