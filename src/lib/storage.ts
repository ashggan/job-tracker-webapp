import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.BLOB_STORAGE_BUCKET ?? "waypoint-documents";

const s3 = new S3Client({
  endpoint: process.env.BLOB_STORAGE_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BLOB_STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.BLOB_STORAGE_SECRET_KEY ?? "",
  },
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function uploadResumeFile(userId: string, file: File): Promise<string> {
  const key = `resumes/${userId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );
  return key;
}

export async function deleteResumeFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getResumeDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 300,
  });
}

export function resumeFilenameFromKey(key: string): string {
  const base = key.split("/").pop() ?? key;
  return base.replace(/^\d+-/, "");
}
