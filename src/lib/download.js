import api from "../api/client";

export async function downloadFile(url, params, fallbackName) {
  const res = await api.get(url, { params, responseType: "blob" });
  const cd = res.headers["content-disposition"] || "";
  const m = cd.match(/filename="?([^"]+)"?/);
  const name = m ? m[1] : fallbackName;

  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
