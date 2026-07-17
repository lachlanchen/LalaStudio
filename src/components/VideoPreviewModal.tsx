import { Film, X } from "lucide-react";
import { useEffect } from "react";
import type { VideoItem } from "../types";

interface Props {
  video: VideoItem | null;
  onClose: () => void;
}

export function VideoPreviewModal({ video, onClose }: Props) {
  useEffect(() => {
    if (!video) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div className="modal-backdrop video-preview-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="video-preview-dialog"
        data-testid="video-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="video-preview-heading">
          <div className="video-preview-title">
            <span className="video-preview-icon"><Film size={17} /></span>
            <div>
              <span className="eyebrow">Generated result</span>
              <h2 id="video-preview-title">Video preview</h2>
            </div>
          </div>
          <button className="icon-button" data-testid="video-preview-close" onClick={onClose} title="Close preview" aria-label="Close video preview">
            <X size={18} />
          </button>
        </div>
        <div className="video-preview-stage">
          <video key={video.id} data-testid="video-preview-player" src={video.mediaUrl} controls autoPlay playsInline preload="metadata" />
        </div>
        <div className="video-preview-meta">
          <strong>{video.name}</strong>
          <span>{(video.size / 1024 / 1024).toFixed(1)} MB · {new Date(video.updatedAt).toLocaleString()}</span>
        </div>
      </section>
    </div>
  );
}
