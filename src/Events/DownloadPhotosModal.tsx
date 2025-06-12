import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getEventPhotos } from "@/lib/firebaseStorage";
import { getDownloadAllUrl } from "@/lib/inCahootsApi";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

function ImageDownload({ eventId }: { eventId: string }) {
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [downloadAllUrl, setDownloadAllUrl] = useState<string | null>(null);

  useEffect(() => {
    getEventPhotos(eventId)
    .then(setEventPhotos)

    getDownloadAllUrl(eventId)
    .then(setDownloadAllUrl)
  }, [eventId]);

  return (
    <>
      {eventPhotos.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          {eventPhotos.map((photoUrl, index) => (
            <img
              key={index}
              src={photoUrl}
              alt={`Event photo ${index + 1}`}
              className="w-full h-auto rounded-md object-cover"
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          No photos uploaded yet.
        </p>
      )}
      <a href={downloadAllUrl ?? "#"}
        download
        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        // target="_blank" rel="noopener noreferrer"
        // onClick={onDownloadAllPhotos}
      >
          { downloadAllUrl ? (
            <span>Download All Photos</span>
          ) : (
            <Loader2Icon className="animate-spin" />
          )}
      </a>
      <p className="mt-2 text-sm text-gray-600">
        Click the button above to download all photos from this event.
      </p>
    </>
  )
}

export function DownloadPhotosModal({ eventId }: { eventId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow" variant="outline">
          Download Photos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-left">
            Download Photos
          </DialogTitle>
          <DialogDescription className="text-left">
            Select photos to download
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ImageDownload eventId={eventId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}