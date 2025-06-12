import { connectStorageEmulator, getDownloadURL, getStorage, list, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { app } from "./firebaseApp";
import { isLocalhost } from "@/utils/isLocalHost";

export const storage = getStorage(app);

// Only connect to emulator if STORAGE_URL is defined and using localhost
const storageUrlString = import.meta.env.VITE_STORAGE_URL
if (storageUrlString && isLocalhost(storageUrlString)) {
  const localStorageUrl = new URL(storageUrlString)
  connectStorageEmulator(storage, localStorageUrl.hostname, parseInt(localStorageUrl.port))
}

export async function uploadEventPhotoBlob(eventId: string, blob: Blob, filename: string): Promise<string> {
  const blobType = blob.type;

  if (!blobType.startsWith('image/')) {
    throw new Error(`Provided blob type (${blob.type}) is not an image`);
  }

  const file = new File([blob], filename, { type: blob.type });
  return uploadEventPhoto(eventId, file);
}

export async function uploadEventPhoto(eventId: string, file: File): Promise<string> {
  const path = `events/${eventId}/photos/${file.name}`;
  const storageRef = ref(storage, path);

  // Available metadata properties:
  // https://firebase.google.com/docs/storage/web/file-metadata?authuser=0#file_metadata_properties
  const metadata = {
    // contentType: file.type,
    customMetadata: {
      'eventId': eventId
    }
  };
  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

export async function uploadEventPhotosWithProcess(eventId: string, file: File, onProgressChanged: (progressValue: number)=>void): Promise<void> {
  // Create the file metadata
  // https://firebase.google.com/docs/storage/web/file-metadata?authuser=0#file_metadata_properties
  const metadata = {
    contentType: file.type,
    customMetadata: {
      'eventId': eventId,
      'fileModified': file.lastModified.toString(),
    }
  };

  const path = `events/${eventId}/photos/${file.name}`;
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  // Listen for state changes, errors, and completion of the upload.
  uploadTask.on('state_changed',
    (snapshot) => {
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case 'paused':
          console.log('Upload is paused');
          break;
        case 'running':
          console.log('Upload is running');
          break;
      }
    },
    (error) => {
      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/unauthorized':
          // User doesn't have permission to access the object
          break;
        case 'storage/canceled':
          // User canceled the upload
          break;

        // ...

        case 'storage/unknown':
          // Unknown error occurred, inspect error.serverResponse
          break;
      }
    },
    () => {
      // Upload completed successfully, now we can get the download URL
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        console.log('File available at', downloadURL);
      });
      onProgressChanged(100); // Call the progress callback with 100% when done
    }
  );
}

export async function getEventPhotos(eventId: string): Promise<string[]> {
  const path = `events/${eventId}/photos`;
  const storageRef = ref(storage, path);

  try {
    const listResult = await list(storageRef, {
      maxResults: 10, // Adjust as needed
      // You can also specify a prefix if you want to filter files
      // prefix: 'some/prefix/',
      // Use `listAll` if you want to list all items in the directory
      // listAll: true,
    });
    const photoUrls: string[] = [];
    for (const itemRef of listResult.items) {
      const url = await getDownloadURL(itemRef);
      photoUrls.push(url);
    }
    return photoUrls;
  } catch (error) {
    console.error("Error fetching event photos:", error);
    throw error;
  }
}