import { usePhotoUrl } from '../lib/usePhotoUrl';

export default function StoredImage({ photoRef, fallback = '', ...props }) {
  const src = usePhotoUrl(photoRef, fallback);
  if (!src) return null;
  return <img src={src} {...props} />;
}
