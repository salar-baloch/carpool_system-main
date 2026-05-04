import { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "../components/ui/Button";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const documentFields = [
  { key: "DRIVER_LICENSE_FRONT", label: "Driver License (Front)" },
  { key: "DRIVER_LICENSE_BACK", label: "Driver License (Back)" },
  { key: "CNIC_FRONT", label: "CNIC / ID Card (Front)" },
  { key: "CNIC_BACK", label: "CNIC / ID Card (Back)" },
  { key: "VEHICLE_REGISTRATION", label: "Vehicle Registration" },
  { key: "PROFILE_PICTURE", label: "Profile Picture" },
  { key: "PROOF_OF_ADDRESS", label: "Proof of Address" },
];

const validateFile = (file) => {
  if (!file) return "File is required";
  if (file.size > MAX_UPLOAD_BYTES) return `Max ${MAX_UPLOAD_MB}MB`;
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) return "Only JPG/PNG/PDF allowed";
  return "";
};

const getToken = () => localStorage.getItem("token");

export default function DocumentsPage() {
  const [remoteDocs, setRemoteDocs] = useState({});
  const [files, setFiles] = useState(() => {
    const initial = {};
    for (const f of documentFields) initial[f.key] = null;
    return initial;
  });
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const hasToken = useMemo(() => !!getToken(), []);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const resp = await fetch(`${API_BASE}/users/me/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Failed to load documents");

      const map = {};
      for (const d of data.documents || []) map[d.type] = d;
      setRemoteDocs(map);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (type, file) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
    setErrors((prev) => ({ ...prev, [type]: validateFile(file) }));
  };

  const uploadOne = async (type) => {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");

    const file = files[type];
    const err = validateFile(file);
    if (err) {
      setErrors((prev) => ({ ...prev, [type]: err }));
      throw new Error(err);
    }

    const form = new FormData();
    form.append("type", type);
    form.append("file", file);

    setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/users/me/documents`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress((prev) => ({ ...prev, [type]: percent }));
      };
      xhr.onload = () => {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          if (xhr.status >= 200 && xhr.status < 300) resolve(json);
          else reject(new Error(json?.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(form);
    });

    setUploadProgress((prev) => ({ ...prev, [type]: 100 }));
    toast.success("Uploaded");
    await loadDocs();
  };

  const uploadAll = async () => {
    try {
      for (const f of documentFields) {
        if (!files[f.key]) continue; // only upload chosen ones
        await uploadOne(f.key);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Upload failed");
    }
  };

  if (!hasToken) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <ToastContainer />
        <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
        <p className="mt-2 text-slate-600">Please log in to manage your documents.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ToastContainer />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
          <p className="mt-2 text-slate-600">
            Upload or replace your verification documents. Max {MAX_UPLOAD_MB}MB each. Allowed: JPG, PNG, PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadDocs} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={uploadAll} disabled={loading}>
            Upload selected
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {documentFields.map((f) => {
          const remote = remoteDocs[f.key];
          const progress = uploadProgress[f.key];
          return (
            <div key={f.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{f.label}</h2>
                  {remote ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Uploaded: {new Date(remote.createdAt).toLocaleString()} • {Math.ceil(remote.size / 1024)} KB
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-rose-600">Not uploaded yet</p>
                  )}
                </div>
                {remote?.storagePath && (
                  <a
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
                    href={`${API_BASE}${remote.storagePath}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                )}
              </div>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-800"
                onChange={(e) => handleFileChange(f.key, e.target.files?.[0] || null)}
              />

              {files[f.key] && (
                <p className="mt-2 text-xs text-slate-500">Selected: {files[f.key].name}</p>
              )}
              {errors[f.key] && <p className="mt-2 text-sm text-rose-600">{errors[f.key]}</p>}

              {typeof progress === "number" && (
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Upload: {progress}%</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => uploadOne(f.key)}
                  disabled={loading || !files[f.key]}
                >
                  Upload / Replace
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Note: This stores files on the server filesystem (backend/uploads). For production, you’d typically store in S3/Cloudinary and keep only URLs in DB.
      </p>
    </div>
  );
}
