# Frontend Reference: File Uploads & Media Optimization (Pre-signed)

To support scalable and fast uploads from the Wiki section and user media modules, the system now features a **Pre-signed Upload Generator** endpoint. This allows the frontend to securely upload heavy files directly to the storage provider (Cloudinary or Cloudflare R2), saving backend bandwidth!

## 1. Requesting an Upload URL

**Endpoint:** `POST /upload/presign`
**Content-Type:** `application/json`

Instead of sending the file to the backend, you send the file's metadata to get a secure upload signature back.

### Endpoint Request Parameters (JSON Payload):

| Field              | Type   | Description                                                                                                             |
| :----------------- | :----- | :---------------------------------------------------------------------------------------------------------------------- |
| `filename`         | String | **Required.** The name of the file (e.g., `my-doc.pdf`). Used to extract the extension.                                 |
| `mimetype`         | String | **Required.** The file's MIME type (e.g., `image/png`, `video/mp4`, `application/pdf`). Determines where the file goes. |
| `context`          | String | (Optional) Determines the folder domain. e.g., `'wiki'`, `'profile'`, `'project'`. Default is `'general'`.              |
| `compress`         | String | (Optional) Set to `'true'` to force compress the image via Cloudinary. Default is `'false'`.                            |
| `isAccountRelated` | String | (Optional) Forces compression if set to `'true'`.                                                                       |

_(Note: Provide the standard `Authorization: Bearer <token>` in the Headers)_

### Storage Infrastructure Logic:

The backend intelligently decides the `provider` based on your metadata:

- **Videos** → Cloudinary
- **Compressed/Optimized Images** → Cloudinary
- **Account-Related Media / Avatars** → Cloudinary (Automatic compression, forced by `context: 'profile'`)
- **Documents / User Uploads / PDFs / Raw Files** → Cloudflare R2

---

## 2. Example: Uploading directly from the Frontend

The response you get from `/upload/presign` differs slightly based on whether the backend chose `cloudinary` or `r2`. Here is a complete frontend implementation to handle both.

```javascript
async function uploadFileDirectly(fileObject, context = 'general', compress = false) {
  const userToken = localStorage.getItem('token'); // or however you store it

  // 1. Get the pre-signed signature from our backend
  const presignRes = await fetch('http://localhost:4000/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      filename: fileObject.name,
      mimetype: fileObject.type,
      context,
      compress: compress ? 'true' : 'false',
    }),
  });

  const config = await presignRes.json();
  if (!config.success) throw new Error(config.error);

  const { provider, data } = config;

  // 2. Upload directly to the specific provider

  if (provider === 'cloudinary') {
    // Cloudinary expects multipart/form-data
    const formData = new FormData();
    formData.append('file', fileObject);

    // Append the signature fields returned by the backend
    Object.keys(data.fields).forEach((key) => {
      formData.append(key, data.fields[key]);
    });

    const uploadRes = await fetch(data.uploadUrl, {
      method: 'POST',
      body: formData,
    });
    const result = await uploadRes.json();

    return result.secure_url; // THE FINAL URL
  } else if (provider === 'r2') {
    // R2 / S3 expects a direct PUT request with the raw file payload
    const uploadRes = await fetch(data.uploadUrl, {
      method: data.method, // 'PUT'
      headers: data.headers, // Includes 'Content-Type'
      body: fileObject,
    });

    if (!uploadRes.ok) throw new Error('R2 upload failed');

    return data.finalUrl; // THE FINAL URL
  }
}
```

---

## 3. Profiling / Account Photo Uploads

To upload a user's profile picture and permanently update their profile:

1. **Upload using the function above:**
   Pass `context: 'profile'` explicitly. This triggers **automatic guaranteed compression** (via Cloudinary optimized rendering parameters).

```javascript
const finalAvatarUrl = await uploadFileDirectly(profilePhotoBlob, 'profile');
```

2. **Save the Avatar to User Record:**
   Use the standard Gateway `updateUser` mutation, passing the `url` as their new avatar value!

```graphql
mutation UpdateUserProfile($id: ID!, $avatarUrl: String!) {
  updateUser(id: $id, input: { avatarUrl: $avatarUrl }) {
    id
    email
    avatarUrl
  }
}
```
