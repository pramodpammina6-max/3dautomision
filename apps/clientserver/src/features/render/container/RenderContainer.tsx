'use client';
import { useState } from 'react';
import { Camera, Download, Film, Loader2 } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { Field, PanelSection } from '@/common/components/ui/panel';
import { useProjectStore } from '@/common/store/projectStore';
import { ModelViewer, downloadBlob, slug, type Engine } from '@/features/model-generation';
import { captureImage, IMAGE_SIZES, type ImageSize } from '../service/captureImage';
import { recordVideo, VIDEO_SIZES, type VideoPath, type VideoSize } from '../service/recordVideo';
import { renderStyles as s } from '../styles/render.styles';

interface Still {
  url: string;
  size: ImageSize;
  at: number;
}

export function RenderContainer() {
  const name = useProjectStore((st) => st.name);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('4K');
  const [stills, setStills] = useState<Still[]>([]);
  const [rendering, setRendering] = useState(false);

  const [videoPath, setVideoPath] = useState<VideoPath>('orbit');
  const [videoSize, setVideoSize] = useState<VideoSize>('1080p');
  const [seconds, setSeconds] = useState(10);
  const [progress, setProgress] = useState<number | null>(null);
  const [video, setVideo] = useState<{ url: string; blob: Blob; ext: string } | null>(null);

  async function renderStill() {
    if (!engine) return;
    setRendering(true);
    // let the spinner paint before the heavy synchronous render
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
    const url = captureImage(engine, imageSize);
    setStills((xs) => [{ url, size: imageSize, at: Date.now() }, ...xs]);
    setRendering(false);
  }

  async function record() {
    if (!engine) return;
    if (video) URL.revokeObjectURL(video.url);
    setVideo(null);
    setProgress(0);
    const { blob, ext } = await recordVideo(engine, { path: videoPath, seconds, size: videoSize, onProgress: setProgress });
    setVideo({ url: URL.createObjectURL(blob), blob, ext });
    setProgress(null);
  }

  const busy = rendering || progress !== null;

  return (
    <div className={s.layout}>
      <ModelViewer onEngine={setEngine} toolbar={!busy} hint="Frame your shot with the mouse, then render" />
      <aside className={s.side}>
        <PanelSection title="Render image">
          <Field label="Resolution">
            <select className={s.select} value={imageSize} onChange={(e) => setImageSize(e.target.value as ImageSize)}>
              {Object.entries(IMAGE_SIZES).map(([k, v]) => (
                <option key={k} value={k}>
                  {k} ({v.width}×{v.height})
                </option>
              ))}
            </select>
          </Field>
          <Button className="w-full" onClick={renderStill} disabled={!engine || busy}>
            {rendering ? <Loader2 className="animate-spin" /> : <Camera />} Render still
          </Button>
          {stills.length > 0 && (
            <div className={s.gallery}>
              {stills.map((st) => (
                <a key={st.at} className={s.thumb} href={st.url} download={`${slug(name)}-${st.size}-${st.at}.png`} title="Download PNG">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={st.url} alt={`Render ${st.size}`} className="aspect-video w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-[10px] text-white">{st.size}</span>
                  <Download className="absolute inset-0 m-auto size-6 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                </a>
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection title="Render video">
          <Field label="Camera path">
            <select className={s.select} value={videoPath} onChange={(e) => setVideoPath(e.target.value as VideoPath)}>
              <option value="orbit">Exterior orbit</option>
              <option value="tour">Room-by-room tour</option>
            </select>
          </Field>
          <Field label="Resolution">
            <select className={s.select} value={videoSize} onChange={(e) => setVideoSize(e.target.value as VideoSize)}>
              {Object.keys(VIDEO_SIZES).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Duration">
            <select className={s.select} value={seconds} onChange={(e) => setSeconds(+e.target.value)}>
              {[6, 10, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} s
                </option>
              ))}
            </select>
          </Field>
          <Button className="w-full" variant="secondary" onClick={record} disabled={!engine || busy}>
            {progress !== null ? <Loader2 className="animate-spin" /> : <Film />}
            {progress !== null ? `Recording ${Math.round(progress * 100)}%` : 'Record video'}
          </Button>
          {progress !== null && (
            <div className={s.progress}>
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          {video && (
            <div className="space-y-2">
              <video src={video.url} controls className="w-full rounded-lg" />
              <Button size="sm" variant="outline" className="w-full" onClick={() => downloadBlob(video.blob, `${slug(name)}-walkthrough.${video.ext}`)}>
                <Download /> Download .{video.ext}
              </Button>
            </div>
          )}
          <p className="text-xs text-slate-500">Keep this tab visible while recording — browsers throttle hidden tabs.</p>
        </PanelSection>
      </aside>
    </div>
  );
}
