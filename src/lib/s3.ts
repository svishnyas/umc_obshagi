import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function getS3Client(): S3Client {
  return new S3Client({
    region: requireEnv("S3_REGION"),
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

export function isS3Configured(): boolean {
  try {
    requireEnv("S3_REGION");
    requireEnv("S3_BUCKET");
    requireEnv("S3_ACCESS_KEY");
    requireEnv("S3_SECRET_KEY");
    requireEnv("S3_PUBLIC_BASE_URL");
    return true;
  } catch {
    return false;
  }
}

export async function uploadPublicObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const client = getS3Client();
  const bucket = requireEnv("S3_BUCKET");
  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  };
  await client.send(new PutObjectCommand(input));
  const base = requireEnv("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}
