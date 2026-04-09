
export async function uploadToCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string,
): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Isi Cloud Name dan Upload Preset di Pengaturan.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "brics-workshop/materials");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Upload gagal");
  }

  const data = await res.json();
  return data.secure_url as string;
}
