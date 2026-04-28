import { cloudflareAvatarOrLogoDeliveryUrl } from "@/lib/helpers/cloudflare-images"
import Image from "next/image"

export const SellerAvatar = ({
  photo = "",
  size = 32,
  alt = "",
}: {
  photo?: string
  size?: number
  alt?: string
}) => {
  const delivery = photo
    ? cloudflareAvatarOrLogoDeliveryUrl(photo.trim(), size) ?? photo.trim()
    : ""
  return photo ? (
    <Image
      src={delivery}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      unoptimized
      className="shrink-0 object-cover rounded-sm"
      style={{ maxWidth: size, maxHeight: size }}
    />
  ) : (
    <Image
      src="/images/placeholder.svg"
      alt={alt}
      className="opacity-30 w-8 h-8 shrink-0"
      width={32}
      height={32}
      style={{ maxWidth: 32, maxHeight: 32 }}
    />
  )
}
